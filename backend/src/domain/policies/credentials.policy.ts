// bcrypt only reads the first 72 bytes, so anything longer would be silently truncated
export const PASSWORD_MAX_BYTES = 72;
// Every account can reach security data, so one long minimum applies to all roles
export const PASSWORD_MIN_LENGTH = 12;

// Emails are compared and stored in this one form
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
