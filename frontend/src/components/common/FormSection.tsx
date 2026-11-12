import React from 'react';

export const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section className="space-y-4">
    <h2 className="border-b border-line-strong pb-2 font-mono text-[11px] uppercase tracking-[1px] text-muted">
      {title}
    </h2>
    {children}
  </section>
);
