import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import type { IOpaqueTokenService } from '../../interfaces/services/opaque-token.service.interface.ts';
import type { SystemSettings } from '../../../domain/entities/system-settings.entity.ts';
import type { IAuditActor } from '../../../domain/types/audit.types.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AuditOutcome } from '../../../domain/enums/AuditOutcome.ts';
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

export const recordRejectedSetupToken = (audit: IAuditService) =>
  audit.record({
    action: AuditAction.SETUP_TOKEN_USED,
    outcome: AuditOutcome.FAILURE,
    actor: null,
    targetType: AuditTargetType.SYSTEM_SETTINGS,
  });

// The token that opened setup was accepted and spent. Recorded for the admin it created.
export const recordAcceptedSetupToken = (audit: IAuditService, admin: IAuditActor) =>
  audit.record({
    action: AuditAction.SETUP_TOKEN_USED,
    outcome: AuditOutcome.SUCCESS,
    actor: admin,
    targetType: AuditTargetType.SYSTEM_SETTINGS,
  });
