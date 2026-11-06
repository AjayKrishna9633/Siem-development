import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.ts';
import TYPES from '../../src/domain/constants/types.ts';
import { di } from '../../src/infrastructure/di/index.ts';
import { UserRole } from '../../src/domain/enums/UserRole.ts';
import { AppDataSource } from '../../src/infrastructure/database/data-source.ts';
import type { IChangeUserRoleUseCase } from '../../src/application/interfaces/use-cases/users.interface.ts';
import { closeDatabase, recreateDatabase } from '../helpers/database.ts';
import { addActiveUser, setupFirstAdmin } from '../helpers/users.ts';

describe('last-admin protection under the lock', () => {
  let adminA: string;
  let adminB: string;

  beforeAll(async () => {
    await recreateDatabase();
    const first = await setupFirstAdmin(app);
    const second = await addActiveUser(app, first, 'second-admin@example.com', 'admin');
    adminA = first.id;
    adminB = second.id;
  });
  afterAll(closeDatabase);

  it('lets exactly one of two simultaneous mutual demotions through', async () => {
    const changeRole = di.container.get<IChangeUserRoleUseCase>(TYPES.ChangeUserRoleUseCase);
    const context = { ip: null, userAgent: 'test' };

    const results = await Promise.allSettled([
      changeRole.execute({
        actor: { userId: adminA, role: UserRole.ADMIN },
        userId: adminB,
        role: UserRole.T2_ANALYST,
        context,
      }),
      changeRole.execute({
        actor: { userId: adminB, role: UserRole.ADMIN },
        userId: adminA,
        role: UserRole.T2_ANALYST,
        context,
      }),
    ]);

    const rejected = results.filter((r) => r.status === 'rejected');
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({ code: 'LAST_ADMIN' });

    const [row] = await AppDataSource.query<{ count: string }[]>(
      `SELECT count(*) FROM users WHERE role = 'admin' AND status = 'active'`,
    );
    expect(Number(row?.count)).toBe(1);
  });
});
