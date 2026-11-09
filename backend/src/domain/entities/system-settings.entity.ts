import { DomainError } from '../errors/DomainError.ts';
import { ErrorMessage } from '../enums/ErrorMessage.ts';
import type { IOrganizationDetails, SystemSettingsProps } from '../types/system-settings.types.ts';

export class SystemSettings {
  private constructor(private props: SystemSettingsProps) {}

  static reconstitute(props: SystemSettingsProps): SystemSettings {
    return new SystemSettings({ ...props });
  }

  get isSetupCompleted() {
    return this.props.setupCompleted;
  }
  get setupTokenHash() {
    return this.props.setupTokenHash;
  }
  get setupTokenExpiresAt() {
    return this.props.setupTokenExpiresAt;
  }
  get orgName() {
    return this.props.orgName;
  }
  get baseUrl() {
    return this.props.baseUrl;
  }

  toSnapshot(): Readonly<SystemSettingsProps> {
    return { ...this.props };
  }

  hasLiveSetupToken(now: Date): boolean {
    return (
      this.props.setupTokenHash !== null &&
      this.props.setupTokenExpiresAt !== null &&
      this.props.setupTokenExpiresAt > now
    );
  }

  issueSetupToken(tokenHash: string, expiresAt: Date, now: Date): void {
    this.assertSetupPending();
    this.props.setupTokenHash = tokenHash;
    this.props.setupTokenExpiresAt = expiresAt;
    this.touch(now);
  }

  completeSetup(details: IOrganizationDetails, now: Date): void {
    this.assertSetupPending();
    this.props.setupCompleted = true;
    this.props.setupTokenHash = null;
    this.props.setupTokenExpiresAt = null;
    this.props.orgName = details.orgName;
    this.props.baseUrl = details.baseUrl;
    this.touch(now);
  }

  private assertSetupPending(): void {
    if (this.props.setupCompleted) throw new DomainError(ErrorMessage.SETUP_ALREADY_COMPLETED);
  }

  private touch(now: Date): void {
    this.props.updatedAt = now;
  }
}
