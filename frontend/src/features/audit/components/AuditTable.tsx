import React from 'react';
import { Tag } from '@/components/ui/Badge.tsx';
import { Table, THead, Th, Tr, Td } from '@/components/ui/Table.tsx';
import { TableStatusRow } from '@/components/common/TableStatusRow.tsx';
import { cn } from '@/lib/cn.ts';
import { actionLabel, humanize } from '../constants/actionLabels.ts';
import { actorName } from '../utils/actor.ts';
import type { IAuditLog } from '../types/audit.types.ts';
import { OutcomeBadge } from './OutcomeBadge.tsx';
import { RelativeTime } from './RelativeTime.tsx';

const COLUMNS = 6;

interface IAuditTableProps {
  entries: IAuditLog[];
  // True only before the first page has arrived; later loads keep the old rows on screen, dimmed.
  loading: boolean;
  refreshing: boolean;
  emptyText: string;
  selectedId?: string | null;
  onSelect: (entry: IAuditLog) => void;
  onFilterActor: (entry: IAuditLog) => void;
}

export const AuditTable: React.FC<IAuditTableProps> = ({
  entries,
  loading,
  refreshing,
  emptyText,
  selectedId,
  onSelect,
  onFilterActor,
}) => (
  <Table aria-label="Audit log" aria-busy={loading || refreshing}>
    <THead>
      <tr>
        <Th>Time</Th>
        <Th>Actor</Th>
        <Th>Action</Th>
        <Th>Target</Th>
        <Th>Outcome</Th>
        <Th>IP address</Th>
      </tr>
    </THead>
    <tbody className={cn(refreshing && 'opacity-60 transition-opacity')}>
      {loading && (
        <TableStatusRow colSpan={COLUMNS} mono>
          Loading audit log…
        </TableStatusRow>
      )}
      {!loading && entries.length === 0 && (
        <TableStatusRow colSpan={COLUMNS}>{emptyText}</TableStatusRow>
      )}
      {!loading &&
        entries.map((entry) => (
          <AuditRow
            key={entry.id}
            entry={entry}
            selected={entry.id === selectedId}
            onSelect={onSelect}
            onFilterActor={onFilterActor}
          />
        ))}
    </tbody>
  </Table>
);

const AuditRow: React.FC<{
  entry: IAuditLog;
  selected: boolean;
  onSelect: (entry: IAuditLog) => void;
  onFilterActor: (entry: IAuditLog) => void;
}> = ({ entry, selected, onSelect, onFilterActor }) => {
  const label = actionLabel(entry.action);
  const targetText = entry.target.label ?? entry.target.id;

  return (
    <Tr
      selected={selected}
      tabIndex={0}
      aria-label={`${label}, ${entry.outcome}. Open details`}
      onClick={() => onSelect(entry)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect(entry);
        }
      }}
      className="cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-accent/70"
    >
      <Td className="whitespace-nowrap font-mono text-xs text-muted">
        <RelativeTime value={entry.occurredAt} />
      </Td>
      <Td>
        <div className="min-w-0">
          {entry.actor.id ? (
            <button
              type="button"
              title="Show only this person's activity"
              onClick={(e) => {
                e.stopPropagation();
                onFilterActor(entry);
              }}
              className="max-w-[16rem] truncate text-left text-ink hover:text-accent hover:underline"
            >
              {actorName(entry.actor)}
            </button>
          ) : (
            <p className="max-w-[16rem] truncate text-muted">{actorName(entry.actor)}</p>
          )}
          {entry.actor.role && (
            <Tag className="mt-1 block w-fit normal-case">{humanize(entry.actor.role)}</Tag>
          )}
        </div>
      </Td>
      <Td title={entry.action}>{label}</Td>
      <Td>
        {targetText ? (
          <div className="min-w-0">
            <p className="max-w-[18rem] truncate">{targetText}</p>
            {entry.target.type && (
              <p className="text-xs text-muted">{humanize(entry.target.type)}</p>
            )}
          </div>
        ) : (
          <span className="text-muted">—</span>
        )}
      </Td>
      <Td>
        <OutcomeBadge outcome={entry.outcome} />
      </Td>
      <Td className="whitespace-nowrap font-mono text-xs text-muted">{entry.ipAddress ?? '—'}</Td>
    </Tr>
  );
};
