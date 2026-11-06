import React, { useState } from 'react';
import { Field, Input } from '../ui/Form.tsx';
import { personFieldErrors } from '../../lib/validation.ts';

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

export const PersonFields: React.FC<{
  name: string;
  email: string;
  onName: (value: string) => void;
  onEmail: (value: string) => void;
  emailPlaceholder?: string;
  showAllErrors?: boolean;
}> = ({
  name,
  email,
  onName,
  onEmail,
  emailPlaceholder = 'jane.doe@organization.com',
  showAllErrors = false,
}) => {
  const [touched, setTouched] = useState({ name: false, email: false });
  const errors = personFieldErrors(name, email);
  const nameError = showAllErrors || touched.name ? errors.name : undefined;
  const emailError = showAllErrors || touched.email ? errors.email : undefined;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Full Name" required error={nameError}>
        <Input
          value={name}
          onChange={(e) => onName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          placeholder="e.g. Jane Doe"
          invalid={!!nameError}
        />
      </Field>
      <Field label="Email Address" required error={emailError}>
        <Input
          type="email"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          placeholder={emailPlaceholder}
          invalid={!!emailError}
        />
      </Field>
    </div>
  );
};
