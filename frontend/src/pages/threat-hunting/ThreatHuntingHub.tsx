import React from 'react';
import { History, LineChart, Search } from 'lucide-react';
import { HubCard, HubLayout } from '../../components/ui/Hub.tsx';
import { RingGauge } from '../../components/ui/RingGauge.tsx';

export const ThreatHuntingHub: React.FC = () => (
  <HubLayout
    title="Threat Hunting Hub"
    description="Select a module below to review alert trends and MITRE technique activity, or search and investigate raw security events directly."
    crumbs={[{ label: 'Intelligence' }, { label: 'Threat Hunting' }]}
  >
    <div className="grid gap-6 md:grid-cols-2">
      <HubCard
        to="/threat-hunting/dashboard"
        centered={false}
        title="Threat Overview Dashboard"
        description="View alert-level trends, top MITRE ATT&CK techniques, and top source hosts."
        tags={['Trends', 'MITRE ATT&CK']}
        badge={
          <span className="flex size-8 items-center justify-center rounded-sm bg-line-strong text-accent">
            <LineChart className="size-4" />
          </span>
        }
        visual={
          <div className="flex w-full items-center gap-6 rounded border border-line bg-canvas/70 px-5 py-4">
            <RingGauge size={56} stroke={5} percent={78} color="#3b82f6">
              <span className="text-xs text-ink">78%</span>
            </RingGauge>
            <div className="space-y-1">
              <p className="text-sm text-muted">2,642 Total Events (24h)</p>
              <p className="flex items-center gap-2 text-critical">
                <span className="size-1.5 rounded-full bg-critical" /> 1 Critical Alert
              </p>
            </div>
          </div>
        }
      />
      <HubCard
        to="/threat-hunting/events"
        centered={false}
        title="Event Search & Investigation"
        description="Search raw events, pivot across hosts and indicators, and save hunt queries."
        tags={['Raw search', 'Saved hunts']}
        badge={
          <span className="flex size-8 items-center justify-center rounded-sm bg-line-strong text-ink">
            <Search className="size-4" />
          </span>
        }
        visual={
          <div className="w-full space-y-3 rounded border border-line bg-canvas px-4 py-3 font-mono text-xs">
            <p className="flex items-center gap-1.5 border-b border-line pb-2 text-[10px] text-muted">
              <History className="size-3" /> Recent query
            </p>
            <p className="text-accent">&gt; search index=auth action=failure host=10.0.0.5</p>
            <p className="flex justify-between text-[11px] text-muted">
              <span>Failed logins — 10.0.0.5</span>
              <span>2m ago</span>
            </p>
          </div>
        }
      />
    </div>
  </HubLayout>
);
