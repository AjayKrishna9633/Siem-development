import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import type { Express } from 'express';
import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppDataSource } from '../../src/infrastructure/database/data-source.ts';
import { syncEnrollRolePassword } from '../../src/infrastructure/database/enroll-role.ts';
import { AesGcmSecretCipher } from '../../src/infrastructure/services/aes-gcm-secret-cipher.service.ts';
import { PinoLogger, createRootLogger } from '../../src/infrastructure/logging/pino-logger.ts';
import { agentKeyAad } from '../../src/domain/policies/enrollment-link.policy.ts';
import { createEnrollDataSource } from '../../src/enroll/data-source.ts';
import { createEnrollApp } from '../../src/enroll/app.ts';
import { closeDatabase, recreateDatabase } from '../helpers/database.ts';

const PASSWORD = 'test-enroll-password-0123456789';
const PUBLIC_URL = 'https://192.168.1.20:8443';
const ASSETS = join(import.meta.dirname, '../../enroll-assets');
const cipher = new AesGcmSecretCipher(Buffer.alloc(32, 7).toString('base64'), 'ENROLL_KEY_SECRET');
const silent = new PinoLogger(
  createRootLogger({ service: 'test', level: 'silent', pretty: false }),
);

const enrollUrl = (): string => {
  const url = new URL(process.env.TEST_DATABASE_URL ?? '');
  url.username = 'siemple_enroll';
  url.password = PASSWORD;
  return url.toString();
};

// As the owner, the way the API would: a pending agent with an encrypted key, and its link.
const seedLink = async (
  options: {
    name?: string;
    os?: string;
    arch?: string;
    expiresInSeconds?: number;
    status?: string;
  } = {},
) => {
  const name = options.name ?? `agent-${randomBytes(3).toString('hex')}`;
  const agentKey = Buffer.from(`001 ${name} any ${randomBytes(32).toString('hex')}`).toString(
    'base64',
  );
  const [agent] = await AppDataSource.query<{ id: string }[]>(
    `INSERT INTO pending_agents (name, group_name, os, arch, wazuh_agent_id, agent_version,
       agent_key_ciphertext, agent_key_iv, agent_key_auth_tag, key_version, status)
     VALUES ($1, 'default', $2, $3, $4, '4.14.10', 'x', 'x', 'x', 1, $5) RETURNING id`,
    [
      name,
      options.os ?? 'linux-deb',
      options.arch ?? 'x86_64',
      String(100 + Math.floor(Math.random() * 899_900)),
      options.status ?? 'pending',
    ],
  );
  const id = agent?.id ?? '';
  const secret = cipher.encrypt(agentKey, agentKeyAad(id));
  await AppDataSource.query(
    `UPDATE pending_agents SET agent_key_ciphertext = $2, agent_key_iv = $3, agent_key_auth_tag = $4
       WHERE id = $1`,
    [id, secret.ciphertext, secret.iv, secret.authTag],
  );
  const token = randomBytes(32).toString('hex');
  await AppDataSource.query(
    `INSERT INTO enrollment_tokens (pending_agent_id, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(secs => $3))`,
    [id, createHash('sha256').update(token).digest('hex'), options.expiresInSeconds ?? 3600],
  );
  return { token, pendingAgentId: id };
};

const usedAt = async (pendingAgentId: string) => {
  const [row] = await AppDataSource.query<{ used_at: Date | null }[]>(
    'SELECT used_at FROM enrollment_tokens WHERE pending_agent_id = $1',
    [pendingAgentId],
  );
  return row?.used_at ?? null;
};

const fingerprint = (res: request.Response) => {
  const headers = { ...res.headers };
  delete headers.date;
  return { status: res.status, body: res.text, headers };
};

// The HTML escapes & and quotes; the checks read it as a browser would show it.
const decode = (html: string) =>
  html.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');

