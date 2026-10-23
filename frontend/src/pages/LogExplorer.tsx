import React, { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Braces, ChevronDown, Hash, ListFilter, Type } from 'lucide-react';
import { SeverityBadge } from '../components/ui/Badge.tsx';
import { Select } from '../components/ui/Form.tsx';
import {
  EventExplorer,
  type IEventColumn,
  type IHistogramBucket,
} from '../components/events/EventExplorer.tsx';
import { levelToSeverity } from '../lib/severity.ts';

interface ILogEvent {
  id: string;
  time: string;
  level: number;
  source: Record<string, string | number | boolean>;
}

// Sample raw events until the ingest API lands
const logs: ILogEvent[] = [
  {
    id: 'l1',
    time: 'Aug 19, 2026 @ 11:42:50.007',
    level: 15,
    source: {
      'cluster.name': 'siemple-cluster',
      'agent.ip': '47.204.15.21',
      'agent.name': 'Ubuntu',
      'agent.id': '004',
      'collector.name': 'siemple-collector-01',
      'data.endpoint_query.subquery': 'open_files',
      'data.endpoint_query.columns.path': '/var/osquery/osquery.db/MANIFEST-016679',
      'data.endpoint_query.columns.pid': 18631,
      'data.endpoint_query.name': 'pack_incident-response_open_files',
      'data.endpoint_query.action': 'removed',
      'rule.mail': false,
      'rule.level': 15,
      'rule.description':
        'endpoint_query: incident-response open_files: Process 18631 has open handle on osquery DB',
    },
  },
  {
    id: 'l2',
    time: 'Aug 19, 2026 @ 11:24:03.636',
    level: 15,
    source: {
      'cluster.name': 'siemple-cluster',
      'agent.ip': '10.0.0.180',
      'agent.name': 'ip-10-0-0-180.us-west-1.compute.internal',
      'agent.id': '003',
      'collector.name': 'siemple-collector-01',
      'data.malware_scan.reference': '1cb15d9848c2fb5569ff1f5d4c90abb0',
      'data.malware_scan.scanned_file': '/home/siemple-user/yara/malware/exploit.txt',
      'data.malware_scan.rule_name': 'Webshell_Worse_Linux_Shell_9_RID509',
      'data.malware_scan.rule_description': 'Web Shell - file Better.html',
      'rule.level': 15,
      'rule.description': 'YARA match: Webshell_Worse_Linux_Shell_9_RID509',
    },
  },
  {
    id: 'l3',
    time: 'Aug 19, 2026 @ 11:15:22.105',
    level: 15,
    source: {
      'cluster.name': 'siemple-cluster',
      'collector.name': 'siemple-collector-01',
      'agent.ip': '192.168.1.10',
      'agent.name': 'win-dc-01',
      'agent.id': '005',
      'rule.level': 15,
      'rule.description': 'Kerberoasting: multiple TGS requests with RC4 encryption',
    },
  },
  {
    id: 'l4',
    time: 'Aug 19, 2026 @ 10:58:11.420',
    level: 9,
    source: {
      'cluster.name': 'siemple-cluster',
      'agent.ip': '10.0.5.12',
      'agent.name': 'DB-PROD-01',
      'agent.id': '002',
      'collector.name': 'siemple-collector-02',
      'rule.level': 9,
      'rule.description': 'PostgreSQL: authentication failed for user "replicator"',
    },
  },
  {
    id: 'l5',
    time: 'Aug 19, 2026 @ 10:41:37.002',
    level: 5,
    source: {
      'cluster.name': 'siemple-cluster',
      'agent.ip': '192.168.1.42',
      'agent.name': 'WK-EXEC-021',
      'agent.id': '001',
      'collector.name': 'siemple-collector-01',
      'rule.level': 5,
      'rule.description': 'Windows: user logon success (type 10, RDP)',
    },
  },
];

