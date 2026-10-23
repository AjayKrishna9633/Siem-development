// Sample agent fleet until the agent registry API lands

export type AgentStatus = 'active' | 'disconnected' | 'pending' | 'never_connected';
export type OsFamily = 'windows' | 'linux' | 'macos';

export interface IAgent {
  id: string;
  name: string;
  ip: string;
  groups: string[];
  os: string;
  osFamily: OsFamily;
  node: string;
  version: string;
  status: AgentStatus;
  registered: string;
  lastKeepAlive: string;
  cores: number;
  memory: string;
  cpu: string;
  serial: string;
}

const base: Omit<
  IAgent,
  'id' | 'name' | 'ip' | 'groups' | 'os' | 'osFamily' | 'node' | 'version' | 'status'
> = {
  registered: 'Oct 12, 2023',
  lastKeepAlive: '2 minutes ago',
  cores: 8,
  memory: '32 GB',
  cpu: 'Intel i7-12700',
  serial: 'SN-00000000',
};

export const agents: IAgent[] = [
  {
    ...base,
    id: '001',
    name: 'WK-EXEC-021',
    ip: '192.168.1.42',
    groups: ['default'],
    os: 'Microsoft Windows 11 Pro',
    osFamily: 'windows',
    node: 'siemple-node01',
    version: 'v4.3.0',
    status: 'active',
    cores: 16,
    memory: '64 GB',
    cpu: 'Intel i9-12900K',
    serial: 'SN-98721345',
  },
  {
    ...base,
    id: '002',
    name: 'DB-PROD-01',
    ip: '10.0.5.12',
    groups: ['database-nodes'],
    os: 'Ubuntu 22.04.3 LTS',
    osFamily: 'linux',
    node: 'siemple-node02',
    version: 'v4.3.0',
    status: 'disconnected',
    lastKeepAlive: '3 hours ago',
  },
  {
    ...base,
    id: '003',
    name: 'MAC-DEV-JDOE',
    ip: '192.168.2.105',
    groups: ['default'],
    os: 'macOS Sonoma 14.1',
    osFamily: 'macos',
    node: 'siemple-node01',
    version: 'v4.3.0',
    status: 'pending',
    lastKeepAlive: 'never',
  },
  {
    ...base,
    id: '004',
    name: 'WEB-FE-03',
    ip: '10.0.10.33',
    groups: ['web-servers', 'dmz'],
    os: 'Ubuntu 20.04.6 LTS',
    osFamily: 'linux',
    node: 'siemple-node03',
    version: 'v4.2.8',
    status: 'active',
  },
  {
    ...base,
    id: '005',
    name: 'WK-FIN-012',
    ip: '192.168.1.88',
    groups: ['default'],
    os: 'Microsoft Windows 10 Pro',
    osFamily: 'windows',
    node: 'siemple-node01',
    version: 'v4.3.0',
    status: 'active',
  },
  {
    ...base,
    id: '006',
    name: 'WEB-FE-04',
    ip: '10.0.10.34',
    groups: ['web-servers'],
    os: 'Ubuntu 22.04.3 LTS',
    osFamily: 'linux',
    node: 'siemple-node03',
    version: 'v4.3.0',
    status: 'active',
  },
  {
    ...base,
    id: '007',
    name: 'DC-PRIMARY',
    ip: '10.0.0.2',
    groups: ['default'],
    os: 'Microsoft Windows 11 Pro',
    osFamily: 'windows',
    node: 'siemple-node02',
    version: 'v4.3.0',
    status: 'active',
  },
  {
    ...base,
    id: '008',
    name: 'MAC-DES-07',
    ip: '192.168.2.117',
    groups: ['default'],
    os: 'macOS Sonoma 14.1',
    osFamily: 'macos',
    node: 'siemple-node01',
    version: 'v4.3.0',
    status: 'disconnected',
    lastKeepAlive: '1 day ago',
  },
];

export const findAgent = (id: string) =>
  agents.find((a) => a.id === id || a.name.toLowerCase() === id.toLowerCase());
