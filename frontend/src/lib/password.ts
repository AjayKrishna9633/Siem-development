export const PASSWORD_MIN_LENGTH = 12;

export const newPasswordError = (
  password: string,
  confirmation: string,
  minLength = PASSWORD_MIN_LENGTH,
): string | null => {
  if (password.length < minLength) return `Password must be at least ${minLength} characters.`;
  if (password !== confirmation) return "Passwords don't match.";
  return null;
};
