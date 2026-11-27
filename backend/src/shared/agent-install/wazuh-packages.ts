import { AgentArch, AgentOs } from '../../domain/enums/AgentOs.ts';

// Verified against documentation.wazuh.com (packages list and agent install pages, 4.14.10).
const PACKAGES_BASE_URL = 'https://packages.wazuh.com';

const DEB_ARCH: Readonly<Record<AgentArch, string>> = {
  [AgentArch.X86_64]: 'amd64',
  [AgentArch.ARM64]: 'arm64',
};

const RPM_ARCH: Readonly<Record<AgentArch, string>> = {
  [AgentArch.X86_64]: 'x86_64',
  [AgentArch.ARM64]: 'aarch64',
};

export const DEFAULT_WAZUH_AGENT_VERSION = '4.14.10';

export const WAZUH_AGENT_PORTS = [1514, 1515] as const;

// An agent with an imported key only ever talks to the manager on this port; 1515 is enrollment.
export const WAZUH_EVENTS_PORT = 1514;

export const WAZUH_WINDOWS_SERVICE = 'WazuhSvc';
export const WAZUH_WINDOWS_INSTALL_DIR = 'C:\\Program Files (x86)\\ossec-agent';
export const WAZUH_LINUX_INSTALL_DIR = '/var/ossec';
export const WAZUH_LINUX_SERVICE = 'wazuh-agent';

const repoFor = (version: string): string => `${PACKAGES_BASE_URL}/${version.split('.')[0]}.x`;

export const wazuhPackageFileName = (os: AgentOs, version: string, arch: AgentArch): string => {
  switch (os) {
    case AgentOs.WINDOWS:
      return `wazuh-agent-${version}-1.msi`;
    case AgentOs.LINUX_DEB:
      return `wazuh-agent_${version}-1_${DEB_ARCH[arch]}.deb`;
    case AgentOs.LINUX_RPM:
      return `wazuh-agent-${version}-1.${RPM_ARCH[arch]}.rpm`;
  }
};

export const wazuhPackageUrl = (os: AgentOs, version: string, arch: AgentArch): string => {
  const file = wazuhPackageFileName(os, version, arch);
  switch (os) {
    case AgentOs.WINDOWS:
      return `${repoFor(version)}/windows/${file}`;
    case AgentOs.LINUX_DEB:
      return `${repoFor(version)}/apt/pool/main/w/wazuh-agent/${file}`;
    case AgentOs.LINUX_RPM:
      return `${repoFor(version)}/yum/${file}`;
  }
};
