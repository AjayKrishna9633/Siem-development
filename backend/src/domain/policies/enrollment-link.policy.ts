export const ENROLLMENT_LINK_TTL_MS = 24 * 60 * 60_000;

export const ENROLL_PORT = 8443;

// The link is opened on the agent machine, which already reaches this server at
// WAZUH_PUBLIC_ADDRESS. IPv6 literals need brackets inside a URL.
export const defaultEnrollPublicUrl = (publicAddress: string | undefined): string | undefined => {
  if (!publicAddress) return undefined;
  const host = publicAddress.includes(':') ? `[${publicAddress}]` : publicAddress;
  return `https://${host}:${ENROLL_PORT}`;
};

// The token only ever travels in the path, never in a query string.
export const enrollmentLinkUrl = (publicUrl: string, token: string): string =>
  `${publicUrl.replace(/\/+$/, '')}/e/${token}`;

export const enrollmentLinkExpiry = (now: Date): Date =>
  new Date(now.getTime() + ENROLLMENT_LINK_TTL_MS);

// Additional data for the agent key's encryption: the row it belongs to. The enrollment service
// decrypts with the same value, so a key copied onto another pending agent won't decrypt.
export const agentKeyAad = (pendingAgentId: string): string => `agent-key:${pendingAgentId}`;
