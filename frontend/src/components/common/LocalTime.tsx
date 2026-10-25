import React from 'react';

interface ILocalTimeProps {
  value?: string | null;
  // 'datetime' → "25 Oct 2026, 13:20"; 'date' → "25 Oct 2026"
  format?: 'datetime' | 'date';
  // Shown when there is no value, e.g. "Never" for a user who hasn't logged in
  empty?: string;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

// The exact UTC moment, for the tooltip: "2026-10-25 07:50 UTC"
const utcLabel = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
  `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;

// A timestamp in the viewer's own time zone, with UTC on hover
export const LocalTime: React.FC<ILocalTimeProps> = ({
  value,
  format = 'datetime',
  empty = '—',
  className,
}) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return <span className={className}>{empty}</span>;

  const local = d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(format === 'datetime' && { hour: '2-digit', minute: '2-digit', hour12: false }),
  });

  return (
    <time dateTime={d.toISOString()} title={utcLabel(d)} className={className}>
      {local}
    </time>
  );
};
