import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import type { Express } from 'express';
import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type {
  ILogger,
  LogFields,
} from '../../src/application/interfaces/services/logger.interface.ts';
import { AppDataSource } from '../../src/infrastructure/database/data-source.ts';
import { syncEnrollRolePassword } from '../../src/infrastructure/database/enroll-role.ts';
import { AesGcmSecretCipher } from '../../src/infrastructure/services/aes-gcm-secret-cipher.service.ts';
import { agentKeyAad } from '../../src/domain/policies/enrollment-link.policy.ts';
import { createEnrollDataSource } from '../../src/enroll/data-source.ts';
import { createEnrollApp } from '../../src/enroll/app.ts';
import { closeDatabase, recreateDatabase } from '../helpers/database.ts';

const PASSWORD = 'test-enroll-password-0123456789';
const cipher = new AesGcmSecretCipher(Buffer.alloc(32, 7).toString('base64'), 'ENROLL_KEY_SECRET');

// Remembers everything logged, to prove no key or token ever reaches the log.
class RecordingLogger implements ILogger {
  lines: string[] = [];
  private record(message: string, fields?: LogFields) {
    this.lines.push(JSON.stringify({ message, fields }));
  }
  debug(m: string, f?: LogFields) {
    this.record(m, f);
  }
  info(m: string, f?: LogFields) {
    this.record(m, f);
  }
  warn(m: string, f?: LogFields) {
    this.record(m, f);
  }
  error(m: string, f?: LogFields) {
    this.record(m, f);
  }
  child(): ILogger {
    return this;
  }
}

const enrollUrl = (): string => {
  const url = new URL(process.env.TEST_DATABASE_URL ?? '');
  url.username = 'siemple_enroll';
  url.password = PASSWORD;
  return url.toString();
};

interface ISeed {
  token: string;
  agentKey: string;
  // The decoded key: the client.keys line the script writes.
  clientKey: string;
  pendingAgentId: string;
}

// Seeds as the owner, the way the API would: a pending agent with an encrypted key and a link.
const seedLink = async (
  options: {
    name?: string;
    os?: string;
    arch?: string | null;
    expiresInSeconds?: number;
    status?: string;
    // Encrypt under another row's id, to prove the AAD binds the key to its row.
    aadId?: string;
  } = {},
): Promise<ISeed> => {
  const name = options.name ?? `agent-${randomBytes(3).toString('hex')}`;
  const clientKey = `00${Math.floor(Math.random() * 9)} ${name} any ${randomBytes(32).toString('hex')}`;
  const agentKey = Buffer.from(clientKey).toString('base64');
  const [agent] = await AppDataSource.query<{ id: string }[]>(
    `INSERT INTO pending_agents (name, group_name, os, arch, wazuh_agent_id, agent_version,
       agent_key_ciphertext, agent_key_iv, agent_key_auth_tag, key_version, status)
     VALUES ($1, 'default', $2, $3, $4, '4.14.10', 'x', 'x', 'x', 1, $5) RETURNING id`,
    [
      name,
      options.os ?? 'linux-deb',
      options.arch === undefined ? 'x86_64' : options.arch,
      String(100 + Math.floor(Math.random() * 899_900)),
      options.status ?? 'pending',
    ],
  );
  const id = agent?.id ?? '';
  const secret = cipher.encrypt(agentKey, agentKeyAad(options.aadId ?? id));
  await AppDataSource.query(
    `UPDATE pending_agents SET agent_key_ciphertext = $2, agent_key_iv = $3,
       agent_key_auth_tag = $4, key_version = $5 WHERE id = $1`,
    [id, secret.ciphertext, secret.iv, secret.authTag, secret.keyVersion],
  );
  const token = randomBytes(32).toString('hex');
  await AppDataSource.query(
    `INSERT INTO enrollment_tokens (pending_agent_id, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(secs => $3))`,
    [id, createHash('sha256').update(token).digest('hex'), options.expiresInSeconds ?? 3600],
  );
  return { token, agentKey, clientKey, pendingAgentId: id };
};

const usedAt = async (pendingAgentId: string) => {
  const [row] = await AppDataSource.query<{ used_at: Date | null }[]>(
    'SELECT used_at FROM enrollment_tokens WHERE pending_agent_id = $1',
    [pendingAgentId],
  );
  return row?.used_at ?? null;
};

// Everything a client could compare, minus the clock.
const fingerprint = (res: request.Response) => {
  const headers = { ...res.headers };
  delete headers.date;
  return { status: res.status, body: res.text, headers };
};

