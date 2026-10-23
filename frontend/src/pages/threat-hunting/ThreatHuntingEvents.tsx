import React from 'react';
import { useSearchParams } from 'react-router';
import { PageHeader, ViewToggle } from '../../components/ui/PageHeader.tsx';
import { SeverityBadge, CodeChip } from '../../components/ui/Badge.tsx';
import {
  EventExplorer,
  type IEventColumn,
  type IHistogramBucket,
} from '../../components/events/EventExplorer.tsx';
import { levelToSeverity } from '../../lib/severity.ts';

interface IHuntEvent {
  id: string;
  time: string;
  agent: string;
  ip: string;
  level: number;
  ruleId: number;
  technique: string;
  description: string;
}

// Sample telemetry until the ingest API lands
const events: IHuntEvent[] = [
  {
    id: 'e1',
    time: 'Aug 18, 18:14:02.123',
    agent: 'WIN-SRV-042',
    ip: '10.0.0.5',
    level: 15,
    ruleId: 92652,
    technique: 'T1565.001',
    description: 'Stored data manipulation detected via scheduled script',
  },
  {
    id: 'e2',
    time: 'Aug 18, 18:12:45.091',
    agent: 'LNX-DMZ-01',
    ip: '192.168.1.105',
    level: 12,
    ruleId: 5712,
    technique: 'T1110',
    description: 'sshd: brute force trying to get access to the system',
  },
  {
    id: 'e3',
    time: 'Aug 18, 18:05:11.772',
    agent: 'WIN-WS-993',
    ip: '10.0.4.52',
    level: 10,
    ruleId: 60122,
    technique: 'T1078.003',
    description: 'Multiple Windows logon failures for local account',
  },
  {
    id: 'e4',
    time: 'Aug 18, 17:55:02.004',
    agent: 'MAC-DEV-22',
    ip: '172.16.0.12',
    level: 5,
    ruleId: 87100,
    technique: 'T1082',
    description: 'System information discovery script executed',
  },
  {
    id: 'e5',
    time: 'Aug 18, 17:42:19.551',
    agent: 'DB-PROD-01',
    ip: '10.0.5.12',
    level: 15,
    ruleId: 31106,
    technique: 'T1190',
    description: 'Web attack returned code 200 (success): SQLi pattern matched',
  },
  {
    id: 'e6',
    time: 'Aug 18, 17:30:05.112',
    agent: 'WIN-SRV-042',
    ip: '10.0.0.5',
    level: 12,
    ruleId: 92213,
    technique: 'T1105',
    description: 'curl downloading payload from external host',
  },
  {
    id: 'e7',
    time: 'Aug 18, 17:15:33.421',
    agent: 'WIN-WS-102',
    ip: '192.168.2.201',
    level: 8,
    ruleId: 60106,
    technique: 'T1053.005',
    description: 'Scheduled task created by non-admin user',
  },
  {
    id: 'e8',
    time: 'Aug 18, 16:59:43.434',
    agent: 'LNX-DMZ-02',
    ip: '10.0.1.19',
    level: 15,
    ruleId: 92900,
    technique: 'T1003.001',
    description: 'LSASS memory access by unsigned process',
  },
  {
    id: 'e9',
    time: 'Aug 18, 16:58:13.553',
    agent: 'WIN-WS-441',
    ip: '10.0.4.77',
    level: 3,
    ruleId: 61104,
    technique: 'T1083',
    description: 'File and directory discovery',
  },
  {
    id: 'e10',
    time: 'Aug 18, 16:56:51.745',
    agent: 'WIN-DC-01',
    ip: '10.0.0.2',
    level: 6,
    ruleId: 61110,
    technique: 'T1046',
    description: 'Network service scanning from domain controller',
  },
];

const histogram: IHistogramBucket[] = Array.from({ length: 24 }, (_, i) => ({
  label: `${String(i).padStart(2, '0')}:00`,
  value: [6, 9, 4, 12, 18, 22, 10, 8, 11, 16, 20, 14, 9, 6, 5, 8, 12, 30, 24, 15, 10, 9, 7, 5][i],
  tone: i === 17 ? 'critical' : i === 18 ? 'high' : 'normal',
}));

const columns: IEventColumn<IHuntEvent>[] = [
  {
    key: 'time',
    header: 'Time',
    className: 'whitespace-nowrap font-mono text-xs text-muted',
    render: (e) => e.time,
  },
  {
    key: 'sev',
    header: 'Severity',
    render: (e) => <SeverityBadge severity={levelToSeverity(e.level)} variant="outline" />,
  },
  {
    key: 'agent',
    header: 'Agent / Host',
    className: 'font-mono text-xs text-accent',
    render: (e) => e.agent,
  },
  { key: 'ip', header: 'Source IP', className: 'font-mono text-xs', render: (e) => e.ip },
  { key: 'tech', header: 'Technique', render: (e) => <CodeChip>{e.technique}</CodeChip> },
  {
    key: 'desc',
    header: 'Description',
    className: 'max-w-[420px] truncate',
    render: (e) => e.description,
  },
];

export const ThreatHuntingEvents: React.FC = () => {
  const [params] = useSearchParams();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-line px-6 py-5">
        <PageHeader
          crumbs={[
            { label: 'Intelligence' },
            { label: 'Threat Hunting', to: '/threat-hunting' },
            { label: 'Events' },
          ]}
          title="Event Search & Investigation"
          description="Search raw security events, pivot across hosts and indicators."
          actions={
            <ViewToggle
              tabs={[
                { label: 'Dashboard', to: '/threat-hunting/dashboard' },
                { label: 'Events', to: '/threat-hunting/events' },
              ]}
            />
          }
        />
      </div>
      <EventExplorer
        rows={events}
        columns={columns}
        getId={(e) => e.id}
        initialQuery={params.get('q') ?? ''}
        searchText={(e) =>
          `${e.agent} ${e.ip} ${e.technique} ${e.description} level:${e.level} manager.name:wazuh-server`
        }
        rowSeverity={(e) => levelToSeverity(e.level)}
        histogram={histogram}
        initialFilters={[{ field: 'manager.name', value: 'wazuh-server' }]}
        fieldCount={712}
        getDocument={(e) => ({
          _id: `hunt-${e.id}`,
          'agent.name': e.agent,
          'agent.ip': e.ip,
          'rule.id': e.ruleId,
          'rule.level': e.level,
          'rule.mitre.id': e.technique,
          'rule.description': e.description,
          timestamp: e.time,
        })}
      />
    </div>
  );
};
