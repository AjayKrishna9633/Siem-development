import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Download } from 'lucide-react';
import { ModuleTabs } from '../../components/ui/PageHeader.tsx';
import { Panel, MonoLabel } from '../../components/ui/Panel.tsx';
import { KpiCard } from '../../components/ui/KpiCard.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { SearchInput, Select } from '../../components/ui/Form.tsx';
import { StatusBadge } from '../../components/ui/Badge.tsx';
import { cn } from '../../lib/cn.ts';
import { configTabs } from './configTabs.ts';

type CheckResult = 'failed' | 'passed' | 'not_applicable';

interface ICheck {
  id: number;
  title: string;
  source: string;
  result: CheckResult;
  description: string;
  audit: string;
}

// Sample SCA results until the ingest API lands
const checks: ICheck[] = [
  {
    id: 26000,
    title: 'Ensure "Enforce password history" is set to 24',
    source: 'Registry',
    result: 'failed',
    description:
      'This policy setting determines the number of unique new passwords that must be associated with a user account before an old password can be reused. The value must be between 0 and 24 passwords. This ensures users cannot constantly reuse the same password, weakening security.',
    audit:
      'powershell secedit /export /cfg $env:TEMP\\secpol.cfg; Get-Content $env:TEMP\\secpol.cfg | Select-String "PasswordHistorySize"',
  },
  {
    id: 26001,
    title: 'Ensure "Maximum password age" is set to 365',
    source: 'Registry',
    result: 'passed',
    description:
      'Defines how long a password can be used before the system requires the user to change it.',
    audit: 'powershell net accounts | Select-String "Maximum password age"',
  },
  {
    id: 26002,
    title: "Ensure 'Minimum password length' is set to 14 or more character(s)",
    source: 'Registry',
    result: 'failed',
    description:
      'Determines the least number of characters that make up a password for a user account.',
    audit: 'powershell net accounts | Select-String "Minimum password length"',
  },
  {
    id: 26003,
    title: "Ensure 'Account lockout threshold' is set to 5 or fewer invalid logon attempts",
    source: 'Registry',
    result: 'passed',
    description:
      'Determines the number of failed logon attempts that causes a user account to be locked out.',
    audit: 'powershell net accounts | Select-String "Lockout threshold"',
  },
  {
    id: 26004,
    title: "Ensure 'Turn off Microsoft consumer experiences' is set to 'Enabled'",
    source: 'Group Policy',
    result: 'not_applicable',
    description: 'Not applicable to Server SKUs.',
    audit:
      'reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsConsumerFeatures',
  },
];

const resultBadge: Record<CheckResult, { tone: 'danger' | 'success' | 'neutral'; label: string }> =
  {
    failed: { tone: 'danger', label: 'Failed' },
    passed: { tone: 'success', label: 'Passed' },
    not_applicable: { tone: 'neutral', label: 'N/A' },
  };

