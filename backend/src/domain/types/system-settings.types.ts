export interface ISystemSettingsProps {
  setupCompleted: boolean;
  setupTokenHash: string | null;
  setupTokenExpiresAt: Date | null;
  orgName: string | null;
  baseUrl: string | null;
  timezone: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export type SystemSettingsProps = ISystemSettingsProps;

// Entered by the first admin on the setup page
export interface IOrganizationDetails {
  orgName: string;
  baseUrl: string;
  timezone: string;
}
