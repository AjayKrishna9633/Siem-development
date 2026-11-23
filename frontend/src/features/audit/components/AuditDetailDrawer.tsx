import React, { useState } from 'react';
import { Braces } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { CodeChip, Tag } from '@/components/ui/Badge.tsx';
import { MonoLabel } from '@/components/ui/Panel.tsx';
import { actionLabel, CATEGORY_LABELS, humanize } from '../constants/actionLabels.ts';
import { describeMetadata, formatValue } from '../utils/describeMetadata.ts';
import type { IAuditLog } from '../types/audit.types.ts';
import { OutcomeBadge } from './OutcomeBadge.tsx';
import { actorName } from '../utils/actor.ts';

interface IAuditDetailDrawerProps {
  entry: IAuditLog | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-line py-2.5 last:border-0">
    <dt>
      <MonoLabel>{label}</MonoLabel>
    </dt>
    <dd className="min-w-0 break-words text-sm text-ink">{children}</dd>
  </div>
);

const Mono: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="break-all font-mono text-xs">{children}</span>
);

const Empty = () => <span className="text-muted">—</span>;

const exactTime = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'medium' });
};

export const AuditDetailDrawer: React.FC<IAuditDetailDrawerProps> = ({
  entry,
  loading,
  error,
  onClose,
}) => (
  <Drawer
    label="Audit log entry"
    title={entry ? actionLabel(entry.action, entry.metadata) : 'Audit log entry'}
    description={entry ? exactTime(entry.occurredAt) : undefined}
    onClose={onClose}
  >
    {entry ? (
      <EntryDetails entry={entry} />
    ) : (
      <p
        className={error ? 'text-sm text-high' : 'font-mono text-xs text-muted'}
        role={error ? 'alert' : undefined}
      >
        {error ?? (loading ? 'Loading entry…' : 'This entry could not be found.')}
      </p>
    )}
  </Drawer>
);

const EntryDetails: React.FC<{ entry: IAuditLog }> = ({ entry }) => {
  const [showRaw, setShowRaw] = useState(false);
  const { changes, details } = describeMetadata(entry.action, entry.metadata);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <OutcomeBadge outcome={entry.outcome} />
        <Tag>{CATEGORY_LABELS[entry.category]}</Tag>
      </div>

      <dl>
        <Row label="Time">
          <Mono>{entry.occurredAt}</Mono>
        </Row>
        <Row label="Actor">
          <p>{actorName(entry.actor)}</p>
          {entry.actor.role && <p className="text-xs text-muted">{humanize(entry.actor.role)}</p>}
          {entry.actor.id && <Mono>{entry.actor.id}</Mono>}
        </Row>
        <Row label="Action">
          <p>{actionLabel(entry.action, entry.metadata)}</p>
          <CodeChip className="mt-1">{entry.action}</CodeChip>
        </Row>
        <Row label="Target">
          {entry.target.type || entry.target.label || entry.target.id ? (
            <>
              {entry.target.label && <p>{entry.target.label}</p>}
              {entry.target.type && (
                <p className="text-xs text-muted">{humanize(entry.target.type)}</p>
              )}
              {entry.target.id && <Mono>{entry.target.id}</Mono>}
            </>
          ) : (
            <Empty />
          )}
        </Row>
        <Row label="IP address">{entry.ipAddress ? <Mono>{entry.ipAddress}</Mono> : <Empty />}</Row>
        <Row label="User agent">{entry.userAgent ? <Mono>{entry.userAgent}</Mono> : <Empty />}</Row>
        <Row label="Request ID">{entry.requestId ? <Mono>{entry.requestId}</Mono> : <Empty />}</Row>
        <Row label="Entry ID">
          <Mono>{entry.id}</Mono>
        </Row>
      </dl>

      {changes.length > 0 && (
        <section aria-label="Changes">
          <MonoLabel>Changes</MonoLabel>
          <table className="mt-2 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-1.5 pr-3 font-mono text-[10px] font-normal uppercase text-muted">
                  Field
                </th>
                <th className="py-1.5 pr-3 font-mono text-[10px] font-normal uppercase text-muted">
                  Before
                </th>
                <th className="py-1.5 font-mono text-[10px] font-normal uppercase text-muted">
                  After
                </th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change) => (
                <tr key={change.field} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3 text-muted">{change.field}</td>
                  <td className="break-all py-2 pr-3 text-muted line-through decoration-subtle">
                    {formatValue(change.before)}
                  </td>
                  <td className="break-all py-2 text-ink">{formatValue(change.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {details.length > 0 && (
        <section aria-label="Details">
          <MonoLabel>Details</MonoLabel>
          <dl className="mt-2">
            {details.map(({ key, value }) => (
              <Row key={key} label={humanize(key)}>
                <Mono>{formatValue(value)}</Mono>
              </Row>
            ))}
          </dl>
        </section>
      )}

      <section>
        <Button
          size="sm"
          variant="outline"
          icon={<Braces className="size-3.5" />}
          aria-expanded={showRaw}
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? 'Hide raw JSON' : 'Show raw JSON'}
        </Button>
        {showRaw && (
          <pre
            aria-label="Raw JSON"
            className="mt-3 max-h-96 overflow-auto rounded border border-line-strong bg-canvas p-3 font-mono text-xs text-ink"
          >
            {JSON.stringify(entry, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
};
