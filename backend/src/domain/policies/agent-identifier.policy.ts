export const AGENT_IDENTIFIER_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

// Safe unquoted in msiexec arguments and inside single quotes in PowerShell and bash.
export const ENROLLMENT_PASSWORD_PATTERN = /^[A-Za-z0-9\-_.:@+=!#,]{20,128}$/;

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const IPV4_OCTET = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const HOSTNAME_LABEL = /^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const IPV6_GROUP = /^[0-9A-Fa-f]{1,4}$/;

export const isAgentIdentifier = (value: string): boolean => AGENT_IDENTIFIER_PATTERN.test(value);

export const isEnrollmentPassword = (value: string): boolean =>
  ENROLLMENT_PASSWORD_PATTERN.test(value);

export const isIPv4 = (value: string): boolean => {
  const parts = value.split('.');
  return parts.length === 4 && parts.every((p) => IPV4_OCTET.test(p));
};

export const isIPv6 = (value: string): boolean => {
  if (!value.includes(':') || value.split('::').length > 2) return false;
  let groups = value.split(':');
  let required = 8;
  const last = groups[groups.length - 1] ?? '';
  if (last.includes('.')) {
    if (!isIPv4(last)) return false;
    groups = groups.slice(0, -1);
    required = 6;
  }
  if (value.includes('::')) {
    const filled = groups.filter((g) => g !== '');
    return filled.length < required && filled.every((g) => IPV6_GROUP.test(g));
  }
  return groups.length === required && groups.every((g) => IPV6_GROUP.test(g));
};

export const isHostname = (value: string): boolean => {
  if (value.length > 253) return false;
  const labels = value.split('.');
  if (labels.every((l) => /^\d+$/.test(l))) return false;
  return labels.every((l) => HOSTNAME_LABEL.test(l));
};

export const isHostAddress = (value: string): boolean =>
  isIPv4(value) || isIPv6(value) || isHostname(value);

export const normalizeVersion = (value: string): string | null => {
  const version = value.trim().replace(/^v/i, '');
  return VERSION_PATTERN.test(version) ? version : null;
};

// The manager's own version when known, so an agent is never newer than the manager.
export const resolveAgentVersion = (managerVersion: string | null, fallback: string): string => {
  const manager = managerVersion === null ? null : normalizeVersion(managerVersion);
  return manager ?? fallback;
};
