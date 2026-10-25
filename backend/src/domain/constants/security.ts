// Sign-in lockout: this many wrong passwords in a row pause sign-in for LOCK_MINUTES
export const LOGIN_LOCKOUT = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCK_MINUTES: 15,
} as const;
