import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn.ts';

const openStack: string[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface IDrawerProps {
  label: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Drawer: React.FC<IDrawerProps> = ({
  label,
  title,
  description,
  onClose,
  children,
  className,
}) => {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    return () => opener?.focus();
  }, []);

  useEffect(() => {
    openStack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (openStack[openStack.length - 1] !== id) return;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        e.preventDefault();
        return;
      }
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === panelRef.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      openStack.splice(openStack.indexOf(id), 1);
    };
  }, [id, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end bg-canvas/70 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          'relative flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-l border-line-strong bg-surface shadow-2xl shadow-black/50 focus:outline-none',
          className,
        )}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-muted hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="flex-1 px-5 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
};
