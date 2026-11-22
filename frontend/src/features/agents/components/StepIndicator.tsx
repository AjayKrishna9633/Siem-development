import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn.ts';

export const StepIndicator: React.FC<{ steps: readonly string[]; current: number }> = ({
  steps,
  current,
}) => (
  <ol className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Progress">
    {steps.map((label, index) => {
      const done = index < current;
      const active = index === current;
      return (
        <li
          key={label}
          aria-current={active ? 'step' : undefined}
          className={cn(
            'flex items-center gap-2 text-sm',
            active ? 'text-ink' : done ? 'text-muted' : 'text-subtle',
          )}
        >
          <span
            className={cn(
              'flex size-6 items-center justify-center rounded-full border font-mono text-[11px]',
              active && 'border-accent bg-accent/10 text-accent',
              done && 'border-success/60 bg-success/10 text-success',
              !active && !done && 'border-line-strong',
            )}
          >
            {done ? <Check className="size-3.5" /> : index + 1}
          </span>
          {label}
        </li>
      );
    })}
  </ol>
);
