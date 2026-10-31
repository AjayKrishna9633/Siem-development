// Sign-in lockout: this many wrong passwords in a row pause sign-in for LOCK_MINUTES
export const LOGIN_LOCKOUT = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCK_MINUTES: 15,
} as const;

// First-run setup token: printed to the server log, valid for this long. A restart
// within the window reuses it; after that a new one is printed.
export const SETUP_TOKEN_TTL_HOURS = 24;
