export const LOGIN_LOCKOUT = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCK_MINUTES: 15,
} as const;

export const SETUP_TOKEN_TTL_HOURS = 24;

export const INVITE_TOKEN_TTL_HOURS = 48;
export const RESET_TOKEN_TTL_MINUTES = 30;

export const BCRYPT_COST = 12;
