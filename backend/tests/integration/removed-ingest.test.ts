import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.ts';
import { AppDataSource } from '../../src/infrastructure/database/data-source.ts';
import { closeDatabase, recreateDatabase } from '../helpers/database.ts';
import { setupFirstAdmin, type ISignedInUser } from '../helpers/users.ts';

// The HTTP ingest API and its keys were removed. Security events will come from Wazuh agents;
// SIEMple's own logs are collected from its containers by Alloy.
describe('removed ingest API', () => {
  let admin: ISignedInUser;

  beforeAll(async () => {
    await recreateDatabase();
    admin = await setupFirstAdmin(app);
  });
  afterAll(closeDatabase);

  it('answers 404 on the old ingest and ingest-key routes', async () => {
    const ingest = await request(app)
      .post('/api/ingest')
      .set('Authorization', `Bearer siemple_ik_${'a'.repeat(64)}`)
      .send({ events: [{ message: 'hello' }] });
    expect(ingest.status).toBe(404);

    const keys = await request(app)
      .get('/api/ingest-keys')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(keys.status).toBe(404);
  });

  it('leaves no ingest_keys table after the migrations', async () => {
    const [row] = await AppDataSource.query<{ table: string | null }[]>(
      `SELECT to_regclass('public.ingest_keys')::text AS "table"`,
    );
    expect(row?.table).toBeNull();
  });
});