describe('the enrollment page', () => {
  let db: DataSource;
  let app: Express;

  beforeAll(async () => {
    await recreateDatabase();
    await syncEnrollRolePassword(AppDataSource, PASSWORD, silent);
    db = createEnrollDataSource(enrollUrl());
    await db.initialize();
    app = createEnrollApp({
      db,
      logger: silent,
      cipher,
      managerAddress: '192.168.1.20',
      publicUrl: PUBLIC_URL,
    });
  });

  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
    await closeDatabase();
  });

  it('offers every OS, both processors, exact run steps and one-liners when fresh', async () => {
    const link = await seedLink({ name: 'web-09', os: 'linux-rpm', arch: 'arm64' });
    const res = await request(app).get(`/e/${link.token}`).expect(200);
    const html = decode(res.text);

    expect(res.headers['content-type']).toMatch(/^text\/html/);
    expect(html).toContain('<h1>Install the SIEMple agent</h1>');
    expect(html).toContain('<strong>web-09</strong>');
    expect(html).toContain('data-state="fresh"');
    expect(html).toContain('data-default-os="linux-rpm"');
    expect(html).toContain('data-default-arch="arm64"');
    expect(html).toContain(`data-status-url="/e/${link.token}/status"`);
    expect(html).toContain('Waiting for the script to run.');
    expect(html).toContain("Open this link on the computer you're installing the agent on.");
    // Near the top: before the status and the downloads.
    expect(html.indexOf('Open this link on the computer')).toBeLessThan(
      html.indexOf('id="status"'),
    );
    expect(html).toMatch(/<p id="lost-file" class="hint" hidden>/);
    for (const query of [
      'os=windows',
      'os=linux-deb&arch=x86_64',
      'os=linux-deb&arch=arm64',
      'os=linux-rpm&arch=x86_64',
      'os=linux-rpm&arch=arm64',
    ]) {
      expect(html).toContain(`href="/e/${link.token}/script?${query}"`);
    }
    expect(html).toContain('Open PowerShell as Administrator.');
    expect(html).toContain('powershell -ExecutionPolicy Bypass -File .\\siemple-agent.ps1');
    expect(html).toContain('sudo bash siemple-agent.sh');
    expect(html).toContain(
      `curl -fsSL -o siemple-agent.sh '${PUBLIC_URL}/e/${link.token}/script?os=linux-rpm&arch=arm64' && sudo bash siemple-agent.sh`,
    );
    expect(html).toContain(
      `Invoke-WebRequest -Uri '${PUBLIC_URL}/e/${link.token}/script?os=windows' -OutFile siemple-agent.ps1 -UseBasicParsing; powershell -ExecutionPolicy Bypass -File .\\siemple-agent.ps1`,
    );
    expect(html).not.toContain('Script downloaded');
    // Showing the page never uses up the link.
    expect(await usedAt(link.pendingAgentId)).toBeNull();
  });

  it('keeps the downloads but leaves out the one-liners without a public address', async () => {
    const link = await seedLink();
    const bare = createEnrollApp({
      db,
      logger: silent,
      cipher,
      managerAddress: '192.168.1.20',
      publicUrl: undefined,
    });
    const html = decode((await request(bare).get(`/e/${link.token}`).expect(200)).text);
    expect(html).toContain(`href="/e/${link.token}/script?os=windows"`);
    expect(html).not.toContain('curl -fsSL');
    expect(html).not.toContain('Invoke-WebRequest');
  });

  it('replaces the download with a waiting message once the script is taken', async () => {
    const link = await seedLink();
    await request(app).get(`/e/${link.token}/script?os=linux-deb`).expect(200);
    const html = (await request(app).get(`/e/${link.token}`).expect(200)).text;
    expect(html).toContain('data-state="used"');
    expect(html).toContain('Script downloaded, waiting for the agent to connect.');
    expect(html).toContain(
      '<p id="lost-file" class="hint">Lost the file? Ask your admin for a new link.</p>',
    );
    expect(html).not.toContain('/script?os=');
    expect(html).not.toContain('curl -fsSL');
  });

  it('shows Connected, with nothing to download, once the agent connects', async () => {
    const link = await seedLink({ status: 'connected' });
    const html = (await request(app).get(`/e/${link.token}`).expect(200)).text;
    expect(html).toContain('data-state="connected"');
    expect(html).toContain('Connected. The agent is reporting to SIEMple.');
    expect(html).not.toContain('Open this link on the computer');
    expect(html).toMatch(/<p id="lost-file" class="hint" hidden>/);
    expect(html).not.toContain('/script?os=');
  });

  it('answers an expired link with the byte-identical generic 404', async () => {
    const expired = await seedLink({ expiresInSeconds: -1 });
    const page = fingerprint(await request(app).get(`/e/${expired.token}`));
    const unknown = fingerprint(await request(app).get(`/e/${randomBytes(32).toString('hex')}`));
    const route = fingerprint(await request(app).get('/nothing/here'));
    expect(page.status).toBe(404);
    expect(page).toEqual(unknown);
    expect(page).toEqual(route);
  });

  it.each([
    ['the page', async () => `/e/${(await seedLink()).token}`],
    ['the stylesheet', async () => '/e/assets/enroll.css'],
    ['the script', async () => '/e/assets/enroll.js'],
    ['the 404', async () => `/e/${randomBytes(32).toString('hex')}`],
  ])('sends the security headers on %s', async (_label, path) => {
    const res = await request(app).get(await path());
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('serves the stylesheet and script exactly as they are on disk', async () => {
    const css = await request(app).get('/e/assets/enroll.css').expect(200);
    const js = await request(app).get('/e/assets/enroll.js').expect(200);
    expect(css.headers['content-type']).toMatch(/^text\/css/);
    expect(js.headers['content-type']).toMatch(/^text\/javascript/);
    expect(css.text).toBe(readFileSync(join(ASSETS, 'enroll.css'), 'utf8'));
    expect(js.text).toBe(readFileSync(join(ASSETS, 'enroll.js'), 'utf8'));
  });

  it('loads nothing from anywhere else, and has no inline script, style or handler', async () => {
    const html = (
      await request(app)
        .get(`/e/${(await seedLink()).token}`)
        .expect(200)
    ).text;
    const css = readFileSync(join(ASSETS, 'enroll.css'), 'utf8');
    const js = readFileSync(join(ASSETS, 'enroll.js'), 'utf8');

    // The only absolute URLs on the page are this service's own, inside the copyable commands.
    for (const url of html.match(/https?:\/\/[^\s'"<&]+/g) ?? []) {
      expect(url.startsWith(PUBLIC_URL)).toBe(true);
    }
    // Every link and resource is a path on this service.
    const references = html.match(/\s(?:src|href)="[^"]*"/g) ?? [];
    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) expect(reference).toMatch(/="\/e\//);
    expect(html).not.toMatch(/<style|\sstyle=/i);
    expect(html).not.toMatch(/<script(?![^>]*\ssrc="\/e\/assets\/enroll\.js")/i);
    expect(html).not.toMatch(/\son[a-z]+=/i);

    expect(css).not.toMatch(/https?:|url\(|@import|@font-face/i);
    expect(js).not.toMatch(/https?:\/\/|\bimport\s|import\(|eval\(|new Function/);
  });
});
