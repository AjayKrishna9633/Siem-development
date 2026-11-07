import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.ts';
import { closeDatabase, recreateDatabase } from '../helpers/database.ts';
import { addActiveUser, setupFirstAdmin, type ISignedInUser } from '../helpers/users.ts';

interface IListedUser {
  id: string;
  email: string;
  role: string;
  status: string;
}

describe('GET /api/users paging, filtering and sorting', () => {
  let admin: ISignedInUser;

  const list = (query: Record<string, string | number> = {}) =>
    request(app).get('/api/users').query(query).set('Authorization', `Bearer ${admin.token}`);

  const emails = (res: { body: { data: { items: IListedUser[] } } }) =>
    res.body.data.items.map((u) => u.email);

  beforeAll(async () => {
    await recreateDatabase();
    admin = await setupFirstAdmin(app);
    await addActiveUser(app, admin, 'alice@example.com', 't1_analyst');
    const bob = await addActiveUser(app, admin, 'bob@example.com', 't2_analyst');
    await addActiveUser(app, admin, 'carol@example.com', 't1_analyst');
    await request(app)
      .post('/api/users/invites')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: 'dave@example.com', role: 't2_analyst' })
      .expect(201);
    await request(app)
      .post(`/api/users/${bob.id}/disable`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
  });
  afterAll(closeDatabase);

  it('returns one page at a time with the total, and the pages never overlap', async () => {
    const pages = await Promise.all([1, 2, 3].map((page) => list({ page, pageSize: 2 })));

    expect(pages.map((res) => res.body.data.items.length)).toEqual([2, 2, 1]);
    expect(pages.every((res) => res.body.data.total === 5)).toBe(true);
    expect(new Set(pages.flatMap(emails)).size).toBe(5);
  });

  it('sorts by name by default, falling back to the email for users without a name', async () => {
    const res = await list();
    expect(emails(res)).toEqual([
      'alice@example.com',
      'bob@example.com',
      'carol@example.com',
      'dave@example.com',
      'admin@example.com',
    ]);
  });

  it('sorts by the requested column and direction', async () => {
    const res = await list({ sortBy: 'email', sortDir: 'desc' });
    expect(emails(res)).toEqual([
      'dave@example.com',
      'carol@example.com',
      'bob@example.com',
      'alice@example.com',
      'admin@example.com',
    ]);
  });

  it('searches email and name without treating % or _ as wildcards', async () => {
    expect(emails(await list({ search: 'CAR' }))).toEqual(['carol@example.com']);
    expect(emails(await list({ search: 'first' }))).toEqual(['admin@example.com']);
    expect((await list({ search: '%' })).body.data.total).toBe(0);
    expect((await list({ search: '_' })).body.data.total).toBe(0);
  });

  it('filters by role and status', async () => {
    expect(emails(await list({ role: 't1_analyst' }))).toEqual([
      'alice@example.com',
      'carol@example.com',
    ]);
    expect(emails(await list({ status: 'invited' }))).toEqual(['dave@example.com']);
    expect(emails(await list({ status: 'disabled' }))).toEqual(['bob@example.com']);
  });

  it('counts every user by status, whatever the filters', async () => {
    const res = await list({ role: 'admin' });
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.counts).toEqual({ all: 5, invited: 1, disabled: 1 });
  });

  it('rejects a page size above 100, page 0 and unknown sort columns', async () => {
    expect((await list({ pageSize: 500 })).status).toBe(400);
    expect((await list({ page: 0 })).status).toBe(400);
    expect((await list({ sortBy: 'password_hash' })).status).toBe(400);
  });
});
