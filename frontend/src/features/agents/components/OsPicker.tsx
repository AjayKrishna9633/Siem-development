import React from 'react';
import { Segmented } from '@/components/ui/Form.tsx';
import { cn } from '@/lib/cn.ts';
import { ARCH_OPTIONS, OS_OPTIONS } from '../constants/enrollment.ts';
import type { AgentArch, AgentOs } from '../types/agent.types.ts';

interface IOsPickerProps {
  os: AgentOs;
  arch: AgentArch;
  onOsChange: (os: AgentOs) => void;
  onArchChange: (arch: AgentArch) => void;
}

export const OsPicker: React.FC<IOsPickerProps> = ({ os, arch, onOsChange, onArchChange }) => (
  <div className="space-y-5">
    <div role="radiogroup" aria-label="Operating system" className="grid gap-3 sm:grid-cols-3">
      {OS_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === os}
          onClick={() => onOsChange(option.value)}
          className={cn(
            'rounded border px-4 py-3 text-left transition-colors',
            option.value === os
              ? 'border-accent/60 bg-accent/5'
              : 'border-line-strong bg-canvas hover:border-accent/40',
          )}
        >
          <span className="block text-sm font-medium text-ink">{option.label}</span>
          <span className="mt-0.5 block text-xs text-muted">{option.detail}</span>
        </button>
      ))}
    </div>
    {os !== 'windows' && (
      <div className="space-y-1.5">
        <span className="block text-sm text-ink">Architecture</span>
        <Segmented options={ARCH_OPTIONS} value={arch} onChange={onArchChange} />
        <span className="block text-xs text-subtle">
          Run <code className="font-mono">uname -m</code> on the machine: x86_64 or aarch64 (arm64).
        </span>
      </div>
    )}
  </div>
);
