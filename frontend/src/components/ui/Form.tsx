import React from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/cn.ts';

const fieldBase =
  'w-full rounded border border-line-strong bg-canvas text-sm text-ink placeholder:text-subtle transition-colors focus:border-accent/70 focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-60';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...rest }, ref) => (
  <input
    ref={ref}
    className={cn(
      fieldBase,
      'h-9 px-3',
      invalid && 'border-critical/70 focus:border-critical',
      className,
    )}
    {...rest}
  />
));
Input.displayName = 'Input';

interface ISearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suffix?: React.ReactNode;
  mono?: boolean;
}

export const SearchInput: React.FC<ISearchInputProps> = ({ className, suffix, mono, ...rest }) => (
  <div className={cn('relative flex items-center', className)}>
    <Search className="pointer-events-none absolute left-3 size-3.5 text-subtle" />
    <input
      className={cn(fieldBase, 'h-9 pl-9', suffix ? 'pr-14' : 'pr-3', mono && 'font-mono text-xs')}
      {...rest}
    />
    {suffix && <div className="absolute right-2">{suffix}</div>}
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className,
  children,
  ...rest
}) => (
  <div className={cn('relative', className)}>
    <select className={cn(fieldBase, 'h-9 appearance-none pl-3 pr-8')} {...rest}>
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
  </div>
);

interface IFieldProps {
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
  mono?: boolean;
}

export const Field: React.FC<IFieldProps> = ({
  label,
  required,
  hint,
  error,
  children,
  className,
  mono,
}) => (
  <label className={cn('block space-y-1.5', className)}>
    <span
      className={cn(
        'block',
        mono ? 'font-mono text-[10px] uppercase tracking-[0.5px] text-muted' : 'text-sm text-ink',
      )}
    >
      {label}
      {required && <span className="ml-0.5 text-critical">*</span>}
    </span>
    {children}
    {error ? (
      <span className="block text-xs text-critical">{error}</span>
    ) : (
      hint && <span className="block text-xs text-subtle">{hint}</span>
    )}
  </label>
);

interface ICheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  className?: string;
}

export const Checkbox: React.FC<ICheckboxProps> = ({ checked, onChange, label, className }) => (
  <label
    className={cn('flex cursor-pointer items-center gap-2 text-sm text-ink select-none', className)}
  >
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
        checked ? 'border-accent bg-accent text-canvas' : 'border-line-strong bg-canvas',
      )}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
    {label}
  </label>
);

interface IToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  className?: string;
}

export const Toggle: React.FC<IToggleProps> = ({ checked, onChange, label, className }) => (
  <label
    className={cn('flex cursor-pointer items-center justify-between gap-3 select-none', className)}
  >
    {label}
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-4 w-7 shrink-0 rounded-full transition-colors',
        checked ? 'bg-accent' : 'bg-line-strong',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-3 rounded-full bg-canvas transition-all',
          checked ? 'left-3.5' : 'left-0.5',
        )}
      />
    </button>
  </label>
);

interface ISegmentedProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export const Segmented = <T extends string>({
  options,
  value,
  onChange,
  className,
}: ISegmentedProps<T>) => (
  <div className={cn('inline-flex gap-1', className)}>
    {options.map((option) => (
      <button
        key={option}
        type="button"
        onClick={() => onChange(option)}
        className={cn(
          'h-7 rounded border px-2.5 font-mono text-[11px] uppercase transition-colors',
          option === value
            ? 'border-accent/50 bg-line-strong text-ink'
            : 'border-line-strong bg-canvas text-muted hover:text-ink',
        )}
      >
        {option}
      </button>
    ))}
  </div>
);
