import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.ts';
import TYPES from '../../src/domain/constants/types.ts';
import { di } from '../../src/infrastructure/di/index.ts';
import { AppDataSource } from '../../src/infrastructure/database/data-source.ts';
import { AesGcmSecretCipher } from '../../src/infrastructure/services/aes-gcm-secret-cipher.service.ts';
import type { IEmailSettingsRepository } from '../../src/application/interfaces/repositories/email-settings.repository.interface.ts';
import { SMTP_PASSWORD_AAD } from '../../src/domain/constants/email.ts';
import { SmtpSecurity } from '../../src/domain/enums/SmtpSecurity.ts';
import { closeDatabase, recreateDatabase } from '../helpers/database.ts';
import { setupFirstAdmin, type ISignedInUser } from '../helpers/users.ts';

const PASSWORD = 'smtp-app-password-1234';
const cipher = new AesGcmSecretCipher(randomBytes(32).toString('base64'));

describe('email settings storage', () => {
  let admin: ISignedInUser;
  let repo: IEmailSettingsRepository;

  beforeAll(async () => {
    await recreateDatabase();
    admin = await setupFirstAdmin(app);
    repo = di.container.get<IEmailSettingsRepository>(TYPES.EmailSettingsRepository);
  });
  afterAll(closeDatabase);

  it('starts with one disabled row and no password', async () => {
    const settings = await repo.get();
    expect(settings).toMatchObject({
      host: null,
      security: SmtpSecurity.STARTTLS,
      password: null,
      enabled: false,
    });
    const [count] = await AppDataSource.query<{ n: string }[]>(
      'SELECT count(*) AS n FROM email_settings',
    );
    expect(count?.n).toBe('1');
  });

  it('stores only the ciphertext and reads it back', async () => {
    const settings = await repo.get();
    await repo.save({
      ...settings,
      host: 'smtp.example.com',
      port: 587,
      username: 'siem@example.com',
      password: cipher.encrypt(PASSWORD, SMTP_PASSWORD_AAD),
      fromAddress: 'siem@example.com',
      fromName: 'SIEMple',
      enabled: true,
      updatedBy: admin.id,
    });

    const [row] = await AppDataSource.query<Record<string, unknown>[]>(
      'SELECT * FROM email_settings',
    );
    expect(JSON.stringify(row)).not.toContain(PASSWORD);
    expect(row).toMatchObject({ host: 'smtp.example.com', enabled: true, key_version: 1 });

    const stored = await repo.get();
    expect(stored.password).not.toBeNull();
    expect(cipher.decrypt(stored.password!, SMTP_PASSWORD_AAD)).toBe(PASSWORD);
    expect(stored.updatedBy).toBe(admin.id);
  });

  it('clears every password column together', async () => {
    await repo.save({ ...(await repo.get()), password: null, enabled: false });
    const [row] = await AppDataSource.query<Record<string, unknown>[]>(
      'SELECT password_ciphertext, password_iv, password_auth_tag, key_version FROM email_settings',
    );
    expect(row).toEqual({
      password_ciphertext: null,
      password_iv: null,
      password_auth_tag: null,
      key_version: null,
    });
  });

  it('refuses a second row and an unknown security mode', async () => {
    await expect(
      AppDataSource.query('INSERT INTO email_settings (id) VALUES (2)'),
    ).rejects.toThrow();
    await expect(
      AppDataSource.query(`UPDATE email_settings SET security = 'ssl3'`),
    ).rejects.toThrow();
  });
});
