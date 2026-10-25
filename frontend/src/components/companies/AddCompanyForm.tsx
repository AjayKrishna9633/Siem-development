import React, { useState } from 'react';
import { Button } from '../ui/Button.tsx';
import { Field, Input } from '../ui/Form.tsx';
import { FormSection, PersonFields } from '../common/FormSection.tsx';
import { companyNameError, isValidPerson } from '../../lib/validation.ts';
import { companyService } from '../../services/company.service.ts';
import type { ICompanyWithActivation } from '../../types/company.ts';
import { apiErrorMessage } from '../../lib/errors.ts';

interface IAddCompanyFormProps {
  onCreated: (result: ICompanyWithActivation) => void;
  onCancel: () => void;
}

export const AddCompanyForm: React.FC<IAddCompanyFormProps> = ({ onCreated, onCancel }) => {
  const [name, setName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = !companyNameError(name) && isValidPerson(adminName, adminEmail);
  // Set by the first submit: from then on every invalid field shows its message
  const [attempted, setAttempted] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const nameError = attempted || nameTouched ? companyNameError(name) : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setAttempted(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      onCreated(
        await companyService.create({
          name: name.trim(),
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim(),
        }),
      );
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Failed to create the company.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <FormSection title="Company">
        <Field label="Company Name" required error={nameError} className="max-w-sm">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setNameTouched(true)}
            invalid={!!nameError}
            placeholder="e.g. Acme Corp"
          />
        </Field>
      </FormSection>

      <FormSection title="Company admin">
        <PersonFields
          name={adminName}
          email={adminEmail}
          onName={setAdminName}
          onEmail={setAdminEmail}
          emailPlaceholder="jane.doe@acme.com"
          showAllErrors={attempted}
        />
        <p className="text-xs text-subtle">
          The admin manages this company&apos;s analysts. You can change the admin later.
        </p>
      </FormSection>

      {error && <p className="text-sm text-critical">{error}</p>}

      <div className="flex justify-end gap-3 border-t border-line pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create company'}
        </Button>
      </div>
    </form>
  );
};
