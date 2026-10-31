import type { Request } from 'express';
import type { IRequestContext } from '../../application/interfaces/repositories/audit-log.repository.interface.ts';

// Matches the audit_logs.user_agent column; longer headers are cut, not rejected
const USER_AGENT_MAX = 512;

// req.ip, not X-Forwarded-For: the header is set by the client and can be faked.
// Behind a reverse proxy, set TRUST_PROXY so Express makes req.ip the real client.
export const requestContextFrom = (req: Request): IRequestContext => ({
  ip: req.ip ?? null,
  userAgent: req.get('user-agent')?.slice(0, USER_AGENT_MAX) ?? null,
});
