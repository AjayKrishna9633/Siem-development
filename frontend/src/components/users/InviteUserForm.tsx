import React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from 'lucide-react';
import { Button } from '../ui/Button.tsx';
import { Field, Input, Select } from '../ui/Form.tsx';
import { FormSection } from '../common/FormSection.tsx';
import { inviteUserSchema, type InviteUserValues } from '@/utils/validation.ts';
import { usersService } from '@/services/users.service.ts';
import type { IInviteResult } from '@/types/auth.ts';
import { ALL_ROLES, roleDescription, roleLabel } from '@/features/auth';
import { apiErrorMessage } from '@/lib/errors.ts';

export const InviteUserForm: React.FC<{
  onInvited: (result: IInviteResult) => void;
  onCancel: () => void;
}> = ({ onInvited, onCancel }) => {
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(inviteUserSchema),
    mode: 'onTouched',
    defaultValues: { email: '', role: 't1_analyst' as const },
  });
  const role = useWatch({ control, name: 'role' });

  const onSubmit = async (values: InviteUserValues) => {
    try {
      onInvited(await usersService.invite(values));
    } catch (err: unknown) {
      setError('root', { message: apiErrorMessage(err, 'Failed to send the invitation.') });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <FormSection title="Who">
        <Field label="Email address" required error={errors.email?.message} className="max-w-sm">
          <Input
            type="email"
            autoFocus
            placeholder="name@company.com"
            invalid={!!errors.email}
            {...register('email')}
          />
        </Field>
      </FormSection>

      <FormSection title="Role">
        <Field label="System Role" hint={roleDescription[role]} className="max-w-sm">
          <Select {...register('role')}>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel[r]}
              </option>
            ))}
          </Select>
        </Field>
      </FormSection>

      <p className="flex gap-3 rounded border border-line-strong bg-canvas/50 p-3 text-sm text-ink">
        <Info className="mt-0.5 size-4 shrink-0 text-muted" />
        They get a single-use link, valid for 48 hours, to choose their name and password. If this
        server can&apos;t send email, you&apos;ll get the link to send them yourself.
      </p>

      {errors.root && <p className="text-sm text-critical">{errors.root.message}</p>}

      <div className="flex justify-end gap-3 border-t border-line pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Inviting…' : 'Send invitation'}
        </Button>
      </div>
    </form>
  );
};
