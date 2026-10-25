import React, { useState } from 'react';
import { Button } from '../ui/Button.tsx';
import { Field, Input } from '../ui/Form.tsx';
import { companyService } from '../../services/company.service.ts';
import type { ICompany } from '../../types/company.ts';
import { apiErrorMessage } from '../../lib/errors.ts';

export const RenameCompanyForm: React.FC<{
  company: ICompany;
  onSaved: (company: ICompany) => void;
}> = ({ company, onSaved }) => {
  const [name, setName] = useState(company.name);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const trimmed = name.trim();
  const changed = trimmed !== company.name;
  const valid = trimmed.length >= 2 && changed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      onSaved(await companyService.rename(company.id, trimmed));
      setSaved(true);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Failed to rename the company.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-end gap-3">
        <Field label="Company Name" required className="flex-1">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
          />
        </Field>
        <Button type="submit" variant="secondary" disabled={!valid || submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
      </div>
      {error && <p className="text-sm text-critical">{error}</p>}
      {saved && !changed && <p className="text-sm text-success">Company name updated.</p>}
    </form>
  );
};
