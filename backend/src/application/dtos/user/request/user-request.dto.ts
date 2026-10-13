import { UserRole } from '../../../../domain/enums/UserRole.ts';

export interface ICreateSuperAdminDTO {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  now: Date;
}
export type CreateSuperAdminDTO = ICreateSuperAdminDTO;

export interface ICreateInvitedDTO {
  id: string;
  organizationId: string;
  email: string;
  username: string;
  role: Exclude<UserRole, 'super_admin'>;
  invitedById: string;
  now: Date;
}
export type CreateInvitedDTO = ICreateInvitedDTO;
