import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IRequestContext } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IOpaqueTokenService } from '../../interfaces/services/opaque-token.service.interface.ts';
import type { SystemSettings } from '../../../domain/entities/system-settings.entity.ts';
import { AuditAction } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

export const isSetupTokenValid = (
  settings: SystemSettings,
  token: string,
  tokens: IOpaqueTokenService,
  now: Date,
): boolean =>
  settings.hasLiveSetupToken(now) && tokens.matches(token, settings.setupTokenHash as string);

export const invalidSetupToken = () =>
  new AppError(AppErrorCode.INVALID_SETUP_TOKEN, ErrorMessage.INVALID_SETUP_TOKEN);

export const setupAlreadyCompleted = () =>
  new AppError(AppErrorCode.SETUP_ALREADY_COMPLETED, ErrorMessage.SETUP_ALREADY_COMPLETED);

export const recordRejectedSetupToken = (audit: IAuditLogRepository, context: IRequestContext) =>
  audit.append({ actorUserId: null, action: AuditAction.SETUP_TOKEN_REJECTED, context });
