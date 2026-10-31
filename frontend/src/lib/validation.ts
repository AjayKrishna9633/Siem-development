// Loose shape check; the backend does the real validation
export const isEmail = (email: string) => /\S+@\S+\.\S+/.test(email.trim());

// Same minimums the backend enforces for a person being onboarded
export const isValidPerson = (name: string, email: string) =>
  name.trim().length >= 2 && isEmail(email);

// User IDs are UUIDs, matching the backend's route checks
export const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// Invite and reset links carry 64 lowercase hex characters (the backend's LINK_TOKEN_PATTERN)
export const isLinkToken = (token: string) => /^[0-9a-f]{64}$/.test(token);

// Inline messages for a name + email pair; a missing key means that field is fine
export const personFieldErrors = (name: string, email: string) => ({
  name: name.trim().length < 2 ? 'Enter a name of at least 2 characters.' : undefined,
  email: !email.trim()
    ? 'Enter an email address.'
    : !isEmail(email)
      ? 'Enter a full email address, like name@company.com.'
      : undefined,
});
