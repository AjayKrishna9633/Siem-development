import React from 'react';

interface IRingSegment {
  value: number;
  color: string;
}

interface IRingGaugeProps {
  size?: number;
  stroke?: number;
  // Either a single percentage or explicit segments
  percent?: number;
  segments?: IRingSegment[];
  color?: string;
  track?: string;
  // Splits the ring into four rounded arcs, as on the hub cards
  dashed?: boolean;
  children?: React.ReactNode;
}

export const RingGauge: React.FC<IRingGaugeProps> = ({
  size = 128,
  stroke = 10,
  percent,
  segments,
  color = '#adc6ff',
  track = '#1e293b',
  dashed,
  children,
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const arcs: IRingSegment[] =
    segments ??
    (percent !== undefined
      ? [
          { value: percent, color },
          { value: 100 - percent, color: 'transparent' },
        ]
      : []);
  const total = arcs.reduce((sum, s) => sum + s.value, 0) || 1;

  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={dashed ? color : track}
          strokeWidth={stroke}
          strokeLinecap={dashed ? 'round' : undefined}
          strokeDasharray={dashed ? `${c / 4 - c / 7} ${c / 7}` : undefined}
          strokeDashoffset={dashed ? -c / 14 : undefined}
        />
        {!dashed &&
          arcs.map((seg, i) => {
            const len = (seg.value / total) * c;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
};
