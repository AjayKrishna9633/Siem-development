import React from 'react';
import { Link } from 'react-router';
import { ArrowRight, LayoutGrid, ListTree } from 'lucide-react';
import { HubLayout } from '../../components/ui/Hub.tsx';
import { RingGauge } from '../../components/ui/RingGauge.tsx';
import { Tag } from '../../components/ui/Badge.tsx';
import { SvgIcon } from '../../components/ui/Misc.tsx';
import { cn } from '../../lib/cn.ts';
import intelIcon from '../../assets/icons/nav-intel.svg';

interface IMitreCardProps {
  to: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  stat: { label: string; value: string; right?: { label: string; value: string } };
  tags: string[];
  cta: string;
  children: React.ReactNode;
}

const MitreCard: React.FC<IMitreCardProps> = ({
  to,
  title,
  icon,
  description,
  stat,
  tags,
  cta,
  children,
}) => (
  <Link
    to={to}
    className="group flex flex-col rounded-md border border-line-strong/70 bg-raised/70 p-5 transition-colors hover:border-accent/50"
  >
    <div className="flex items-start justify-between">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
        {icon}
        {title}
      </h2>
      <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
    </div>
    <p className="mt-1 text-sm text-muted">{description}</p>
    <div className="flex min-h-[170px] flex-1 items-center justify-center py-6">{children}</div>
    <div className="flex items-end justify-between rounded border border-line-strong bg-canvas/70 px-3 py-2.5">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.5px] text-muted">{stat.label}</p>
        <p className="text-sm font-medium text-ink">{stat.value}</p>
      </div>
      {stat.right && (
        <div className="text-right">
          <p className="font-mono text-[9px] uppercase tracking-[0.5px] text-muted">
            {stat.right.label}
          </p>
          <p className="font-mono text-sm text-accent">{stat.right.value}</p>
        </div>
      )}
    </div>
    <div className="mt-4 flex items-center justify-between border-t border-line-strong pt-4">
      <div className="flex gap-2">
        {tags.map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </div>
      <span className="text-sm text-accent">{cta}</span>
    </div>
  </Link>
);

const heat = [3, 1, 2, 1, 1, 4, 1, 3, 2, 1, 3, 1, 1, 2, 1, 4];
const recentTechniques = [
  { id: 'T1003.001', name: 'LSASS Memory', host: 'WIN-SVR-01', ago: '2m', tone: 'bg-critical' },
  { id: 'T1059.001', name: 'PowerShell', host: 'LNX-DB-PROD', ago: '14m', tone: 'bg-high' },
  { id: 'T1110', name: 'Brute Force', host: 'WKSTN-7742', ago: '41m', tone: 'bg-high' },
  { id: 'T1565.001', name: 'Stored Data', host: 'WIN-SVR-02', ago: '1h', tone: 'bg-high' },
];

export const MitreHub: React.FC = () => (
  <HubLayout
    title="MITRE ATT&CK Hub"
    description="Select a module below to view attacker technique activity across the environment, or search and investigate the raw events behind each detection."
    crumbs={[{ label: 'Intelligence' }, { label: 'MITRE ATT&CK' }]}
  >
    <div className="grid gap-6 md:grid-cols-2">
      <MitreCard
        to="/mitre/dashboard"
        title="Overview Dashboard"
        icon={<LayoutGrid className="size-5" />}
        description="High-level KPIs, technique volume trends, and top tactics."
        stat={{
          label: '24h volume',
          value: '2,120 Mapped Events',
          right: { label: 'Top technique', value: 'T1565.001' },
        }}
        tags={['KPIs', 'Trends']}
        cta="View Dashboard"
      >
        <RingGauge size={140} stroke={8} dashed>
          <span className="text-2xl font-semibold text-ink">6 of 14</span>
          <span className="text-xs text-muted">Tactics observed</span>
        </RingGauge>
      </MitreCard>

      <MitreCard
        to="/mitre/intelligence"
        title="Threat Intelligence"
        icon={<SvgIcon src={intelIcon} width={20} height={19} />}
        description="Correlate observed techniques against known threat actor groups and campaigns."
        stat={{ label: 'Best match', value: 'APT29 — 70% TTP Overlap' }}
        tags={['Actor matching', 'Campaign overlap']}
        cta="View Intelligence"
      >
        <SvgIcon src={intelIcon} width={64} height={61} className="text-muted/70" />
      </MitreCard>

      <MitreCard
        to="/mitre/framework"
        title="Attack Framework"
        icon={<LayoutGrid className="size-5" />}
        description="View the full technique heatmap and tactic activity timeline."
        stat={{ label: 'Most active tactic', value: 'Defense Evasion' }}
        tags={['Heatmap', 'Timeline']}
        cta="View Framework"
      >
        <div className="grid grid-cols-4 gap-1.5">
          {heat.map((h, i) => (
            <span
              key={i}
              className={cn(
                'size-6 rounded-sm',
                ['bg-raised', 'bg-line-strong', 'bg-subtle/70', 'bg-muted/70'][h - 1],
              )}
            />
          ))}
        </div>
      </MitreCard>

      <Link
        to="/mitre/events"
        className="group flex flex-col rounded-md border border-line-strong/70 bg-surface p-5 transition-colors hover:border-accent/50"
      >
        <div className="flex items-start justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <ListTree className="size-4" /> Technique Events
          </h2>
          <ArrowRight className="size-4 text-muted group-hover:text-accent" />
        </div>
        <p className="mt-1 text-xs text-muted">
          Search and investigate the raw events behind each technique detection, with full rule and
          host context.
        </p>
        <ul className="mt-5 space-y-2">
          {recentTechniques.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded border border-line-strong bg-canvas/50 px-3 py-2 font-mono text-[11px]"
            >
              <span className={cn('h-3 w-0.5', t.tone)} />
              <span className="w-20 text-ink">{t.id}</span>
              <span className="flex-1 font-sans text-muted">{t.name}</span>
              <span className="w-28 text-muted">{t.host}</span>
              <span className="w-8 text-right text-subtle">{t.ago}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between rounded border border-line-strong bg-canvas/50 px-3 py-2 font-mono text-[11px]">
          <span>
            <span className="block text-[9px] uppercase text-muted">Event volume</span>8,412 mapped
            · 24h
          </span>
          <span className="text-right">
            <span className="block text-[9px] uppercase text-muted">Unmapped</span>1.4%
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Tag>Raw events</Tag>
            <Tag>Search</Tag>
          </div>
          <span className="text-sm text-ink">View Events</span>
        </div>
      </Link>
    </div>
  </HubLayout>
);
