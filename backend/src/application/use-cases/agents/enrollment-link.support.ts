import type { ISecretCipher } from '../../interfaces/services/secret-cipher.service.interface.ts';
import type { IEnrollmentLinkConfig } from '../../types/use-case/agent.types.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

// What every new link needs before anything is registered in Wazuh: the address the agent
// connects to, where the link points, and the key that encrypts the agent's Wazuh key.
export const assertEnrollmentLinksConfigured = (
  config: IEnrollmentLinkConfig,
  cipher: ISecretCipher,
): { publicUrl: string; managerAddress: string } => {
  const { publicUrl, managerAddress } = config;
  if (!managerAddress) {
    throw new AppError(
      AppErrorCode.AGENT_ENROLLMENT_NOT_CONFIGURED,
      ErrorMessage.WAZUH_PUBLIC_ADDRESS_MISSING,
    );
  }
  if (!publicUrl) {
    throw new AppError(
      AppErrorCode.AGENT_ENROLLMENT_NOT_CONFIGURED,
      ErrorMessage.ENROLL_PUBLIC_URL_MISSING,
    );
  }
  if (!cipher.available) {
    throw new AppError(
      AppErrorCode.AGENT_ENROLLMENT_NOT_CONFIGURED,
      ErrorMessage.ENROLL_KEY_SECRET_MISSING,
    );
  }
  return { publicUrl, managerAddress };
};
