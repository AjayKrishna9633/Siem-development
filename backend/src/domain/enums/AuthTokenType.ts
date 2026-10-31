// What a single-use emailed link lets its holder do
export enum AuthTokenType {
  // Accept an invitation: choose a name and password, then sign in
  INVITE = 'invite',
  // Set a new password after "forgot password" or an admin-issued reset link
  RESET = 'reset',
}
