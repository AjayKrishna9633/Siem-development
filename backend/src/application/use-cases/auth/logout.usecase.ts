import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { ILogoutInput, ILogoutUseCase } from '../../interfaces/use-cases/logout.interface.ts';

@injectable()
export class LogoutUseCase implements ILogoutUseCase {
  constructor(@inject(TYPES.SessionService) private readonly sessions: ISessionService) {}

  async execute(input: ILogoutInput): Promise<void> {
    // Logout is idempotent: a missing or expired cookie is already logged out
    if (input.refreshToken) await this.sessions.revoke(input.refreshToken);
  }
}
