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

// The token inside an invite link (tests run without email, so the link is returned)
export const tokenFromLink = (link: string): string => {
  const token = new URL(link).searchParams.get('token');
  if (!token) throw new Error(`No token in ${link}`);
  return token;
};

// An admin invites someone, who accepts and is signed in
export const addActiveUser = async (
  app: Express,
  admin: ISignedInUser,
  email: string,
  role: string,
): Promise<ISignedInUser> => {
  const invited = await request(app)
    .post('/api/users/invites')
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ email, role });
  if (invited.status !== 201) throw new Error(`Invite failed: ${invited.status}`);

  const accepted = await request(app)
    .post('/api/auth/invite/accept')
    .send({
      token: tokenFromLink(invited.body.data.invite.link),
      name: email.split('@')[0],
      password: PASSWORD,
    });
  if (accepted.status !== 200) throw new Error(`Accept failed: ${accepted.status}`);

  return { id: invited.body.data.user.id, token: accepted.body.data.accessToken };
};
