import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn.ts';

const openStack: string[] = [];

interface IModalProps {
  title: string;
  description?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}

export const Modal: React.FC<IModalProps> = ({
  title,
  description,
  onClose,
  children,
  className,
  icon,
  size = 'md',
}) => {
  const id = useId();

  useEffect(() => {
    openStack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openStack[openStack.length - 1] === id) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      openStack.splice(openStack.indexOf(id), 1);
    };
  }, [id, onClose]);

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center overflow-y-auto bg-canvas/80 px-4 backdrop-blur-[2px]',
        size === 'sm' ? 'items-start pt-[18vh]' : 'items-start py-16',
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative w-full rounded border border-line-strong bg-surface p-5 shadow-2xl shadow-black/50',
          size === 'sm' ? 'max-w-[440px]' : 'max-w-[560px]',
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-muted hover:text-ink"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <div className="flex gap-3 pr-8">
          {icon}
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
};
