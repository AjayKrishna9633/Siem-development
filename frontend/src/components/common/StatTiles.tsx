import React from 'react';
import { MonoLabel, Panel } from '../ui/Panel.tsx';

export const StatTiles: React.FC<{
  stats: { label: string; value: number }[];
  loading: boolean;
}> = ({ stats, loading }) => (
  <div className="grid gap-4 sm:grid-cols-3">
    {stats.map((k) => (
      <Panel key={k.label} className="bg-raised/50 p-4">
        <MonoLabel>{k.label}</MonoLabel>
        <p className="mt-2 text-2xl text-ink">{loading ? '—' : k.value}</p>
      </Panel>
    ))}
  </div>
);
