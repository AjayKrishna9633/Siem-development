export enum ErrorMessage {
  VALIDATION_ERROR = 'Validation Error',
  INTERNAL_SERVER_ERROR = 'Internal Server Error',
  INVITE_ALREADY_USED_OR_DISABLED = 'Invite already used or user disabled',
  SUPER_ADMIN_ROLE_CANNOT_BE_CHANGED = 'Super admin role cannot be changed',
  SETUP_ALREADY_DONE = 'A Super Admin is already registered. Registration route locked.',
  SETUP_ALREADY_DONE_RACE = 'Setup already completed due to race condition.',
  CHANNEL_NAME_EXISTS = 'Channel name already exists',
}
