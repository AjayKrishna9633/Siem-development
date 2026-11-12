import React from 'react';
import { cn } from '../../lib/cn.ts';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md';

interface IButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  mono?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-canvas hover:bg-[#c4d6ff] disabled:bg-raised disabled:text-subtle',
  secondary: 'border border-line-strong bg-raised text-ink hover:bg-line-strong',
  outline: 'border border-line-strong bg-canvas text-ink hover:border-accent/60 hover:text-accent',
  ghost: 'text-muted hover:bg-raised hover:text-ink',
  danger: 'border border-critical/50 bg-critical/10 text-critical hover:bg-critical/20',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
};

export const Button: React.FC<IButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  mono,
  className,
  children,
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    className={cn(
      'inline-flex shrink-0 items-center justify-center rounded font-medium transition-colors disabled:cursor-not-allowed',
      variants[variant],
      sizes[size],
      mono && 'font-mono text-[11px] uppercase tracking-[0.5px]',
      className,
    )}
    {...rest}
  >
    {icon}
    {children}
  </button>
);
