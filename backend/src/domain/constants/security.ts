// Sign-in lockout: this many wrong passwords in a row pause sign-in for LOCK_MINUTES
export const LOGIN_LOCKOUT = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCK_MINUTES: 15,
} as const;

// First-run setup token: printed to the server log, valid for this long. A restart
// within the window reuses it; after that a new one is printed.
export const SETUP_TOKEN_TTL_HOURS = 24;

// Single-use links. An invite gives the person a couple of days to get to it; a reset
// link is short-lived because it can take over an existing account.
export const INVITE_TOKEN_TTL_HOURS = 48;
export const RESET_TOKEN_TTL_MINUTES = 30;

// bcrypt work factor: 2^12 rounds, roughly 250 ms per hash on a typical server. Hashes
// made with a lower cost are upgraded the next time their owner signs in.
export const BCRYPT_COST = 12;
