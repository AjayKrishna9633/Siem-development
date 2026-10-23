import React from 'react';
import { Link } from 'react-router';
import { HubCard, HubLayout } from '../../components/ui/Hub.tsx';
import { RingGauge } from '../../components/ui/RingGauge.tsx';
import { SeverityBadge } from '../../components/ui/Badge.tsx';
import { MonoLabel } from '../../components/ui/Panel.tsx';

const logLines = [
  {
    tone: 'text-low',
    text: '[INFO] 2023-10-27T08:14:02Z - FIM_AGENT_START - Agent initialized successfully.',
  },
  {
    tone: 'text-critical',
    text: '[ALERT] 2023-10-27T08:15:11Z - REG_MODIFIED - HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run - Hash mismatch detected.',
  },
  { tone: 'text-subtle', text: '  Prior SHA256: 8d4f...  New SHA256: c4a9...' },
  {
    tone: 'text-medium',
    text: '[WARN] 2023-10-27T08:16:45Z - FILE_DELETED - /etc/shadow.bak - unauthorized access attempt.',
  },
];

export const FimHub: React.FC = () => (
  <HubLayout
    title="File Integrity Monitoring Hub"
    description="Select a module below to review integrity posture or investigate raw file and registry change events across the infrastructure."
    footer={
      <div className="border-t border-line pt-8">
        <MonoLabel>Most recent violation</MonoLabel>
        <Link
          to="/fim/events"
          className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded border border-line bg-surface px-4 py-3 hover:border-accent/40"
        >
          <div className="flex flex-wrap gap-10">
            <div>
              <MonoLabel className="text-[9px]">Timestamp</MonoLabel>
              <p className="text-ink">10:42:15</p>
            </div>
            <div>
              <MonoLabel className="text-[9px]">Host</MonoLabel>
              <p className="text-ink">srv-web-01</p>
            </div>
            <div>
              <MonoLabel className="text-[9px]">File path</MonoLabel>
              <p className="font-mono text-ink">/etc/shadow</p>
            </div>
          </div>
          <SeverityBadge severity="critical" />
        </Link>
      </div>
    }
  >
    <div className="grid gap-6 md:grid-cols-2">
      <HubCard
        to="/fim/dashboard"
        centered={false}
        title="Integrity Posture Dashboard"
        description="View trend charts, action-type and rule-type breakdowns, and top hosts/users/paths."
        tags={['Trends', 'Rule breakdown']}
        visual={
          <div className="flex w-full justify-center">
            <RingGauge size={100} stroke={9} percent={94} color="#3b82f6">
              <span className="text-lg text-ink">94%</span>
            </RingGauge>
          </div>
        }
      />
      <HubCard
        to="/fim/events"
        centered={false}
        title="Event Forensics"
        description="Investigate raw file/registry change events, hash diffs, and process lineage."
        tags={['Raw events', 'Diff & lineage']}
        badge={
          <span className="rounded-full bg-critical px-2 py-0.5 font-mono text-[10px] uppercase text-white">
            47 critical
          </span>
        }
        visual={
          <div className="w-full overflow-hidden rounded border border-line bg-canvas p-3 font-mono text-[10px] leading-4">
            <p className="mb-2 border-b border-line pb-1.5 text-muted">syslog/events.log</p>
            {logLines.map((l) => (
              <p key={l.text} className={`truncate ${l.tone}`}>
                {l.text}
              </p>
            ))}
          </div>
        }
      />
    </div>
  </HubLayout>
);
