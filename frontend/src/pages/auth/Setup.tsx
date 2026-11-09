import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { setupService } from '../../services/setup.service.ts';
import { useAuthStore } from '../../store/auth.store.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import {
  PASSWORD_MIN_LENGTH,
  setupDetailsSchema,
  setupTokenSchema,
  type SetupDetailsValues,
  type SetupTokenValues,
} from '../../lib/schemas.ts';
import { Field } from '../../components/ui/Form.tsx';
import { AuthError, AuthInput, AuthLayout, AuthPasswordInput, AuthSubmit } from './AuthLayout.tsx';

export const Setup: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [step, setStep] = useState<'token' | 'details' | 'done'>('token');
  const [token, setToken] = useState('');

  const tokenForm = useForm({
    resolver: zodResolver(setupTokenSchema),
    mode: 'onTouched',
    defaultValues: { token: '' },
  });

  const detailsForm = useForm({
    resolver: zodResolver(setupDetailsSchema),
    mode: 'onTouched',
    defaultValues: {
      adminName: '',
      email: '',
      password: '',
      confirmPassword: '',
      orgName: '',
      baseUrl: window.location.origin,
    },
  });

  const showIfAlreadyDone = (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      setStep('done');
      return true;
    }
    return false;
  };

  const onVerify = async ({ token: cleaned }: SetupTokenValues) => {
    try {
      await setupService.verifyToken(cleaned);
      setToken(cleaned);
      setStep('details');
    } catch (err: unknown) {
      if (!showIfAlreadyDone(err)) {
        tokenForm.setError('root', {
          message: apiErrorMessage(err, 'The setup token was not accepted.'),
        });
      }
    }
  };

  const onComplete = async (values: SetupDetailsValues) => {
    try {
      const session = await setupService.complete({
        token,
        adminName: values.adminName,
        email: values.email,
        password: values.password,
        orgName: values.orgName,
        baseUrl: values.baseUrl,
      });
      login(session.accessToken, session.user);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (!showIfAlreadyDone(err)) {
        detailsForm.setError('root', {
          message: apiErrorMessage(err, 'Setup could not be completed.'),
        });
      }
    }
  };

  if (step === 'done') {
    return (
      <AuthLayout title="Setup Complete" subtitle="This SIEMple install has already been set up.">
        <Link to="/login" className="block text-center text-sm text-accent hover:underline">
          Go to sign in
        </Link>
      </AuthLayout>
    );
  }

  if (step === 'token') {
    const { errors, isSubmitting } = tokenForm.formState;
    return (
      <AuthLayout
        title="First-Run Setup"
        subtitle="Enter the setup token printed in the server log when SIEMple started."
      >
        <form onSubmit={tokenForm.handleSubmit(onVerify)} noValidate className="space-y-3">
          <AuthInput
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="Setup token"
            aria-label="Setup token"
            className="font-mono text-xs"
            invalid={!!errors.token}
            {...tokenForm.register('token')}
          />
          <AuthError message={errors.token?.message ?? null} />
          <p className="text-xs text-subtle">
            Lost it? Run <code className="font-mono text-muted">npm run setup-token</code> in the
            backend folder on the server to print a new one.
          </p>
          <AuthError message={errors.root?.message ?? null} />
          <AuthSubmit disabled={isSubmitting}>{isSubmitting ? 'Checking…' : 'Continue'}</AuthSubmit>
        </form>
      </AuthLayout>
    );
  }

  const { register } = detailsForm;
  const { errors, isSubmitting } = detailsForm.formState;

  return (
    <AuthLayout
      title="Create the First Administrator"
      subtitle="This account can add analysts and other administrators."
    >
      <form onSubmit={detailsForm.handleSubmit(onComplete)} noValidate className="space-y-4">
        <fieldset className="space-y-3">
          <legend className="mb-2 font-mono text-[10px] uppercase tracking-[1px] text-muted">
            Administrator
          </legend>
          <Field label="Full name" mono error={errors.adminName?.message}>
            <AuthInput
              autoFocus
              autoComplete="name"
              invalid={!!errors.adminName}
              {...register('adminName')}
            />
          </Field>
          <Field label="Email" mono error={errors.email?.message}>
            <AuthInput
              type="email"
              autoComplete="email"
              invalid={!!errors.email}
              {...register('email')}
            />
          </Field>
          <Field
            label={`Password (min ${PASSWORD_MIN_LENGTH} characters)`}
            mono
            error={errors.password?.message}
          >
            <AuthPasswordInput
              autoComplete="new-password"
              invalid={!!errors.password}
              {...register('password')}
            />
          </Field>
          <Field label="Confirm password" mono error={errors.confirmPassword?.message}>
            <AuthPasswordInput
              autoComplete="new-password"
              invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
          </Field>
        </fieldset>

        <fieldset className="space-y-3 border-t border-line pt-4">
          <legend className="mb-2 font-mono text-[10px] uppercase tracking-[1px] text-muted">
            Organization
          </legend>
          <Field label="Organization name" mono error={errors.orgName?.message}>
            <AuthInput
              autoComplete="organization"
              invalid={!!errors.orgName}
              {...register('orgName')}
            />
          </Field>
          <Field
            label="SIEMple address"
            mono
            hint="Used in the links SIEMple emails to people."
            error={errors.baseUrl?.message}
          >
            <AuthInput
              type="url"
              className="font-mono text-xs"
              invalid={!!errors.baseUrl}
              {...register('baseUrl')}
            />
          </Field>
        </fieldset>

        <AuthError message={errors.root?.message ?? null} />
        <AuthSubmit disabled={isSubmitting}>
          {isSubmitting ? 'Setting up…' : 'Complete setup & sign in'}
        </AuthSubmit>
      </form>
    </AuthLayout>
  );
};
