// Shared Recharts styling so every chart reads as one system
export const chartColors = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  accent: '#adc6ff',
  success: '#10b981',
  peach: '#fdba74',
  violet: '#818cf8',
  grid: '#1e293b',
  axis: '#64748b',
  muted: '#334155',
};

export const axisProps = {
  stroke: chartColors.axis,
  tick: { fill: chartColors.axis, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
  tickLine: false,
  axisLine: { stroke: chartColors.grid },
};

export const tooltipProps = {
  contentStyle: {
    background: '#0b1326',
    border: '1px solid #334155',
    borderRadius: 4,
    fontSize: 12,
    color: '#f8fafc',
  },
  labelStyle: { color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 },
  itemStyle: { color: '#f8fafc' },
  cursor: { fill: 'rgba(173, 198, 255, 0.06)' },
};

// 24h series at 30m or hourly resolution, deterministic so renders are stable
export const hourlySeries = (base: number[], keys: string[]) =>
  base.map((_, i) => {
    const hour = `${String(i).padStart(2, '0')}:00`;
    const row: Record<string, number | string> = { t: hour };
    keys.forEach((k, ki) => {
      row[k] = Math.max(
        0,
        Math.round(base[i] * (1 - ki * 0.28) + Math.sin(i / 2 + ki) * base[i] * 0.18),
      );
    });
    return row;
  });
