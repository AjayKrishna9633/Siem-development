import React, { useCallback, useState } from 'react';
import { KeyRound, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Page, PageHeader } from '@/components/ui/PageHeader.tsx';
import { Panel, PanelHeader } from '@/components/ui/Panel.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog.tsx';
import { LocalTime } from '@/components/common/LocalTime.tsx';
import { useRemote } from '@/hooks/useRemote.ts';
import { apiErrorMessage } from '@/lib/errors.ts';
import { emailSettingsService } from '../api/emailSettingsApi.ts';
import { SECURITY_OPTIONS } from '../constants/emailSettings.ts';
import { EmailStatusBadge } from '../components/EmailStatusBadge.tsx';
import { EmailSettingsForm } from '../components/EmailSettingsForm.tsx';
import { TestEmailPanel } from '../components/TestEmailPanel.tsx';
import type { IEmailSettings } from '../types/emailSettings.types.ts';

const EnvSummary: React.FC<{ settings: IEmailSettings }> = ({ settings }) => (
  <div className="space-y-3">
    <p className="text-sm text-muted">
      SMTP_HOST is set in the server&apos;s <code className="font-mono">.env</code>, so these
      settings are read-only here. To change them, edit <code className="font-mono">.env</code> and
      restart SIEMple, or remove SMTP_HOST to manage email on this page.
    </p>
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {[
        ['Host', `${settings.host ?? '—'}:${settings.port ?? '—'}`],
        ['Security', SECURITY_OPTIONS.find((o) => o.value === settings.security)?.label ?? '—'],
        ['Username', settings.username ?? '—'],
        ['From', settings.fromAddress ?? '—'],
      ].map(([label, value]) => (
        <div key={label}>
          <dt className="font-mono text-[10px] uppercase tracking-[0.5px] text-muted">{label}</dt>
          <dd className="mt-0.5 font-mono text-xs text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  </div>
);

export const EmailSettingsPage: React.FC = () => {
  const fetchSettings = useCallback(() => emailSettingsService.get(), []);
  const { data, loading, error } = useRemote(fetchSettings, 'Failed to load the email settings.');
  const [saved, setSaved] = useState<IEmailSettings | null>(null);
  const [confirmingDisable, setConfirmingDisable] = useState(false);
  const settings = saved ?? data;

  const afterSave = (next: IEmailSettings) => setSaved(next);
  // Refreshes the last-test line in place; reloading through useRemote would briefly fall back to
  // the first load and unmount the test result.
  const afterTest = () => {
    emailSettingsService
      .get()
      .then(setSaved)
      .catch(() => {});
  };

  const disable = async () => {
    try {
      setSaved(await emailSettingsService.disable());
      toast.success('Email turned off. Invites and resets show a link to copy again.');
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'Email could not be turned off.'));
    } finally {
      setConfirmingDisable(false);
    }
  };

  return (
    <Page className="max-w-4xl">
      <PageHeader
        title="Email"
        description="The mail server SIEMple uses for invitations, password resets and security notices."
        crumbs={[{ label: 'Settings' }, { label: 'Email' }]}
        icon={<Mail className="size-5" />}
        actions={settings && <EmailStatusBadge source={settings.source} />}
      />

      {error && (
        <p
          role="alert"
          className="rounded border border-high/40 bg-high/10 px-3 py-2 text-sm text-high"
        >
          {error}
        </p>
      )}
      {loading && !settings && <p className="font-mono text-xs text-muted">LOADING...</p>}

      {settings && (
        <>
          {!settings.encryptionKeyConfigured && settings.source !== 'env' && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded border border-high/40 bg-high/10 px-3 py-2 text-sm text-high"
            >
              <KeyRound className="mt-0.5 size-4 shrink-0" />
              Encryption key not configured: SETTINGS_ENCRYPTION_KEY isn&apos;t set on the server,
              so the SMTP password can&apos;t be stored and saving is turned off. Add it to .env and
              restart SIEMple.
            </p>
          )}

          <Panel>
            <PanelHeader title="Mail server" />
            <div className="p-5">
              {settings.source === 'env' ? (
                <EnvSummary settings={settings} />
              ) : (
                <EmailSettingsForm
                  key={`${settings.source}-${settings.passwordSet}`}
                  settings={settings}
                  onSaved={afterSave}
                />
              )}
            </div>
          </Panel>

          {settings.source !== 'none' && (
            <Panel>
              <PanelHeader
                title="Test"
                subtitle={
                  settings.lastTest ? (
                    <>
                      Last test {settings.lastTest.ok ? 'succeeded' : 'failed'}{' '}
                      <LocalTime value={settings.lastTest.at} />
                    </>
                  ) : (
                    'Not tested since the last change'
                  )
                }
              />
              <div className="p-5">
                <TestEmailPanel onTested={afterTest} />
              </div>
            </Panel>
          )}

          {settings.source === 'database' && (
            <Panel className="flex flex-wrap items-center justify-between gap-3 p-5">
              <p className="text-sm text-muted">
                Turning email off deletes the saved password. Invites and resets go back to a link
                you copy and send yourself.
              </p>
              <Button variant="danger" onClick={() => setConfirmingDisable(true)}>
                Disable email
              </Button>
            </Panel>
          )}
        </>
      )}

      {confirmingDisable && (
        <ConfirmDialog
          title="Disable email?"
          confirmLabel="Disable email"
          onConfirm={disable}
          onCancel={() => setConfirmingDisable(false)}
        >
          SIEMple stops sending email and deletes the saved SMTP password. You can set it up again
          at any time.
        </ConfirmDialog>
      )}
    </Page>
  );
};