export const ConfigDashboard: React.FC = () => {
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState<number | null>(26000);
  const [policy, setPolicy] = useState('CIS Windows 11 Enterprise v3.0.0');
  const [remediated, setRemediated] = useState<Set<number>>(new Set());

  const visible = useMemo(
    () => checks.filter((c) => `${c.id} ${c.title}`.toLowerCase().includes(filter.toLowerCase())),
    [filter],
  );

  return (
    <div>
      <div className="border-b border-line px-6 pt-4">
        <ModuleTabs tabs={configTabs} className="border-b-0" />
      </div>
      <div className="flex flex-col lg:flex-row">
        <aside className="space-y-6 border-line p-6 lg:w-64 lg:shrink-0 lg:border-r">
          <div>
            <h2 className="text-ink">Overview</h2>
            <p className="mt-1 text-sm text-muted">CIS Benchmark Compliance Summary</p>
          </div>
          <Panel className="bg-raised/60 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Total Checks</span>
              <span className="font-mono text-ink">482</span>
            </div>
            <div className="my-5 flex h-36 items-end gap-2">
              <span className="w-full rounded-t-sm bg-success/80" style={{ height: '36%' }} />
              <span className="w-full rounded-t-sm bg-critical/80" style={{ height: '100%' }} />
              <span className="w-full rounded-t-sm bg-line-strong" style={{ height: '6%' }} />
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-success" /> Passed
                </span>
                <span className="font-mono">124</span>
              </li>
              <li className="flex justify-between">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-critical" /> Failed
                </span>
                <span className="font-mono">349</span>
              </li>
              <li className="flex justify-between text-muted">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-line-strong" /> Not Applicable
                </span>
                <span className="font-mono">9</span>
              </li>
            </ul>
          </Panel>
          <div className="space-y-2">
            <MonoLabel>Current policy</MonoLabel>
            <Select value={policy} onChange={(e) => setPolicy(e.target.value)}>
              <option>CIS Windows 11 Enterprise v3.0.0</option>
              <option>CIS Ubuntu Linux 22.04 LTS v1.0.0</option>
              <option>Win Default Security</option>
            </Select>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-5 p-6">
          <div>
            <h1 className="text-ink">Configuration Assessment</h1>
            <p className="text-sm text-muted">Scanned on Aug 17, 2026 @ 20:36:50</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Security score"
              value={<span className="text-xl">26%</span>}
              tone="critical"
            />
            <KpiCard
              label="Failed checks"
              value={<span className="text-xl">349</span>}
              outlined
              tone="critical"
            />
            <KpiCard label="Passed checks" value={<span className="text-xl">124</span>} />
          </div>

          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3">
              <SearchInput
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter checks..."
                className="w-64"
              />
              <Button variant="outline" size="sm" mono icon={<Download className="size-3.5" />}>
                Export report
              </Button>
            </div>
            <div className="grid grid-cols-[1fr_140px_120px] border-b border-line px-4 py-2 font-mono text-[10px] uppercase text-muted">
              <span>Check name</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>
            {visible.map((c) => {
              const isOpen = open === c.id;
              const badge = remediated.has(c.id)
                ? { tone: 'success' as const, label: 'Remediating' }
                : resultBadge[c.result];
              return (
                <div
                  key={c.id}
                  className={cn('border-b border-line last:border-0', isOpen && 'bg-raised/40')}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : c.id)}
                    className="grid w-full grid-cols-[1fr_140px_120px] items-center px-4 py-3 text-left"
                  >
                    <span>
                      <span className="block text-ink">{c.title}</span>
                      <span className="font-mono text-[10px] text-subtle">
                        ID: {c.id} • {c.source}
                      </span>
                    </span>
                    <span>
                      <StatusBadge tone={badge.tone} dot>
                        {badge.label}
                      </StatusBadge>
                    </span>
                    <span
                      className={cn(
                        'flex items-center justify-end gap-1 text-sm',
                        isOpen ? 'text-accent' : 'text-muted',
                      )}
                    >
                      Details{' '}
                      {isOpen ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="space-y-4 border-t border-line px-4 py-4">
                      <div>
                        <MonoLabel>Description</MonoLabel>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-ink">{c.description}</p>
                      </div>
                      <div>
                        <MonoLabel>Audit command (PowerShell)</MonoLabel>
                        <pre className="mt-1 overflow-x-auto rounded border border-line-strong bg-canvas p-3 font-mono text-xs text-ink">
                          {c.audit}
                        </pre>
                      </div>
                      {c.result === 'failed' && (
                        <div className="flex justify-end">
                          <Button
                            variant="primary"
                            size="sm"
                            mono
                            disabled={remediated.has(c.id)}
                            onClick={() => setRemediated((s) => new Set(s).add(c.id))}
                          >
                            {remediated.has(c.id) ? 'Queued' : 'Remediate'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </Panel>
        </div>
      </div>
    </div>
  );
};
