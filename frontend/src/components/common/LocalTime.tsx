import React from 'react';

interface ILocalTimeProps {
  value?: string | null;
  format?: 'datetime' | 'date';
  empty?: string;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

const utcLabel = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
  `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;

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
