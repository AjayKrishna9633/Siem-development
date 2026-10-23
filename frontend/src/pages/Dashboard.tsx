import React from 'react';
import { Link } from 'react-router';
import { Panel, FloatingLabel, SectionDivider } from '../components/ui/Panel.tsx';
import { RingGauge } from '../components/ui/RingGauge.tsx';
import { SvgIcon } from '../components/ui/Misc.tsx';
import { useAuthStore } from '../store/auth.store.ts';
import configIcon from '../assets/icons/card-config.svg';
import malwareIcon from '../assets/icons/card-malware.svg';
import fimIcon from '../assets/icons/card-fim.svg';
import threatIcon from '../assets/icons/card-threat.svg';
import vulnIcon from '../assets/icons/card-vulnerability.svg';
import mitreIcon from '../assets/icons/card-mitre.svg';

// Sample telemetry until the ingest API lands
const agents = { active: 1, disconnected: 0 };

const severityTiles = [
  { label: 'Critical severity', value: 110, rule: 'Rule level 15+', color: 'text-critical' },
  { label: 'High severity', value: 395, rule: 'Rule level 12-14', color: 'text-high' },
  { label: 'Medium severity', value: 1691, rule: 'Rule level 7-11', color: 'text-low' },
  { label: 'Low severity', value: 4466, rule: 'Rule level 0-6', color: 'text-accent' },
];

interface IModuleCard {
  title: string;
  description: string;
  to: string;
  icon: { src: string; width: number; height: number; tone: string };
}

const endpointModules: IModuleCard[] = [
  {
    title: 'Configuration Assessment',
    description: 'Scan your assets as part of a configuration assessment audit.',
    to: '/configuration',
    icon: { src: configIcon, width: 23.3, height: 21, tone: 'text-accent' },
  },
  {
    title: 'Malware Detection',
    description: 'Check indicators of compromise triggered by malware infections or cyberattacks.',
    to: '/malware',
    icon: { src: malwareIcon, width: 23.4, height: 23.4, tone: 'text-accent' },
  },
  {
    title: 'File Integrity Monitoring',
    description: 'Alerts related to file changes including permissions, content, and ownership.',
    to: '/fim',
    icon: { src: fimIcon, width: 18.7, height: 23.3, tone: 'text-accent' },
  },
];

const intelligenceModules: IModuleCard[] = [
  {
    title: 'Threat Hunting',
    description:
      'Browse through your security alerts, identifying issues and threats in your environment.',
    to: '/threat-hunting',
    icon: { src: threatIcon, width: 23.3, height: 23.3, tone: 'text-ink' },
  },
  {
    title: 'Vulnerability Detection',
    description:
      'Discover what applications in your environment are affected by well-known vulnerabilities.',
    to: '/vulnerabilities',
    icon: { src: vulnIcon, width: 18.7, height: 23.3, tone: 'text-ink' },
  },
  {
    title: 'MITRE ATT&CK',
    description:
      'Explore security alerts mapped to adversary tactics and techniques for better threat understanding.',
    to: '/mitre',
    icon: { src: mitreIcon, width: 21, height: 21, tone: 'text-ink' },
  },
];

const ModuleGrid: React.FC<{ label: string; modules: IModuleCard[] }> = ({ label, modules }) => (
  <div className="space-y-4">
    <SectionDivider label={label} />
    <div className="grid gap-4 md:grid-cols-3">
      {modules.map((m) => (
        <Link
          key={m.to}
          to={m.to}
          className="group flex flex-col gap-3 rounded border border-line bg-surface p-5 transition-colors hover:border-accent/40 hover:bg-raised/50"
        >
          <div className="flex items-center gap-3">
            <SvgIcon
              src={m.icon.src}
              width={m.icon.width}
              height={m.icon.height}
              className={m.icon.tone}
            />
            <h3 className="text-base font-semibold text-ink group-hover:text-accent">{m.title}</h3>
          </div>
          <p className="text-[15px] leading-[26px] text-muted">{m.description}</p>
        </Link>
      ))}
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const total = agents.active + agents.disconnected;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6 px-6 pb-10 pt-14">
      <div className="sr-only">
        <h1>Command dashboard</h1>
        <p>Signed in as {user?.username}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="p-4">
          <FloatingLabel>Agents summary</FloatingLabel>
          <Link to="/agents" className="flex items-center justify-center gap-8 pb-4 pt-6">
            <RingGauge size={128} stroke={12} dashed color="#adc6ff">
              <span className="text-base text-ink">{total}</span>
              <span className="font-mono text-[10px] uppercase text-muted">Total</span>
            </RingGauge>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-ink">
                <span className="size-3 rounded-full bg-accent" /> Active ({agents.active})
              </li>
              <li className="flex items-center gap-2 text-muted">
                <span className="size-3 rounded-full bg-critical" /> Disconnected (
                {agents.disconnected})
              </li>
            </ul>
          </Link>
        </Panel>

        <Panel className="p-4 lg:col-span-2">
          <FloatingLabel>Last 24 hours alerts</FloatingLabel>
          <div className="grid grid-cols-2 gap-4 pb-5 pt-9 md:grid-cols-4">
            {severityTiles.map((tile) => (
              <Link
                key={tile.label}
                to="/threat-hunting/dashboard"
                className="flex flex-col items-center rounded-sm py-2 transition-colors hover:bg-raised/50"
              >
                <span className="pb-1 text-ink">{tile.label}</span>
                <span className={`pb-1 text-3xl font-bold ${tile.color}`}>
                  {tile.value.toLocaleString()}
                </span>
                <span className="font-mono text-[10px] uppercase text-muted">{tile.rule}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-8 pt-4">
        <ModuleGrid label="Endpoint security" modules={endpointModules} />
        <ModuleGrid label="Intelligence" modules={intelligenceModules} />
      </div>
    </div>
  );
};
