import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.ts';
import TYPES from '../../src/domain/constants/types.ts';
import { AppDataSource } from '../../src/infrastructure/database/data-source.ts';
import { di } from '../../src/infrastructure/di/index.ts';
import type { IUserRepository } from '../../src/application/interfaces/repositories/user.repository.interface.ts';
import type { IAuditService } from '../../src/application/interfaces/services/audit.service.interface.ts';
import { AuditAction, AuditTargetType } from '../../src/domain/enums/AuditAction.ts';
import { UserRole } from '../../src/domain/enums/UserRole.ts';
import { closeDatabase, recreateDatabase } from '../helpers/database.ts';
import { addActiveUser, setupFirstAdmin, type ISignedInUser } from '../helpers/users.ts';

const as = (user: ISignedInUser) => ({ Authorization: `Bearer ${user.token}` });

interface IAuditRow {
  action: string;
  category: string;
  outcome: string;
  actor_id: string | null;
  actor_username: string | null;
  actor_role: string | null;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  metadata: Record<string, unknown>;
}

const rowsFor = (action: string, targetId: string) =>
  AppDataSource.query<IAuditRow[]>(
    `SELECT * FROM audit_logs WHERE action = $1 AND target_id = $2 ORDER BY occurred_at, id`,
    [action, targetId],
  );

const roleOf = async (userId: string) => {
  const [row] = await AppDataSource.query<{ role: string }[]>(
    'SELECT role FROM users WHERE id = $1',
    [userId],
  );
  return row?.role;
};

describe('audit rows carry the request context', () => {
  let admin: ISignedInUser;
  let otherAdmin: ISignedInUser;
  let analyst: ISignedInUser;
  let secondAnalyst: ISignedInUser;

  beforeAll(async () => {
    await recreateDatabase();
    admin = await setupFirstAdmin(app);
    otherAdmin = await addActiveUser(app, admin, 'second@example.com', 'admin');
    analyst = await addActiveUser(app, admin, 'tier1@example.com', 't1_analyst');
    secondAnalyst = await addActiveUser(app, admin, 'tier1b@example.com', 't1_analyst');
  });
  afterAll(closeDatabase);

  it('names who changed a role, from where, and under which request id', async () => {
    await request(app)
      .patch(`/api/users/${analyst.id}/role`)
      .set(as(admin))
      .set('X-Request-Id', 'req-role-change-1')
      .set('User-Agent', 'siemple-test/1.0')
      .send({ role: 't2_analyst' })
      .expect(200);

    const [row] = await rowsFor('user.role.change', analyst.id);

    expect(row).toMatchObject({
      category: 'user',
      outcome: 'success',
      actor_id: admin.id,
      actor_username: 'First Admin',
      actor_role: 'admin',
      target_type: 'user',
      target_label: 'tier1@example.com',
      user_agent: 'siemple-test/1.0',
      request_id: 'req-role-change-1',
      metadata: { from: 't1_analyst', to: 't2_analyst' },
    });
    expect(row?.ip_address).toBeTruthy();
  });

  it('writes the audit row for a disable too', async () => {
    await request(app)
      .post(`/api/users/${secondAnalyst.id}/disable`)
      .set(as(admin))
      .set('X-Request-Id', 'req-disable-1')
      .expect(200);

    const [row] = await rowsFor('user.disable', secondAnalyst.id);

    expect(row).toMatchObject({
      actor_id: admin.id,
      actor_username: 'First Admin',
      target_label: 'tier1b@example.com',
      request_id: 'req-disable-1',
    });
  });

  it('does not write a row when the role did not actually change', async () => {
    await request(app)
      .patch(`/api/users/${analyst.id}/role`)
      .set(as(admin))
      .send({ role: 't2_analyst' })
      .expect(200);

    expect(await rowsFor('user.role.change', analyst.id)).toHaveLength(1);
  });

  it('keeps simultaneous requests attributed to their own actor and request id', async () => {
    const [toAdmin, toTier2] = await Promise.all([
      request(app)
        .patch(`/api/users/${analyst.id}/role`)
        .set(as(admin))
        .set('X-Request-Id', 'req-concurrent-a')
        .send({ role: 'admin' }),
      request(app)
        .patch(`/api/users/${secondAnalyst.id}/role`)
        .set(as(otherAdmin))
        .set('X-Request-Id', 'req-concurrent-b')
        .send({ role: 't2_analyst' }),
    ]);
    expect([toAdmin.status, toTier2.status]).toEqual([200, 200]);

    const aRows = await rowsFor('user.role.change', analyst.id);
    const bRows = await rowsFor('user.role.change', secondAnalyst.id);

    expect(aRows.at(-1)).toMatchObject({
      actor_id: admin.id,
      request_id: 'req-concurrent-a',
      metadata: { from: 't2_analyst', to: 'admin' },
    });
    expect(bRows.at(-1)).toMatchObject({
      actor_id: otherAdmin.id,
      actor_username: 'second',
      request_id: 'req-concurrent-b',
    });
  });

  it('rolls the role change back when its audit row cannot be written', async () => {
    const users = di.container.get<IUserRepository>(TYPES.UserRepository);
    const audit = di.container.get<IAuditService>(TYPES.AuditService);
    const before = await roleOf(secondAnalyst.id);
    const rowsBefore = await rowsFor('user.role.change', secondAnalyst.id);

    await expect(
      users.changeWithAdminLock(
        secondAnalyst.id,
        (target) => target.changeRole(UserRole.T1_ANALYST, new Date()),
        () => ({
          ...audit.prepare({
            action: AuditAction.USER_ROLE_CHANGED,
            targetType: AuditTargetType.USER,
            targetId: secondAnalyst.id,
          }),
          // Violates CHK_audit_logs_category, so the insert fails inside the transaction.
          category: 'not-a-category' as never,
        }),
      ),
    ).rejects.toThrow(/CHK_audit_logs_category/);

    expect(await roleOf(secondAnalyst.id)).toBe(before);
    expect(await rowsFor('user.role.change', secondAnalyst.id)).toHaveLength(rowsBefore.length);
  });
});
