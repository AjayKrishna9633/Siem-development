import dashboardIcon from '../../assets/icons/nav-dashboard.svg';
import alertsIcon from '../../assets/icons/nav-alerts.svg';
import threatIcon from '../../assets/icons/nav-threat.svg';
import malwareIcon from '../../assets/icons/nav-malware.svg';
import mitreIcon from '../../assets/icons/nav-mitre.svg';
import usersIcon from '../../assets/icons/nav-users.svg';
import agentsIcon from '../../assets/icons/nav-agents.svg';
import deployIcon from '../../assets/icons/nav-deploy.svg';
import configIcon from '../../assets/icons/nav-config.svg';
import vulnIcon from '../../assets/icons/nav-vulnerability.svg';
import logsIcon from '../../assets/icons/nav-logs.svg';
import intelIcon from '../../assets/icons/nav-intel.svg';
import type { UserRole } from '../../types/auth.ts';
import { ADMIN_ROLES as ADMINS } from '../../lib/roles.ts';

export interface INavIcon {
  src: string;
  width: number;
  height: number;
}

export interface INavItem {
  label: string;
  to: string;
  icon: INavIcon | 'fim' | 'compliance';
  roles?: UserRole[];
}

export interface INavGroup {
  id: string;
  label: string;
  items: INavItem[];
}

// Icon sizes come straight from the Figma SideNavBar component
export const navGroups: INavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: { src: dashboardIcon, width: 15, height: 15 } },
      { label: 'Alerts', to: '/alerts', icon: { src: alertsIcon, width: 18.3, height: 15.8 } },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    items: [
      {
        label: 'Threat Hunting',
        to: '/threat-hunting',
        icon: { src: threatIcon, width: 16.7, height: 16.7 },
      },
      { label: 'MITRE ATT&CK', to: '/mitre', icon: { src: mitreIcon, width: 15, height: 15 } },
      {
        label: 'Threat Intel',
        to: '/mitre/intelligence',
        icon: { src: intelIcon, width: 20, height: 19.2 },
      },
    ],
  },
  {
    id: 'endpoint',
    label: 'Endpoint Security',
    items: [
      {
        label: 'Malware Detection',
        to: '/malware',
        icon: { src: malwareIcon, width: 13.3, height: 16.7 },
      },
      { label: 'File Integrity', to: '/fim', icon: 'fim' },
      {
        label: 'Configuration',
        to: '/configuration',
        icon: { src: configIcon, width: 16.7, height: 15 },
      },
      {
        label: 'Vulnerabilities',
        to: '/vulnerabilities',
        icon: { src: vulnIcon, width: 16.7, height: 16.7 },
      },
    ],
  },
  {
    id: 'environment',
    label: 'Environment',
    items: [
      { label: 'Agents', to: '/agents', icon: { src: agentsIcon, width: 16.7, height: 13.3 } },
      {
        label: 'Deploy Agent',
        to: '/agents/deploy',
        icon: { src: deployIcon, width: 15.5, height: 15.8 },
        roles: ADMINS,
      },
      { label: 'Log Explorer', to: '/logs', icon: { src: logsIcon, width: 13.3, height: 16.7 } },
      { label: 'Compliance', to: '/compliance', icon: 'compliance' },
      {
        label: 'Users',
        to: '/settings/users',
        icon: { src: usersIcon, width: 18.3, height: 13.3 },
        roles: ADMINS,
      },
    ],
  },
];
