import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import type { DataSource } from 'typeorm';
import type { ILogger } from '../application/interfaces/services/logger.interface.ts';
import type { ISecretCipher } from '../application/interfaces/services/secret-cipher.service.interface.ts';
import { AgentArch, AgentOs } from '../domain/enums/AgentOs.ts';
import { agentKeyAad } from '../domain/policies/enrollment-link.policy.ts';
import { buildInstallScript } from '../shared/agent-install/install-script.ts';
import { EnrollmentStore } from './enrollment-store.ts';
import { renderEnrollPage, type PageState } from './page.ts';

export interface IEnrollAppDeps {
  db: DataSource;
  logger: ILogger;
  cipher: ISecretCipher;
  // Where the installed agent connects: WAZUH_PUBLIC_ADDRESS.
  managerAddress: string | undefined;
  // This service's own https:// address, for the copyable commands on the page.
  publicUrl: string | undefined;
}

// The page's stylesheet and script: real files next to the build (backend/enroll-assets), read
// once at start-up and served from memory.
const ASSETS_DIR = join(import.meta.dirname, '..', '..', 'enroll-assets');
const loadAsset = (name: string): string => readFileSync(join(ASSETS_DIR, name), 'utf8');

// Only this service's own files, never a frame, never a <base> or form posting elsewhere.
export const ENROLL_CSP =
  "default-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

// One response for every link that can't be used, whatever the reason (unknown, expired, revoked,
// script already downloaded) and for every unknown route, so none of them can be told apart.
const NOT_FOUND_BODY = JSON.stringify({ message: 'This link is not valid.' });
const sendNotFound = (res: Response): void => {
  res.status(404).type('application/json').send(NOT_FOUND_BODY);
};

const OS_VALUES = new Set<string>(Object.values(AgentOs));
const ARCH_VALUES = new Set<string>(Object.values(AgentArch));

export const createEnrollApp = ({
  db,
  logger,
  cipher,
  managerAddress,
  publicUrl,
}: IEnrollAppDeps): Express => {
  const app = express();
  const store = new EnrollmentStore(db);
  const css = loadAsset('enroll.css');
  const js = loadAsset('enroll.js');
  app.disable('x-powered-by');
  app.disable('etag');
  // Helmet's defaults, with the CSP replaced by the exact policy above. It already sends
  // Referrer-Policy: no-referrer and X-Content-Type-Options: nosniff.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.set('Content-Security-Policy', ENROLL_CSP);
    next();
  });
  app.use(express.json({ limit: '4kb' }));
  // Nothing here may be cached: every response is about a secret link.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.get('/enroll/health', async (_req: Request, res: Response) => {
    try {
      await db.query('SELECT 1');
      res.status(200).json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  app.get('/e/assets/enroll.css', (_req: Request, res: Response) => {
    res.status(200).type('text/css; charset=utf-8').send(css);
  });
  app.get('/e/assets/enroll.js', (_req: Request, res: Response) => {
    res.status(200).type('text/javascript; charset=utf-8').send(js);
  });

  app.get('/e/:token', async (req: Request<{ token: string }>, res: Response) => {
    const token = req.params.token;
    const link = await store.findLink(store.hashToken(token));
    if (!link) return sendNotFound(res);
    const state: PageState =
      link.status === 'connected' ? 'connected' : link.scriptDownloaded ? 'used' : 'fresh';
    res
      .status(200)
      .type('html')
      .send(
        renderEnrollPage({
          token,
          agentName: link.agentName,
          state,
          os: link.os,
          arch: link.arch,
          publicUrl: publicUrl ?? null,
        }),
      );
  });

  app.get('/e/:token/status', async (req: Request<{ token: string }>, res: Response) => {
    const status = await store.findStatus(store.hashToken(req.params.token));
    if (!status) return sendNotFound(res);
    res.status(200).json({ status });
  });

  app.get('/e/:token/script', async (req: Request<{ token: string }>, res: Response) => {
    // Checked before the link is touched, so a typo doesn't use up the one download.
    const os = typeof req.query.os === 'string' ? req.query.os : '';
    const arch = typeof req.query.arch === 'string' ? req.query.arch : undefined;
    if (!OS_VALUES.has(os) || (arch !== undefined && !ARCH_VALUES.has(arch))) {
      res.status(400).json({ message: 'Choose os=windows, linux-deb or linux-rpm.' });
      return;
    }

    // Checked before the claim, so the link isn't used up by a script that couldn't be built.
    if (!managerAddress) {
      logger.error('WAZUH_PUBLIC_ADDRESS is not set: install scripts cannot be built');
      res.status(503).json({ message: 'This link cannot be used right now. Try again later.' });
      return;
    }

    let script: ReturnType<typeof buildInstallScript> | null;
    try {
      script = await store.claimScript(store.hashToken(req.params.token), (agent) =>
        buildInstallScript({
          os: os as AgentOs,
          arch: os === AgentOs.WINDOWS ? null : ((arch as AgentArch | undefined) ?? agent.arch),
          agentVersion: agent.agentVersion,
          managerAddress,
          agentName: agent.agentName,
          agentKey: cipher.decrypt(agent.agentKey, agentKeyAad(agent.pendingAgentId)),
        }),
      );
    } catch (err) {
      // The claim was rolled back, so the link still works once the cause is fixed. Only the
      // error's message is logged: database and cipher errors never contain the key or token.
      logger.error(
        'Could not build an install script (is ENROLL_KEY_SECRET the same as the API?)',
        {
          reason: err instanceof Error ? err.message : 'unknown',
        },
      );
      res.status(503).json({ message: 'This link cannot be used right now. Try again later.' });
      return;
    }
    if (!script) return sendNotFound(res);

    res
      .status(200)
      .type(script.contentType)
      .set('Content-Disposition', `attachment; filename="${script.fileName}"`)
      .send(script.body);
  });

  app.use((_req: Request, res: Response) => sendNotFound(res));

  // Logs the error's message only: request URLs carry tokens.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', { reason: err instanceof Error ? err.message : 'unknown' });
    res.status(500).json({ message: 'Something went wrong' });
  });

  return app;
};
