import React from 'react';
import { useSearchParams } from 'react-router';
import { SeverityBadge, CodeChip } from '../../components/ui/Badge.tsx';
import {
  EventExplorer,
  type IEventColumn,
  type IHistogramBucket,
} from '../../components/events/EventExplorer.tsx';
import type { Severity } from '../../lib/severity.ts';
import { MitreHeader } from './MitreHeader.tsx';

interface IMitreEvent {
  id: string;
  time: string;
  severity: Severity;
  agent: string;
  technique: string;
  tactic: string;
  description: string;
}

// Sample telemetry until the ingest API lands
const raw: [string, Severity, string, string, string, string][] = [
  [
    'Aug 18, 18:14:02.123',
    'critical',
    'WIN-SRV-042',
    'T1565.001',
    'Impact',
    'Data Manipulation: Stored Data Manipulation detected via scheduled script',
  ],
  [
    'Aug 18, 18:12:45.091',
    'high',
    'LNX-DMZ-01',
    'T1059.004',
    'Execution',
    'Command and Scripting Interpreter: Unix Shell suspicious sequence',
  ],
  [
    'Aug 18, 18:05:11.772',
    'medium',
    'WIN-WS-993',
    'T1078.003',
    'Defense Evasion',
    'Valid Accounts: Local Accounts multiple failed logins',
  ],
  [
    'Aug 18, 17:55:02.004',
    'low',
    'MAC-DEV-22',
    'T1082',
    'Discovery',
    'System Information Discovery script executed',
  ],
  [
    'Aug 18, 17:42:19.551',
    'critical',
    'DB-PROD-01',
    'T1190',
    'Initial Access',
    'Exploit Public-Facing Application: SQLi pattern matched',
  ],
  [
    'Aug 18, 17:30:05.112',
    'high',
    'WIN-SRV-042',
    'T1105',
    'Command and Control',
    'Ingress Tool Transfer: curl downloading suspicious payload',
  ],
  [
    'Aug 18, 17:15:33.421',
    'medium',
    'WIN-WS-102',
    'T1053.005',
    'Execution',
    'Scheduled Task/Job: Scheduled Task creation',
  ],
  [
    'Aug 18, 16:59:43.434',
    'critical',
    'LNX-DMZ-02',
    'T1003.001',
    'Credential Access',
    'OS Credential Dumping: LSASS Memory',
  ],
  [
    'Aug 18, 16:58:13.553',
    'low',
    'WIN-WS-441',
    'T1083',
    'Discovery',
    'File and Directory Discovery',
  ],
  [
    'Aug 18, 16:57:31.601',
    'critical',
    'LNX-DMZ-02',
    'T1003.001',
    'Credential Access',
    'OS Credential Dumping: LSASS Memory',
  ],
  ['Aug 18, 16:56:51.745', 'low', 'WIN-DC-01', 'T1046', 'Discovery', 'Network Service Scanning'],
  [
    'Aug 18, 16:55:56.901',
    'medium',
    'MAC-DEV-05',
    'T1218.011',
    'Defense Evasion',
    'System Services: Rundll32',
  ],
  [
    'Aug 18, 16:54:07.280',
    'low',
    'WIN-WS-441',
    'T1083',
    'Discovery',
    'File and Directory Discovery',
  ],
  [
    'Aug 18, 16:53:16.174',
    'critical',
    'LNX-DMZ-02',
    'T1003.001',
    'Credential Access',
    'OS Credential Dumping: LSASS Memory',
  ],
  ['Aug 18, 16:52:19.562', 'low', 'WIN-DC-01', 'T1046', 'Discovery', 'Network Service Scanning'],
];

const events: IMitreEvent[] = raw.map(
  ([time, severity, agent, technique, tactic, description], i) => ({
    id: `m${i}`,
    time,
    severity,
    agent,
    technique,
    tactic,
    description,
  }),
);

const histogram: IHistogramBucket[] = [
  2, 3, 5, 9, 4, 3, 4, 7, 8, 6, 2, 3, 3, 5, 4, 6, 9, 8, 5, 2, 3, 2,
].map((v, i) => ({
  label: `${String(Math.floor(i * 1.1)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
  value: v * 40,
  tone: i === 4 ? 'high' : i === 16 ? 'critical' : 'normal',
}));

const columns: IEventColumn<IMitreEvent>[] = [
  {
    key: 'time',
    header: 'Time',
    className: 'whitespace-nowrap font-mono text-xs text-muted',
    render: (e) => e.time,
  },
  {
    key: 'sev',
    header: 'Severity',
    render: (e) => <SeverityBadge severity={e.severity} variant="outline" />,
  },
  {
    key: 'agent',
    header: 'Agent / Host',
    className: 'font-mono text-xs text-accent',
    render: (e) => e.agent,
  },
  { key: 'tech', header: 'Technique', render: (e) => <CodeChip>{e.technique}</CodeChip> },
  { key: 'tactic', header: 'Tactic', className: 'text-xs text-muted', render: (e) => e.tactic },
  {
    key: 'desc',
    header: 'Description',
    className: 'max-w-[460px] truncate',
    render: (e) => e.description,
  },
];

export const MitreEvents: React.FC = () => {
  const [params] = useSearchParams();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <MitreHeader section="Events" />
      <EventExplorer
        rows={events}
        columns={columns}
        getId={(e) => e.id}
        initialQuery={params.get('q') ? `technique.id:${params.get('q')}` : ''}
        searchPlaceholder="technique.id:*"
        searchText={(e) =>
          `${e.agent} ${e.technique} ${e.tactic} ${e.description} ${e.severity} wazuh-server exists`
        }
        rowSeverity={(e) => e.severity}
        histogram={histogram}
        initialFilters={[
          { field: 'manager.name', value: 'wazuh-server' },
          { field: 'rule.mitre.id', value: 'exists' },
        ]}
        getDocument={(e) => ({
          timestamp: e.time,
          'agent.name': e.agent,
          'rule.mitre.id': e.technique,
          'rule.mitre.tactic': e.tactic,
          'rule.description': e.description,
          'rule.level': { critical: 15, high: 12, medium: 8, low: 4 }[e.severity],
          'manager.name': 'wazuh-server',
        })}
      />
    </div>
  );
};
