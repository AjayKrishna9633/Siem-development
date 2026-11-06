export const isEmail = (email: string) => /\S+@\S+\.\S+/.test(email.trim());

export const isValidPerson = (name: string, email: string) =>
  name.trim().length >= 2 && isEmail(email);

export const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const isLinkToken = (token: string) => /^[0-9a-f]{64}$/.test(token);

export const personFieldErrors = (name: string, email: string) => ({
  name: name.trim().length < 2 ? 'Enter a name of at least 2 characters.' : undefined,
  email: !email.trim()
    ? 'Enter an email address.'
    : !isEmail(email)
      ? 'Enter a full email address, like name@company.com.'
      : undefined,
});
