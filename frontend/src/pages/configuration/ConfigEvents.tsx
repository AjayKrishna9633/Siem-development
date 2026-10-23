import React from 'react';
import { ModuleTabs } from '../../components/ui/PageHeader.tsx';
import { StatusBadge } from '../../components/ui/Badge.tsx';
import {
  EventExplorer,
  type IEventColumn,
  type IHistogramBucket,
} from '../../components/events/EventExplorer.tsx';
import { configTabs } from './configTabs.ts';

type ScaResult = 'failed' | 'passed' | 'not applicable';

interface IScaEvent {
  id: string;
  time: string;
  title: string;
  result: ScaResult;
  policy: string;
  checkId: number;
}

// Sample SCA events until the ingest API lands
const titles: [string, ScaResult][] = [
  ["Ensure 'Enable optional updates' is set to disabled", 'failed'],
  ["Ensure 'Select when Quality Updates are received' is set", 'not applicable'],
  ["Ensure 'Select when Preview Builds and Feature Updates are received'", 'passed'],
  ["Ensure 'Turn off auto-restart for updates during active hours'", 'failed'],
  ["Ensure 'Do not include drivers with Windows Updates' is set", 'passed'],
  ["Ensure 'Configure Automatic Updates' is set to 'Enabled'", 'passed'],
  ["Ensure 'Remove access to Pause updates feature' is enabled", 'failed'],
];

const events: IScaEvent[] = titles.map(([title, result], i) => ({
  id: `sca-${i}`,
  time: `Aug 17, 2026 @ 20:36:${String(22 - i * 2).padStart(2, '0')}.${791 - i * 9}`,
  title,
  result,
  policy: 'CIS Microsoft Windows 11 Enterprise Benchmark v3.0.0',
  checkId: 26100 + i,
}));

const histogram: IHistogramBucket[] = Array.from({ length: 22 }, (_, i) => ({
  label: `${String(i).padStart(2, '0')}:00`,
  value: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 30, 230, 486][i] ?? 0,
}));

const resultTone: Record<ScaResult, 'danger' | 'success' | 'neutral'> = {
  failed: 'danger',
  passed: 'success',
  'not applicable': 'neutral',
};

const columns: IEventColumn<IScaEvent>[] = [
  {
    key: 'time',
    header: 'Timestamp',
    className: 'whitespace-nowrap font-mono text-xs text-muted',
    render: (e) => e.time,
  },
  {
    key: 'title',
    header: 'Check title',
    className: 'max-w-[380px] truncate',
    render: (e) => e.title,
  },
  {
    key: 'result',
    header: 'Result',
    render: (e) => <StatusBadge tone={resultTone[e.result]}>{e.result}</StatusBadge>,
  },
  {
    key: 'policy',
    header: 'Policy',
    className: 'max-w-[260px] truncate text-muted',
    render: (e) => e.policy,
  },
];

export const ConfigEvents: React.FC = () => (
  <div className="flex min-h-[calc(100vh-4rem)] flex-col">
    <div className="border-b border-line px-6 pt-4">
      <ModuleTabs tabs={configTabs} className="border-b-0" />
    </div>
    <EventExplorer
      rows={events}
      columns={columns}
      getId={(e) => e.id}
      searchPlaceholder="Search logs using DQL..."
      searchText={(e) => `${e.title} ${e.result} ${e.policy} wazuh-server sca 005`}
      histogram={histogram}
      histogramColor="#10b981"
      histogramTitle="SCA check results"
      fieldCount={712}
      initialFilters={[
        { field: 'manager.name', value: 'wazuh-server' },
        { field: 'rule.groups', value: 'sca' },
        { field: 'agent.id', value: '005' },
      ]}
      getDocument={(e) => ({
        _id: `X9j2m4QBs_${e.checkId}`,
        _index: 'wazuh-alerts-4.x-2026.08.17',
        'agent.id': '005',
        'agent.name': 'DESKTOP-WIN11-SEC',
        'data.sca.check.id': e.checkId,
        'data.sca.check.title': e.title,
        'data.sca.check.result': e.result,
        'data.sca.policy': e.policy,
        'rule.level': e.result === 'failed' ? 7 : 3,
        'rule.description':
          e.result === 'failed'
            ? 'SCA check failed: System configuration non-compliant with CIS policy.'
            : 'SCA check evaluated.',
      })}
    />
  </div>
);