const histogram: IHistogramBucket[] = Array.from({ length: 34 }, (_, i) => ({
  label: `${String((18 + Math.floor(i / 2)) % 24).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
  value: [
    3, 6, 2, 5, 1, 3, 1, 4, 3, 3, 2, 0, 3, 3, 2, 3, 1, 2, 2, 3, 1, 2, 4, 3, 5, 3, 0, 2, 1, 0, 0, 0,
    0, 0,
  ][i],
}));

const fields = [
  { name: 'agent.id', type: 't' },
  { name: 'agent.ip', type: 't' },
  { name: 'agent.name', type: 't' },
  { name: 'cluster.name', type: 't' },
  { name: 'collector.name', type: 't' },
  { name: 'data.endpoint_query', type: '{}' },
  { name: 'data.malware_scan', type: 't' },
  { name: 'rule.description', type: 't' },
  { name: 'rule.id', type: '#' },
  { name: 'rule.level', type: '#' },
];

const FieldIcon: React.FC<{ type: string }> = ({ type }) =>
  type === '#' ? (
    <Hash className="size-3" />
  ) : type === '{}' ? (
    <Braces className="size-3" />
  ) : (
    <Type className="size-3" />
  );

export const LogExplorer: React.FC = () => {
  const [params] = useSearchParams();
  const [index, setIndex] = useState('All Events');
  const [fieldSearch, setFieldSearch] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const columns: IEventColumn<ILogEvent>[] = [
    {
      key: 'time',
      header: 'Time',
      className: 'whitespace-nowrap align-top font-mono text-xs text-muted',
      render: (e) => e.time,
    },
    {
      key: 'sev',
      header: 'Severity',
      className: 'align-top',
      render: (e) => <SeverityBadge severity={levelToSeverity(e.level)} />,
    },
    ...(selectedFields.length
      ? selectedFields.map<IEventColumn<ILogEvent>>((f) => ({
          key: f,
          header: f,
          className: 'align-top font-mono text-xs',
          render: (e) => String(e.source[f] ?? '—'),
        }))
      : [
          {
            key: '_source',
            header: '_source',
            render: (e: ILogEvent) => (
              <div className="flex max-w-[760px] flex-wrap gap-1">
                {Object.entries(e.source)
                  .slice(0, 12)
                  .map(([k, v]) => (
                    <span
                      key={k}
                      className="rounded-sm border border-line-strong bg-canvas px-1.5 py-0.5 font-mono text-[11px]"
                    >
                      <span className="text-muted">{k}:</span>{' '}
                      <span className="text-ink">{String(v)}</span>
                    </span>
                  ))}
              </div>
            ),
          },
        ]),
  ];

  const toggleField = (name: string) =>
    setSelectedFields((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name],
    );

  const fieldList = fields.filter((f) => f.name.includes(fieldSearch.toLowerCase()));

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <EventExplorer
        rows={logs}
        columns={columns}
        getId={(e) => e.id}
        initialQuery={params.get('q') ?? ''}
        searchPlaceholder="Search..."
        searchText={(e) => `${index} ${JSON.stringify(e.source)}`}
        getDocument={(e) => e.source}
        rowSeverity={(e) => levelToSeverity(e.level)}
        histogram={histogram}
        histogramColor="#adc6ff"
        histogramTitle="timestamp per 30 minutes"
        initialFilters={[]}
        leftPanel={
          <aside className="w-60 shrink-0 border-r border-line">
            <div className="border-b border-line p-3">
              <Select value={index} onChange={(e) => setIndex(e.target.value)}>
                {['All Events', 'Alerts', 'Archives', 'Monitoring'].map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-3 p-3">
              <input
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                placeholder="Search fields"
                className="h-8 w-full rounded border border-line-strong bg-canvas px-2.5 text-xs text-ink placeholder:text-subtle focus:outline-none"
              />
              <p className="flex items-center justify-between text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <ListFilter className="size-3.5" /> Filter by type
                </span>
                <span className="rounded-sm bg-raised px-1.5 font-mono text-[10px]">0</span>
              </p>
              <div>
                <p className="flex items-center gap-1 py-1 text-sm font-medium text-ink">
                  <ChevronDown className="size-3.5" /> Selected fields
                </p>
                {selectedFields.length === 0 ? (
                  <p className="flex items-center gap-2 py-1 pl-5 font-mono text-[13px] text-ink">
                    <span className="flex size-5 items-center justify-center rounded-sm bg-raised text-muted">
                      <Braces className="size-3" />
                    </span>
                    _source
                  </p>
                ) : (
                  selectedFields.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleField(f)}
                      className="flex w-full items-center gap-2 py-1 pl-5 text-left font-mono text-[13px] text-accent hover:text-ink"
                    >
                      {f}
                    </button>
                  ))
                )}
              </div>
              <div>
                <p className="flex items-center gap-1 py-1 text-sm font-medium text-ink">
                  <ChevronDown className="size-3.5" /> Available fields
                </p>
                {fieldList
                  .filter((f) => !selectedFields.includes(f.name))
                  .map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => toggleField(f.name)}
                      title="Add as column"
                      className="flex w-full items-center gap-2 rounded-sm py-1 pl-5 text-left font-mono text-[13px] text-ink hover:bg-raised"
                    >
                      <span className="flex size-5 items-center justify-center rounded-sm bg-raised text-muted">
                        <FieldIcon type={f.type} />
                      </span>
                      <span className="truncate">{f.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          </aside>
        }
      />
    </div>
  );
};
