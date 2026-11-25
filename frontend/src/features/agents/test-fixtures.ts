import { useAuthStore } from '@/features/auth';
import type { Permission, UserRole } from '@/features/auth';
import type { IAgent, IEnrollCommand } from './types/agent.types.ts';

export const SECRET = 'Aa1-test-enroll_pass.2026';

const PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ['agents.view', 'agents.manage', 'users.manage', 'audit.view'],
  t2_analyst: ['agents.view'],
  t1_analyst: ['agents.view'],
};

export const signInAs = (role: UserRole) =>
  useAuthStore.setState({
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      email: `${role}@example.com`,
      username: role,
      role,
      permissions: PERMISSIONS[role],
    },
    isAuthenticated: true,
    isLoading: false,
  });

export const makeAgent = (overrides: Partial<IAgent> = {}): IAgent => ({
  wazuhId: '007',
  name: 'web-01',
  ip: '192.168.1.50',
  status: 'active',
  os: { name: 'Ubuntu', platform: 'ubuntu', version: '24.04.5 LTS' },
  version: 'v4.14.10',
  groups: ['default'],
  registeredAt: '2026-11-22T10:00:00.000Z',
  lastKeepAliveAt: '2026-11-22T10:01:00.000Z',
  ...overrides,
});

export const makeEnrollCommand = (overrides: Partial<IEnrollCommand> = {}): IEnrollCommand => ({
  os: 'linux-deb',
  arch: 'arm64',
  command: `export WAZUH_REGISTRATION_PASSWORD='${SECRET}'`,
  maskedCommand: "export WAZUH_REGISTRATION_PASSWORD='********'",
  managerAddress: '192.168.1.20',
  ports: [1514, 1515],
  agentVersion: '4.14.10',
  group: 'default',
  agentName: 'web-01',
  requirements: ['Run in a terminal with sudo (or as root)', 'TCP 1514 and 1515 reachable'],
  connectivityCheck: "nc -zv '192.168.1.20' 1514 && nc -zv '192.168.1.20' 1515",
  generatedAt: '2026-11-22T10:00:00.000Z',
  ...overrides,
});
