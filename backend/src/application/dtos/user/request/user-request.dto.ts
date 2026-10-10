import { UserRole } from '../../../../domain/enums/UserRole.js';

export interface CreateSuperAdminDTO {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  now: Date;
}

export interface CreateInvitedDTO {
  id: string;
  organizationId: string;
  email: string;
  username: string;
  role: Exclude<UserRole, 'super_admin'>;
  invitedById: string;
  now: Date;
}
