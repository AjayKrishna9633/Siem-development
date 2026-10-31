// Account emails (invitations, reset links, verification codes and "your account changed"
// notices) in the dark SIEMple look. Inline styles only, for Gmail/Outlook.

export interface ISecurityEmailInput {
  // Small uppercase label above the heading, e.g. "Password change"
  eyebrow: string;
  heading: string;
  paragraphs: string[];
  code?: string;
  // A button, e.g. { label: 'Accept invitation', url }; the URL is also printed as text
  // for mail clients that block buttons
  action?: { label: string; url: string };
  // Shown under the code or at the bottom, e.g. "Didn't request this? ..."
  footnote: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const FONT = "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', 'SFMono-Regular', Consolas, 'Courier New', monospace";

export const securityEmailText = (input: ISecurityEmailInput) =>
  [
    input.heading,
    '',
    ...input.paragraphs.flatMap((p) => [p, '']),
    ...(input.code ? [`Your code: ${input.code}`, ''] : []),
    ...(input.action ? [`${input.action.label}: ${input.action.url}`, ''] : []),
    input.footnote,
  ].join('\n');

export const securityEmailHtml = (input: ISecurityEmailInput) => {
  const paragraphs = input.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-family:${FONT};font-size:14px;line-height:22px;color:#94a3b8;">${escapeHtml(p)}</p>`,
    )
    .join('');

  // Digits spaced out so the code is easy to read and retype
  const code = input.code
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 22px;">
        <tr>
          <td style="background:#0b1326;border:1px solid #334155;border-radius:4px;padding:14px 22px;font-family:${MONO};font-size:28px;letter-spacing:10px;color:#adc6ff;">${escapeHtml(input.code)}</td>
        </tr>
      </table>`
    : '';

  const action = input.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px;">
        <tr>
          <td style="border-radius:4px;background:#adc6ff;">
            <a href="${escapeHtml(input.action.url)}" target="_blank" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:14px;font-weight:600;color:#0b1326;text-decoration:none;border-radius:4px;">${escapeHtml(input.action.label)}</a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 18px;font-family:${FONT};font-size:12px;line-height:18px;color:#64748b;word-break:break-all;">Button not working? Open this link: <a href="${escapeHtml(input.action.url)}" target="_blank" style="color:#adc6ff;">${escapeHtml(input.action.url)}</a></p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${escapeHtml(input.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#0b1326;">
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
            <p style="margin:0 0 6px;font-family:${MONO};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;">${escapeHtml(input.eyebrow)}</p>
            <h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:30px;font-weight:600;color:#f8fafc;">${escapeHtml(input.heading)}</h1>
            ${paragraphs}
            ${code}
            ${action}
            <p style="margin:8px 0 0;padding-top:16px;border-top:1px solid #1e293b;font-family:${FONT};font-size:12px;line-height:18px;color:#64748b;">${escapeHtml(input.footnote)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
};
