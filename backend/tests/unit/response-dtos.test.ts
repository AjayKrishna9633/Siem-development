import { describe, expect, it } from 'vitest';
import { toSessionResponse } from '../../src/application/dtos/session/response/session-response.dto.ts';
import {
  toInviteDeliveryDto,
  toPendingInviteDto,
} from '../../src/application/dtos/invite/response/invite-response.dto.ts';
import { toUserPageDto } from '../../src/application/dtos/user/response/user-response.dto.ts';
import type { ILoginResponse } from '../../src/application/types/use-case/auth.types.ts';
import { UserRole } from '../../src/domain/enums/UserRole.ts';
import { UserStatus } from '../../src/domain/enums/UserStatus.ts';

const at = new Date('2026-11-08T09:30:00Z');

describe('response DTOs', () => {
  it('never puts the refresh token, or any field it does not list, in the session body', () => {
    const session = {
      accessToken: 'access',
      refreshToken: 'refresh-secret',
      user: {
        id: 'u1',
        email: 'ada@example.com',
        username: 'Ada',
        role: 'admin',
        permissions: ['users.manage'],
        passwordHash: 'should-not-leak',
      },
      somethingAddedLater: true,
    } as ILoginResponse;

    const body = toSessionResponse(session);

    expect(body).toEqual({
      accessToken: 'access',
      user: {
        id: 'u1',
        email: 'ada@example.com',
        username: 'Ada',
        role: 'admin',
        permissions: ['users.manage'],
      },
    });
    expect(JSON.stringify(body)).not.toContain('refresh-secret');
  });

  it('leaves the inviting admin id out of pending invites and sends dates as ISO strings', () => {
    const dto = toPendingInviteDto({
      userId: 'u2',
      email: 'new@example.com',
      role: UserRole.T1_ANALYST,
      invitedById: 'u1',
      invitedAt: at,
      expiresAt: null,
      expired: true,
    });

    expect(dto).not.toHaveProperty('invitedById');
    expect(dto.invitedAt).toBe('2026-11-08T09:30:00.000Z');
    expect(dto.expiresAt).toBeNull();
  });

  it('includes the invite link only when there is one', () => {
    expect(toInviteDeliveryDto({ delivered: true, expiresAt: at })).not.toHaveProperty('link');
    expect(toInviteDeliveryDto({ delivered: false, expiresAt: at, link: 'https://x' }).link).toBe(
      'https://x',
    );
  });

  it('maps every user on a page', () => {
    const dto = toUserPageDto({
      items: [
        {
          id: 'u1',
          email: 'ada@example.com',
          username: null,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          createdAt: at,
          lastLoginAt: null,
        },
      ],
      page: 1,
      pageSize: 10,
      total: 1,
      counts: { all: 1, invited: 0, disabled: 0 },
    });

    expect(dto.items[0]?.createdAt).toBe('2026-11-08T09:30:00.000Z');
    expect(dto.total).toBe(1);
  });
});
