import type { RegisterSuperAdminInput } from '../../types/use-case/admin.types.js';

export interface IRegisterSuperAdminUseCase {
  execute(input: RegisterSuperAdminInput): Promise<{ id: string; email: string }>;
}
