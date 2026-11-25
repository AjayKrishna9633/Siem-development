import React, { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button.tsx';
import { Field, Input, Select } from '@/components/ui/Form.tsx';
import { apiErrorMessage } from '@/lib/errors.ts';
import { cn } from '@/lib/cn.ts';
import { emailSettingsService } from '../api/emailSettingsApi.ts';
import {
  DEFAULT_PORTS,
  GMAIL_APP_PASSWORD_URL,
  PRESETS,
  SECURITY_OPTIONS,
  type PresetId,
} from '../constants/emailSettings.ts';
import type { IEmailSettings, SmtpSecurity } from '../types/emailSettings.types.ts';

interface IEmailSettingsFormProps {
  settings: IEmailSettings;
  onSaved: (settings: IEmailSettings) => void;
}

const presetFor = (host: string): PresetId =>
  PRESETS.find((p) => p.server?.host === host)?.id ?? 'custom';

export const EmailSettingsForm: React.FC<IEmailSettingsFormProps> = ({ settings, onSaved }) => {
  const [host, setHost] = useState(settings.host ?? '');
  const [port, setPort] = useState(settings.port ? String(settings.port) : '587');
  const [security, setSecurity] = useState<SmtpSecurity>(settings.security);
  const [username, setUsername] = useState(settings.username ?? '');
  // Never prefilled: a saved password shows as a placeholder until Change is pressed.
  const [changingPassword, setChangingPassword] = useState(!settings.passwordSet);
  const [password, setPassword] = useState('');
  const [fromName, setFromName] = useState(settings.fromName ?? '');
  const [fromAddress, setFromAddress] = useState(settings.fromAddress ?? '');
  const [preset, setPreset] = useState<PresetId>(presetFor(settings.host ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keyMissing = !settings.encryptionKeyConfigured;

  const choosePreset = (id: PresetId) => {
    setPreset(id);
    const server = PRESETS.find((p) => p.id === id)?.server;
    if (!server) return;
    setHost(server.host);
    setPort(String(server.port));
    setSecurity(server.security);
  };

  const chooseSecurity = (value: SmtpSecurity) => {
    setSecurity(value);
    const suggested = SECURITY_OPTIONS.find((o) => o.value === value)?.port;
    if (suggested && (port === '' || DEFAULT_PORTS.has(Number(port)))) setPort(String(suggested));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await emailSettingsService.save({
        host: host.trim(),
        port: Number(port),
        security,
        username: username.trim(),
        password: changingPassword ? password : '',
        fromAddress: fromAddress.trim(),
        fromName: fromName.trim(),
      });
      setPassword('');
      setChangingPassword(!saved.passwordSet);
      toast.success('Email settings saved. Send a test email to check them.');
      onSaved(saved);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'The email settings could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void save(e)} className="space-y-5">
      <div className="space-y-1.5">
        <span className="block text-sm text-ink">Provider</span>
        <div role="radiogroup" aria-label="Provider" className="inline-flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={preset === p.id}
              onClick={() => choosePreset(p.id)}
              className={cn(
                'h-8 rounded border px-3 text-sm transition-colors',
                preset === p.id
                  ? 'border-accent/50 bg-line-strong text-ink'
                  : 'border-line-strong bg-canvas text-muted hover:text-ink',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'gmail' && (
          <p className="text-xs text-muted">
            Gmail needs an App Password, not your normal password: turn on 2-Step Verification, then
            create one under Google Account → Security → App passwords.{' '}
            <a
              href={GMAIL_APP_PASSWORD_URL}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              How to create an App Password
            </a>
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr_8rem_14rem]">
        <Field label="SMTP host" required>
          <Input
            value={host}
            onChange={(e) => {
              setHost(e.target.value);
              setPreset('custom');
            }}
            placeholder="smtp.example.com"
            autoComplete="off"
            spellCheck={false}
            required
          />
        </Field>
        <Field label="Port" required>
          <Input
            type="number"
            min={1}
            max={65535}
            value={port}
            onChange={(e) => setPort(e.target.value)}
            required
          />
        </Field>
        <Field label="Security">
          <Select
            aria-label="Security"
            value={security}
            onChange={(e) => chooseSecurity(e.target.value as SmtpSecurity)}
          >
            {SECURITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {security === 'none' && (
        <p className="flex items-start gap-2 text-xs text-high">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          Without encryption, the password and every email cross the network in plain text. Use it
          only for a mail relay on a trusted network.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Username"
          hint="Usually the full email address. Leave empty if the server needs no login."
        >
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Field label="Password">
          {changingPassword ? (
            <div className="flex gap-2">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                aria-label="Password"
              />
              {settings.passwordSet && (
                <Button
                  onClick={() => {
                    setPassword('');
                    setChangingPassword(false);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Input value="" placeholder="•••• saved" disabled aria-label="Saved password" />
              <Button onClick={() => setChangingPassword(true)}>Change</Button>
            </div>
          )}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="From name" hint="Shown as the sender, e.g. SIEMple Alerts.">
          <Input value={fromName} onChange={(e) => setFromName(e.target.value)} maxLength={120} />
        </Field>
        <Field label="From address" required hint="Must be an address this account may send from.">
          <Input
            type="email"
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            placeholder="siem@example.com"
            required
          />
        </Field>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded border border-high/40 bg-high/10 px-3 py-2 text-sm text-high"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          disabled={saving || keyMissing}
          title={keyMissing ? 'SETTINGS_ENCRYPTION_KEY is not set on the server' : undefined}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
};
