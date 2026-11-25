import type { AgentArch, AgentOs, AgentStatus } from '../types/agent.types.ts';

// Same rule as the server, which rejects anything else.
export const AGENT_IDENTIFIER_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
export const AGENT_NAME_RULE = 'Letters, digits, dots, hyphens and underscores only (1 to 64).';

export const ENROLLMENT_POLL_MS = 5_000;
export const ENROLLMENT_TIMEOUT_MS = 120_000;

export const DEFAULT_GROUP = 'default';

export const OS_OPTIONS: readonly { value: AgentOs; label: string; detail: string }[] = [
  { value: 'windows', label: 'Windows', detail: 'MSI, PowerShell as Administrator' },
  { value: 'linux-deb', label: 'Linux (DEB)', detail: 'Debian, Ubuntu' },
  { value: 'linux-rpm', label: 'Linux (RPM)', detail: 'RHEL, Rocky, Alma, Fedora' },
];

export const ARCH_OPTIONS: readonly AgentArch[] = ['x86_64', 'arm64'];

export const SHELL_LABEL: Readonly<Record<AgentOs, string>> = {
  windows: 'Windows PowerShell, run as Administrator',
  'linux-deb': 'Terminal (asks for your sudo password)',
  'linux-rpm': 'Terminal (asks for your sudo password)',
};

export const STATUS_LABEL: Readonly<Record<AgentStatus, string>> = {
  active: 'Active',
  disconnected: 'Disconnected',
  pending: 'Pending',
  never_connected: 'Never connected',
};

export const TROUBLESHOOTING: readonly { title: string; detail: string }[] = [
  {
    title: 'Ports blocked',
    detail:
      'The agent needs TCP 1514 and 1515 on the SIEMple server. A firewall, or Wi-Fi with client isolation (common on guest and office networks), blocks them. Run the connectivity check above from the agent machine.',
  },
  {
    title: 'Not run as administrator',
    detail:
      'On Windows, open PowerShell with "Run as administrator". On Linux, run the command in a terminal where you can use sudo.',
  },
  {
    title: 'An old agent is installed',
    detail:
      'The command stops if a Wazuh agent is already there. Uninstall it first (Windows: Apps > Wazuh Agent > Uninstall; Linux: sudo apt-get purge wazuh-agent or sudo dnf remove wazuh-agent), then run the command again.',
  },
  {
    title: 'Wrong server address',
    detail:
      'The command connects to the address in WAZUH_PUBLIC_ADDRESS. If the agent machine reaches this server by another IP or name, change that setting and generate a new command.',
  },
];
