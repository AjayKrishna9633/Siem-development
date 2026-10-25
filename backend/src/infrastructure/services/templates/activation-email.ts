// Activation email in the SIEMple console's dark theme. Gmail and most clients ignore
// <style> blocks and web fonts, so everything is inline styles on tables, and the
// font stack falls back to system fonts.

export interface IActivationEmailInput {
  username: string;
  companyName: string;
  roleTitle: string;
  email: string;
  activationLink: string;
  temporaryPassword: string;
  signInLink: string;
  expiresAt: string;
  // True when this email replaces an earlier activation that has just stopped working
  replacesEarlier: boolean;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatExpiry = (iso: string) => new Date(iso).toUTCString().replace(/:\d{2} GMT$/, ' UTC');

const FONT = "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', 'SFMono-Regular', Consolas, 'Courier New', monospace";

// A resend gets a different subject, so the inbox makes clear which email is the live one
export const activationEmailSubject = (input: IActivationEmailInput) =>
  input.replacesEarlier
    ? `New activation link for your SIEMple account (${input.companyName})`
    : `Activate your SIEMple account for ${input.companyName}`;

const REPLACES_NOTICE =
  'This is a new activation link. Any earlier activation email for this account no longer works, so use this one.';

export const activationEmailText = (input: IActivationEmailInput) =>
  [
    `Hello ${input.username},`,
    '',
    ...(input.replacesEarlier ? [REPLACES_NOTICE, ''] : []),
    `You have been added to ${input.companyName} on SIEMple as ${input.roleTitle}.`,
    '',
    'Activate your account and choose a password:',
    input.activationLink,
    '',
    'If the link doesn\'t work, go to the sign-in page, choose "Activate account" and enter:',
    `  Email: ${input.email}`,
    `  Temporary password: ${input.temporaryPassword}`,
    '',
    `This invitation expires ${formatExpiry(input.expiresAt)}.`,
    "If you weren't expecting this, you can ignore this email.",
  ].join('\n');

export const activationEmailHtml = (input: IActivationEmailInput) => {
  const e = {
    username: escapeHtml(input.username),
    companyName: escapeHtml(input.companyName),
    roleTitle: escapeHtml(input.roleTitle),
    email: escapeHtml(input.email),
    activationLink: escapeHtml(input.activationLink),
    temporaryPassword: escapeHtml(input.temporaryPassword),
    signInLink: escapeHtml(input.signInLink),
    expiresAt: escapeHtml(formatExpiry(input.expiresAt)),
  };

  // Amber callout, the same tone the console uses for warnings
  const replacesNotice = input.replacesEarlier
    ? `<p style="margin:0 0 18px;padding:10px 12px;border:1px solid #eab30866;border-radius:4px;background:#eab3081a;font-family:${FONT};font-size:13px;line-height:20px;color:#f8fafc;">${REPLACES_NOTICE}</p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>Activate your SIEMple account</title>
</head>
<body style="margin:0;padding:0;background:#0b1326;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${input.replacesEarlier ? REPLACES_NOTICE : `You've been added to ${e.companyName} as ${e.roleTitle}. Activate your account to sign in.`}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1326;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
        <tr>
          <td style="padding:0 4px 20px;font-family:${FONT};font-size:18px;font-weight:600;color:#adc6ff;letter-spacing:-0.2px;">
            &#9634;&nbsp;SIEMple
          </td>
        </tr>
        <tr>
          <td style="background:#131b2e;border:1px solid #334155;border-radius:6px;padding:32px 28px;">
            <p style="margin:0 0 6px;font-family:${MONO};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;">${input.replacesEarlier ? 'New activation link' : 'Account activation'}</p>
            <h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:30px;font-weight:600;color:#f8fafc;">Welcome to ${e.companyName}, ${e.username}</h1>
            ${replacesNotice}
            <p style="margin:0 0 24px;font-family:${FONT};font-size:14px;line-height:22px;color:#94a3b8;">
              You've been added as <strong style="color:#f8fafc;font-weight:600;">${e.roleTitle}</strong>.
              Activate your account and choose a password &mdash; you'll be signed in straight away.
            </p>

            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-radius:4px;background:#adc6ff;">
                  <a href="${e.activationLink}" target="_blank" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:14px;font-weight:600;color:#0b1326;text-decoration:none;border-radius:4px;">Activate account</a>
                </td>
              </tr>
            </table>

            <p style="margin:28px 0 10px;font-family:${FONT};font-size:13px;line-height:20px;color:#94a3b8;">
              Button not working? On the <a href="${e.signInLink}" target="_blank" style="color:#adc6ff;text-decoration:underline;">activation page</a>, enter:
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1326;border:1px solid #334155;border-radius:4px;">
              <tr>
                <td style="padding:12px 14px 4px;font-family:${MONO};font-size:10px;letter-spacing:0.5px;text-transform:uppercase;color:#64748b;">Email</td>
              </tr>
              <tr>
                <td style="padding:0 14px 10px;font-family:${MONO};font-size:14px;color:#f8fafc;">${e.email}</td>
              </tr>
              <tr>
                <td style="padding:6px 14px 4px;border-top:1px solid #1e293b;font-family:${MONO};font-size:10px;letter-spacing:0.5px;text-transform:uppercase;color:#64748b;">Temporary password</td>
              </tr>
              <tr>
                <td style="padding:0 14px 12px;font-family:${MONO};font-size:16px;letter-spacing:1px;color:#adc6ff;">${e.temporaryPassword}</td>
              </tr>
            </table>

            <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #1e293b;font-family:${FONT};font-size:12px;line-height:18px;color:#64748b;">
              This invitation expires ${e.expiresAt}. If you weren't expecting it, you can ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 4px 0;font-family:${FONT};font-size:11px;line-height:16px;color:#64748b;">
            Sent by SIEMple on behalf of ${e.companyName}.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
};
