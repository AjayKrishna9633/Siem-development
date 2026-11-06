import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import axios from 'axios';
import { setupService } from '../../services/setup.service.ts';
import { useAuthStore } from '../../store/auth.store.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { personFieldErrors } from '../../lib/validation.ts';
import { PASSWORD_MIN_LENGTH, newPasswordError } from '../../lib/password.ts';
import { Field, Select } from '../../components/ui/Form.tsx';
import { AuthError, AuthInput, AuthLayout, AuthPasswordInput, AuthSubmit } from './AuthLayout.tsx';

const SETUP_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

const timeZoneOptions = (preferred: string): string[] => {
  const zones = Intl.supportedValuesOf('timeZone');
  return [...new Set([preferred, 'UTC', ...zones])];
};

const firstProblem = (...problems: (string | null | undefined)[]) =>
  problems.find((p) => !!p) ?? null;

export const Setup: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [step, setStep] = useState<'token' | 'details' | 'done'>('token');
  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(false);

  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones = useMemo(() => timeZoneOptions(browserZone), [browserZone]);

  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [baseUrl, setBaseUrl] = useState(window.location.origin);
  const [timezone, setTimezone] = useState(browserZone);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const showIfAlreadyDone = (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      setStep('done');
      return true;
    }
    return false;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = token.trim().toLowerCase();
    if (!SETUP_TOKEN_PATTERN.test(cleaned)) {
      return setError(
        'The setup token is 64 characters (0-9 and a-f). Copy it from the server log.',
      );
    }

    setVerifying(true);
    setError(null);
    try {
      await setupService.verifyToken(cleaned);
      setToken(cleaned);
      setStep('details');
    } catch (err: unknown) {
      if (!showIfAlreadyDone(err))
        setError(apiErrorMessage(err, 'The setup token was not accepted.'));
    } finally {
      setVerifying(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    const person = personFieldErrors(adminName, email);
    const problem = firstProblem(
      person.name,
      person.email,
      newPasswordError(password, confirmPassword),
      orgName.trim().length < 2 ? 'Enter an organization name of at least 2 characters.' : null,
      /^https?:\/\/\S+$/.test(baseUrl.trim())
        ? null
        : 'Enter the full address SIEMple is reached at, like https://siem.example.com.',
    );
    if (problem) return setError(problem);

    setSubmitting(true);
    setError(null);
    try {
      const session = await setupService.complete({
        token,
        adminName: adminName.trim(),
        email: email.trim(),
        password,
        orgName: orgName.trim(),
        baseUrl: baseUrl.trim(),
        timezone,
      });
      login(session.accessToken, session.user);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (!showIfAlreadyDone(err)) setError(apiErrorMessage(err, 'Setup could not be completed.'));
    } finally {
      setSubmitting(false);
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
    return (
      <AuthLayout
        title="First-Run Setup"
        subtitle="Enter the setup token printed in the server log when SIEMple started."
      >
        <form onSubmit={handleVerify} className="space-y-3">
          <AuthInput
            required
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Setup token"
            aria-label="Setup token"
            className="font-mono text-xs"
          />
          <p className="text-xs text-subtle">
            Lost it? Run <code className="font-mono text-muted">npm run setup-token</code> in the
            backend folder on the server to print a new one.
          </p>
          <AuthError message={error} />
          <AuthSubmit disabled={verifying || !token.trim()}>
            {verifying ? 'Checking…' : 'Continue'}
          </AuthSubmit>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create the First Administrator"
      subtitle="This account can add analysts and other administrators."
    >
      <form onSubmit={handleComplete} noValidate className="space-y-4">
        <fieldset className="space-y-3">
          <legend className="mb-2 font-mono text-[10px] uppercase tracking-[1px] text-muted">
            Administrator
          </legend>
          <Field label="Full name" mono>
            <AuthInput
              autoFocus
              autoComplete="name"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
            />
          </Field>
          <Field label="Email" mono>
            <AuthInput
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={`Password (min ${PASSWORD_MIN_LENGTH} characters)`} mono>
            <AuthPasswordInput
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm password" mono>
            <AuthPasswordInput
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
        </fieldset>

        <fieldset className="space-y-3 border-t border-line pt-4">
          <legend className="mb-2 font-mono text-[10px] uppercase tracking-[1px] text-muted">
            Organization
          </legend>
          <Field label="Organization name" mono>
            <AuthInput
              autoComplete="organization"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </Field>
          <Field label="SIEMple address" mono hint="Used in the links SIEMple emails to people.">
            <AuthInput
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="font-mono text-xs"
            />
          </Field>
          <Field label="Time zone" mono>
            <Select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-10 bg-canvas/70"
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </Select>
          </Field>
        </fieldset>

        <AuthError message={error} />
        <AuthSubmit disabled={submitting}>
          {submitting ? 'Setting up…' : 'Complete setup & sign in'}
        </AuthSubmit>
      </form>
    </AuthLayout>
  );
};
