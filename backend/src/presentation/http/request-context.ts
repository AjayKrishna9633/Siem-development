import type { Request } from 'express';
import type { IRequestContext } from '../../application/interfaces/repositories/audit-log.repository.interface.ts';

const USER_AGENT_MAX = 512;

export const requestContextFrom = (req: Request): IRequestContext => ({
  ip: req.ip ?? null,
  userAgent: req.get('user-agent')?.slice(0, USER_AGENT_MAX) ?? null,
});