describe('enrollment service endpoints', () => {
  let db: DataSource;
  let app: Express;
  let logger: RecordingLogger;

  beforeAll(async () => {
    await recreateDatabase();
    await syncEnrollRolePassword(AppDataSource, PASSWORD, logger ?? new RecordingLogger());
    db = createEnrollDataSource(enrollUrl());
    await db.initialize();
  });

  beforeEach(() => {
    logger = new RecordingLogger();
    app = createEnrollApp({ db, logger, cipher, managerAddress: '192.168.1.20' });
  });

  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
    await closeDatabase();
  });

  describe('one generic 404', () => {
    it('is identical for unknown, malformed, expired, revoked and expired-agent links', async () => {
      const expired = await seedLink({ expiresInSeconds: -60 });
      const revoked = await seedLink();
      await AppDataSource.query('DELETE FROM pending_agents WHERE id = $1', [
        revoked.pendingAgentId,
      ]);
      const expiredAgent = await seedLink({ status: 'expired' });

      const tokens = [
        randomBytes(32).toString('hex'),
        'not-a-token',
        'x'.repeat(500),
        expired.token,
        revoked.token,
        expiredAgent.token,
      ];
      const responses = [];
      for (const token of tokens) {
        for (const path of [
          `/e/${token}`,
          `/e/${token}/status`,
          `/e/${token}/script?os=linux-deb`,
        ]) {
          responses.push(fingerprint(await request(app).get(path)));
        }
      }
      responses.push(fingerprint(await request(app).get('/e')));
      responses.push(fingerprint(await request(app).get('/anything/else')));

      expect(responses[0]?.status).toBe(404);
      expect(responses[0]?.headers['cache-control']).toBe('no-store');
      for (const res of responses) expect(res).toEqual(responses[0]);
    });

    it('is also what a second script download gets', async () => {
      const link = await seedLink();
      await request(app).get(`/e/${link.token}/script?os=linux-deb`).expect(200);
      const second = await request(app).get(`/e/${link.token}/script?os=linux-deb`);
      const unknown = await request(app).get(
        `/e/${randomBytes(32).toString('hex')}/script?os=linux-deb`,
      );
      expect(fingerprint(second)).toEqual(fingerprint(unknown));
    });
  });

  describe('the script', () => {
    it('hands out the decrypted key once, as an attachment that is never cached', async () => {
      const link = await seedLink({ name: 'web-01' });

      const res = await request(app).get(`/e/${link.token}/script?os=linux-deb`).expect(200);

      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="siemple-agent-web-01.sh"',
      );
      expect(res.headers['content-type']).toMatch(/^text\/x-shellscript/);
      expect(res.text).toContain(`CLIENT_KEY='${link.clientKey}'`);
      expect(res.text).not.toContain('manage_agents');
      expect(res.text).toContain("MANAGER='192.168.1.20'");
      expect(res.text).toContain('wazuh-agent_4.14.10-1_amd64.deb');
      expect(await usedAt(link.pendingAgentId)).not.toBeNull();
    });

    it('is handed out exactly once under concurrent requests', async () => {
      const link = await seedLink();
      const responses = await Promise.all(
        Array.from({ length: 12 }, () => request(app).get(`/e/${link.token}/script?os=linux-rpm`)),
      );
      const statuses = responses.map((r) => r.status).sort();
      expect(statuses.filter((s) => s === 200)).toHaveLength(1);
      expect(statuses.filter((s) => s === 404)).toHaveLength(11);
    });

    it('builds the Windows script on request, with no architecture', async () => {
      const link = await seedLink({ name: 'desk-01', arch: null });
      const res = await request(app).get(`/e/${link.token}/script?os=windows`).expect(200);
      expect(res.headers['content-disposition']).toContain('siemple-agent-desk-01.ps1');
      expect(res.text).toContain(`$ClientKey = '${link.clientKey}'`);
      expect(res.text).toContain('wazuh-agent-4.14.10-1.msi');
    });

    it('takes the architecture from the request, else from the link', async () => {
      const link = await seedLink({ arch: 'arm64' });
      const res = await request(app).get(`/e/${link.token}/script?os=linux-rpm`).expect(200);
      expect(res.text).toContain('wazuh-agent-4.14.10-1.aarch64.rpm');
    });

    it.each([
      ['no os', ''],
      ['an unknown os', '?os=macos'],
      ['an unknown arch', '?os=linux-deb&arch=sparc'],
    ])('answers %s with the same 400 for a valid and an unknown token', async (_label, query) => {
      const link = await seedLink();
      const valid = await request(app).get(`/e/${link.token}/script${query}`);
      const unknown = await request(app).get(
        `/e/${randomBytes(32).toString('hex')}/script${query}`,
      );
      const malformed = await request(app).get(`/e/nope/script${query}`);
      expect(valid.status).toBe(400);
      expect(fingerprint(valid)).toEqual(fingerprint(unknown));
      expect(fingerprint(valid)).toEqual(fingerprint(malformed));
      expect(await usedAt(link.pendingAgentId)).toBeNull();
    });

    it('refuses a bad os or arch without using up the link', async () => {
      const link = await seedLink();
      await request(app).get(`/e/${link.token}/script`).expect(400);
      await request(app).get(`/e/${link.token}/script?os=macos`).expect(400);
      await request(app).get(`/e/${link.token}/script?os=linux-deb&arch=sparc`).expect(400);
      expect(await usedAt(link.pendingAgentId)).toBeNull();
    });

    it('does not decrypt a key bound to another row, and leaves the link unused', async () => {
      const other = await seedLink();
      const link = await seedLink({ aadId: other.pendingAgentId });

      const res = await request(app).get(`/e/${link.token}/script?os=linux-deb`).expect(503);

      expect(res.text).not.toContain(link.agentKey);
      expect(res.text).not.toContain(link.clientKey);
      expect(await usedAt(link.pendingAgentId)).toBeNull();
      const log = logger.lines.join('\n');
      expect(log).toContain('Could not build an install script');
      expect(log).not.toContain(link.token);
      expect(log).not.toContain(link.agentKey);
      expect(log).not.toContain(link.clientKey);
    });

    it('answers 503 without using up the link when WAZUH_PUBLIC_ADDRESS is missing', async () => {
      const link = await seedLink();
      const noAddress = createEnrollApp({ db, logger, cipher, managerAddress: undefined });
      await request(noAddress).get(`/e/${link.token}/script?os=linux-deb`).expect(503);
      expect(await usedAt(link.pendingAgentId)).toBeNull();
    });

    it('is not handed out for an agent that already connected', async () => {
      const link = await seedLink({ status: 'connected' });
      await request(app).get(`/e/${link.token}/script?os=linux-deb`).expect(404);
      expect(await usedAt(link.pendingAgentId)).toBeNull();
    });

    it('never logs a token or key, even on success', async () => {
      const link = await seedLink();
      await request(app).get(`/e/${link.token}/script?os=linux-deb`).expect(200);
      const log = logger.lines.join('\n');
      expect(log).not.toContain(link.token);
      expect(log).not.toContain(link.agentKey);
      expect(log).not.toContain(link.clientKey);
    });
  });

  describe('the page', () => {
    it('offers the download until the script is taken, then says it is waiting', async () => {
      const link = await seedLink({ name: 'web-07' });

      const before = await request(app).get(`/e/${link.token}`).expect(200);
      expect(before.headers['content-type']).toMatch(/^text\/html/);
      expect(before.headers['cache-control']).toBe('no-store');
      expect(before.headers['referrer-policy']).toBe('no-referrer');
      expect(before.text).toContain(`/e/${link.token}/script?os=linux-deb`);
      expect(before.text).toContain('web-07');

      await request(app).get(`/e/${link.token}/script?os=linux-deb`).expect(200);

      const after = await request(app).get(`/e/${link.token}`).expect(200);
      expect(after.text).toContain('Script downloaded, waiting for agent');
      expect(after.text).not.toContain('/script?os=');
    });
  });

  describe('the status', () => {
    it('answers pending or connected until the link expires', async () => {
      const link = await seedLink();
      const pending = await request(app).get(`/e/${link.token}/status`).expect(200);
      expect(pending.body).toEqual({ status: 'pending' });
      expect(pending.headers['cache-control']).toBe('no-store');

      await request(app).get(`/e/${link.token}/script?os=linux-deb`).expect(200);
      await request(app).get(`/e/${link.token}/status`).expect(200);

      await AppDataSource.query(`UPDATE pending_agents SET status = 'connected' WHERE id = $1`, [
        link.pendingAgentId,
      ]);
      const connected = await request(app).get(`/e/${link.token}/status`).expect(200);
      expect(connected.body).toEqual({ status: 'connected' });

      await AppDataSource.query(
        `UPDATE enrollment_tokens SET expires_at = now() - interval '1 second'
           WHERE pending_agent_id = $1`,
        [link.pendingAgentId],
      );
      await request(app).get(`/e/${link.token}/status`).expect(404);
    });
  });
});
