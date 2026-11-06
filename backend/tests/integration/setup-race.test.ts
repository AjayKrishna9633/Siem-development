import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.ts';
import {
  closeDatabase,
  countUsers,
  issueSetupToken,
  recreateDatabase,
} from '../helpers/database.ts';

describe('first-run setup under concurrency', () => {
  let token: string;

  beforeAll(async () => {
    await recreateDatabase();
    token = await issueSetupToken();
  });
  afterAll(closeDatabase);

  it('lets exactly one of many simultaneous requests create an admin', async () => {
    const attempts = Array.from({ length: 10 }, (_, i) =>
      request(app)
        .post('/api/setup/complete')
        .send({
          token,
          adminName: `Racer ${i}`,
          email: `racer${i}@example.com`,
          password: 'correct-horse-battery',
          orgName: 'Acme SOC',
          baseUrl: 'https://siem.acme.test',
          timezone: 'UTC',
        }),
    );
    const statuses = (await Promise.all(attempts)).map((res) => res.status);

    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.every((s) => [201, 404, 429].includes(s))).toBe(true);
    expect(await countUsers()).toBe(1);
  });
});
