import { injectable, inject } from 'inversify';
import { randomBytes, randomInt } from 'node:crypto';
import TYPES from '../../domain/constants/types.ts';
import { env } from '../../config/env.config.ts';
import type { ICacheService } from '../../application/interfaces/services/cache.service.interface.ts';
import type { IHashService } from '../../application/interfaces/services/hash.service.interface.ts';
import type { IEmailService } from '../../application/interfaces/services/email.service.interface.ts';
import type {
  IActivationGrant,
  IActivationRecord,
  IActivationService,
  IIssueActivationInput,
} from '../../application/interfaces/services/activation.service.interface.ts';
import { UserRole } from '../../domain/enums/UserRole.ts';
import {
  activationEmailHtml,
  activationEmailSubject,
  activationEmailText,
  type IActivationEmailInput,
} from './templates/activation-email.ts';

const ACTIVATION_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_FAILED_ATTEMPTS = 5;
// No 0/O/1/l/I so the temporary password survives being read aloud or retyped
const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const TEMP_PASSWORD_LENGTH = 12;

const roleTitle: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ORG_ADMIN]: 'Company Admin',
  [UserRole.ANALYST]: 'Analyst',
};

const generateTemporaryPassword = () =>
  Array.from(
    { length: TEMP_PASSWORD_LENGTH },
    () => TEMP_PASSWORD_ALPHABET[randomInt(TEMP_PASSWORD_ALPHABET.length)],
  ).join('');

@injectable()
export class ActivationService implements IActivationService {
  constructor(
    @inject(TYPES.CacheService) private readonly cache: ICacheService,
    @inject(TYPES.HashService) private readonly hasher: IHashService,
    @inject(TYPES.EmailService) private readonly email: IEmailService,
  ) {}

  async issue(input: IIssueActivationInput): Promise<IActivationGrant> {
    // A live earlier activation means this is a resend: the email says the old one is dead
    const replacesEarlier =
      (await this.cache.get<string>(`activation-user:${input.userId}`)) !== null;
    await this.revokeForUser(input.userId);

    // Must match ACTIVATION_ID_PATTERN
    const activationId = randomBytes(24).toString('hex');
    const temporaryPassword = generateTemporaryPassword();
    const expiresAt = new Date(Date.now() + ACTIVATION_TTL_SECONDS * 1000).toISOString();

    const record: IActivationRecord = {
      userId: input.userId,
      email: input.email,
      temporaryPasswordHash: await this.hasher.hash(temporaryPassword),
      failedAttempts: 0,
      expiresAt,
    };
    await this.cache.set(`activation:${activationId}`, record, ACTIVATION_TTL_SECONDS);
    await this.cache.set(`activation-user:${input.userId}`, activationId, ACTIVATION_TTL_SECONDS);

    const activationLink = `${env.FRONTEND_URL}/activate?id=${activationId}`;
    const emailSent = await this.sendActivationEmail({
      username: input.username,
      companyName: input.companyName,
      roleTitle: roleTitle[input.role],
      email: input.email,
      activationLink,
      temporaryPassword,
      signInLink: `${env.FRONTEND_URL}/activate?email=${encodeURIComponent(input.email)}`,
      expiresAt,
      replacesEarlier,
    });

    return { activationId, activationLink, temporaryPassword, expiresAt, emailSent };
  }

  // Delivery is best-effort: a failure is logged and reported back, and the creator
  // still receives the link and temporary password to share by hand
  private async sendActivationEmail(content: IActivationEmailInput): Promise<boolean> {
    try {
      await this.email.sendEmail(
        content.email,
        activationEmailSubject(content),
        activationEmailText(content),
        activationEmailHtml(content),
      );
      return true;
    } catch (err) {
      console.error(`Activation email to ${content.email} failed:`, err);
      return false;
    }
  }

  find(activationId: string): Promise<IActivationRecord | null> {
    return this.cache.get<IActivationRecord>(`activation:${activationId}`);
  }

  async findForUser(
    userId: string,
  ): Promise<{ activationId: string; record: IActivationRecord } | null> {
    const activationId = await this.cache.get<string>(`activation-user:${userId}`);
    if (!activationId) return null;
    const record = await this.find(activationId);
    return record ? { activationId, record } : null;
  }

  async recordFailure(activationId: string, record: IActivationRecord): Promise<void> {
    const failedAttempts = record.failedAttempts + 1;
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      await this.consume(activationId, record.userId);
      return;
    }
    const remainingSeconds = Math.max(
      1,
      Math.floor((new Date(record.expiresAt).getTime() - Date.now()) / 1000),
    );
    await this.cache.set(
      `activation:${activationId}`,
      { ...record, failedAttempts },
      remainingSeconds,
    );
  }

  async consume(activationId: string, userId: string): Promise<void> {
    await this.cache.delete(`activation:${activationId}`);
    await this.cache.delete(`activation-user:${userId}`);
  }

  async revokeForUser(userId: string): Promise<void> {
    const previous = await this.cache.get<string>(`activation-user:${userId}`);
    if (previous) await this.consume(previous, userId);
  }
}
