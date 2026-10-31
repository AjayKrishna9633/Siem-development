import request from 'supertest';
import type { Express } from 'express';
import { issueSetupToken } from './database.ts';

export const PASSWORD = 'correct-horse-battery';

export interface ISignedInUser {
  id: string;
  token: string;
}

// Completes first-run setup and returns the first admin, signed in
export const setupFirstAdmin = async (app: Express, email = 'admin@example.com') => {
  const res = await request(app)
    .post('/api/setup/complete')
    .send({
      token: await issueSetupToken(),
      adminName: 'First Admin',
      email,
      password: PASSWORD,
      orgName: 'Acme SOC',
      baseUrl: 'https://siem.acme.test',
      timezone: 'UTC',
    });
  if (res.status !== 201) throw new Error(`Setup failed: ${res.status} ${res.body.message}`);
  return { id: res.body.data.user.id, token: res.body.data.accessToken } as ISignedInUser;
};

// An admin adds someone, who then activates and is signed in
export const addActiveUser = async (
  app: Express,
  admin: ISignedInUser,
  email: string,
  role: string,
): Promise<ISignedInUser> => {
  const added = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ username: email.split('@')[0], email, role });
  if (added.status !== 201) throw new Error(`Add user failed: ${added.status}`);

  const activated = await request(app)
    .post('/api/auth/activate')
    .send({ activationId: added.body.data.activation.activationId, newPassword: PASSWORD });
  if (activated.status !== 200) throw new Error(`Activation failed: ${activated.status}`);

  return { id: added.body.data.member.id, token: activated.body.data.accessToken };
};
