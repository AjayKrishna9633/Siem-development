import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { authenticate, authorize } from '../../src/presentation/middlewares/auth.middleware.ts';
import { Permission } from '../../src/domain/enums/Permission.ts';
import { AppError } from '../../src/domain/errors/AppError.ts';
import { AppErrorCode } from '../../src/domain/enums/AppErrorCode.ts';
import type { ITokenPayload } from '../../src/application/interfaces/services/token.service.interface.ts';

const asUser = (role: string) =>
  ({ user: { userId: 'u1', email: 'u@x.co', role, tokenVersion: 0 } }) as unknown as Request;

// Runs a middleware and returns what it passed to next(): undefined means "allowed"
const run = async (
  middleware: (req: Request, res: Response, next: NextFunction) => unknown,
  req: Request,
) => {
  const next = vi.fn();
  await middleware(req, {} as Response, next);
  expect(next).toHaveBeenCalledTimes(1);
  return next.mock.calls[0]?.[0] as AppError | undefined;
};

describe('authorize', () => {
  it('lets a role with the permission through', async () => {
    expect(await run(authorize(Permission.USERS_MANAGE), asUser('admin'))).toBeUndefined();
  });

  it('refuses a role without it with FORBIDDEN', async () => {
    const err = await run(authorize(Permission.RULES_EDIT), asUser('t1_analyst'));
    expect(err).toBeInstanceOf(AppError);
    expect(err?.code).toBe(AppErrorCode.FORBIDDEN);
  });

  it('requires every listed permission', async () => {
    const err = await run(
      authorize(Permission.RULES_EDIT, Permission.USERS_MANAGE),
      asUser('t2_analyst'),
    );
    expect(err?.code).toBe(AppErrorCode.FORBIDDEN);
  });

  it('refuses when nobody is signed in', async () => {
    const err = await run(authorize(Permission.ALERTS_VIEW), {} as Request);
    expect(err?.code).toBe(AppErrorCode.UNAUTHORIZED);
  });
});

describe('authenticate', () => {
  const tokenPayload: ITokenPayload = {
    userId: 'u1',
    email: 'u@x.co',
    role: 'admin',
    tokenVersion: 3,
  };
  const tokens = {
    generateAccessToken: () => 'unused',
    verifyAccessToken: () => tokenPayload,
  };
  const withBearer = { headers: { authorization: 'Bearer abc' } } as Request;

  it('uses the role from the database, not the one in the token', async () => {
    const sessionUsers = { execute: vi.fn(async () => ({ ...tokenPayload, role: 't1_analyst' })) };
    const req = { ...withBearer } as Request;

    expect(await run(authenticate(tokens, sessionUsers), req)).toBeUndefined();
    expect(sessionUsers.execute).toHaveBeenCalledWith({ userId: 'u1', tokenVersion: 3 });
    expect(req.user?.role).toBe('t1_analyst');
  });

  it('rejects the request when the session user check fails', async () => {
    const revoked = new AppError(AppErrorCode.SESSION_REVOKED, 'revoked');
    const sessionUsers = { execute: vi.fn(async () => Promise.reject(revoked)) };

    expect(await run(authenticate(tokens, sessionUsers), { ...withBearer } as Request)).toBe(
      revoked,
    );
  });

  it('rejects a missing token without touching the database', async () => {
    const sessionUsers = { execute: vi.fn() };
    const err = await run(authenticate(tokens, sessionUsers), { headers: {} } as Request);

    expect(err?.code).toBe(AppErrorCode.UNAUTHORIZED);
    expect(sessionUsers.execute).not.toHaveBeenCalled();
  });
});
