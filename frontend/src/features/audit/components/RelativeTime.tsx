import React from 'react';
import { formatDistanceStrict } from 'date-fns';
import { useNow } from '../hooks/useNow.ts';

export const RelativeTime: React.FC<{ value: string; className?: string }> = ({
  value,
  className,
}) => {
  const now = useNow();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <span className={className}>—</span>;

  const exact = date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
  return (
    <time dateTime={date.toISOString()} title={`${exact}\n${value}`} className={className}>
      {formatDistanceStrict(date, now, { addSuffix: true })}
    </time>
  );
};
