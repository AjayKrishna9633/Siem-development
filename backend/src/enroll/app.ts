import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import type { DataSource } from 'typeorm';
import type { ILogger } from '../application/interfaces/services/logger.interface.ts';
import type { ISecretCipher } from '../application/interfaces/services/secret-cipher.service.interface.ts';
import { AgentArch, AgentOs } from '../domain/enums/AgentOs.ts';
import { agentKeyAad } from '../domain/policies/enrollment-link.policy.ts';
import { buildInstallScript } from '../shared/agent-install/install-script.ts';
import { EnrollmentStore, type IEnrollmentLinkView } from './enrollment-store.ts';

export interface IEnrollAppDeps {
  db: DataSource;
  logger: ILogger;
  cipher: ISecretCipher;
  // Where the installed agent connects: WAZUH_PUBLIC_ADDRESS.
  managerAddress: string | undefined;
}

// One response for every link that can't be used, whatever the reason (unknown, expired, revoked,
// script already downloaded) and for every unknown route, so none of them can be told apart.
const NOT_FOUND_BODY = JSON.stringify({ message: 'This link is not valid.' });
const sendNotFound = (res: Response): void => {
  res.status(404).type('application/json').send(NOT_FOUND_BODY);
};

const OS_VALUES = new Set<string>(Object.values(AgentOs));
const ARCH_VALUES = new Set<string>(Object.values(AgentArch));

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

// A placeholder until the real page (step 6). Relative links keep the token in the path only.
const renderPage = (link: IEnrollmentLinkView, token: string): string => {
  const name = escapeHtml(link.agentName);
  const base = `/e/${encodeURIComponent(token)}`;
  const body = link.scriptDownloaded
    ? `<p>Script downloaded, waiting for agent <strong>${name}</strong> to connect.</p>`
    : [
        `<p>Install the SIEMple agent <strong>${name}</strong>. The script can be downloaded once.</p>`,
        '<ul>',
        `<li><a href="${base}/script?os=windows">Windows (PowerShell, run as administrator)</a></li>`,
        `<li><a href="${base}/script?os=linux-deb">Debian or Ubuntu (run with sudo)</a></li>`,
        `<li><a href="${base}/script?os=linux-rpm">RHEL, Rocky, Alma or Fedora (run with sudo)</a></li>`,
        '</ul>',
      ].join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SIEMple agent</title></head><body><h1>SIEMple agent</h1>${body}<p>Status: ${link.status}</p></body></html>`;
};

export const createEnrollApp = ({
  db,
  logger,
  cipher,
  managerAddress,
}: IEnrollAppDeps): Express => {
  const app = express();
  const store = new EnrollmentStore(db);
  app.disable('x-powered-by');
  app.disable('etag');
  app.use(helmet());
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

  app.get('/e/:token', async (req: Request<{ token: string }>, res: Response) => {
    const token = req.params.token;
    const link = await store.findLink(store.hashToken(token));
    if (!link) return sendNotFound(res);
    res.status(200).type('html').send(renderPage(link, token));
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
