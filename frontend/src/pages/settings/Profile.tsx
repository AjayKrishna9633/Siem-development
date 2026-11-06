import React, { useEffect, useState } from 'react';
import { CircleCheck, Info, KeyRound, Mail, TriangleAlert } from 'lucide-react';
import { ChangePasswordDialog } from '../../components/profile/ChangePasswordDialog.tsx';
import { ChangeEmailDialog } from '../../components/profile/ChangeEmailDialog.tsx';
import { Panel, MonoLabel } from '../../components/ui/Panel.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Input } from '../../components/ui/Form.tsx';
import { useAuthStore } from '../../store/auth.store.ts';
import { authService } from '../../services/auth.service.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { roleLabel } from '../../lib/roles.ts';
import { can } from '../../lib/permissions.ts';
import { LocalTime } from '../../components/common/LocalTime.tsx';

export const Profile: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [username, setUsername] = useState(user?.username ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dialog, setDialog] = useState<'password' | 'email' | null>(null);
  const canChangeEmail = can(user, 'users.manage');

  useEffect(() => {
    let active = true;
    authService
      .getMe()
      .then((me) => {
        if (active) setUser({ ...useAuthStore.getState().user, ...me });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [setUser]);

  if (!user) return null;

  const initials = user.username
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const dirty = username.trim() !== user.username && username.trim().length >= 2;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await authService.updateProfile({ username: username.trim() });
      setUser({ ...user, ...updated });
      setSaved(true);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-6 px-6 py-8">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="border-b border-line pb-4">
          <h1 className="text-xl font-semibold text-ink">Profile</h1>
          <p className="text-sm text-muted">
            Manage personal settings and view session forensic data.
          </p>
        </div>

        <Panel className="flex items-center gap-5 bg-raised/50 p-5">
          <span className="flex size-20 shrink-0 items-center justify-center rounded border border-line-strong bg-canvas text-xl font-semibold text-accent">
            {initials || '?'}
          </span>
          <div className="space-y-1.5">
            <p className="flex items-center gap-3 text-lg font-medium text-ink">
              {user.username}
              <span className="rounded-sm border border-line-strong bg-raised px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.5px] text-muted">
                {roleLabel[user.role]}
              </span>
            </p>
            <p className="flex items-center gap-1.5 text-xs text-subtle">
              <Info className="size-3.5" /> Your role is managed by an administrator. Contact your
              SOC manager for permission changes.
            </p>
          </div>
        </Panel>

        <div className="grid gap-5 md:grid-cols-[1fr_200px]">
          <Panel className="space-y-4 bg-raised/50 p-5">
            <h2 className="border-b border-line-strong pb-3 text-sm font-semibold text-ink">
              Contact Information
            </h2>
            <label className="block space-y-1.5">
              <MonoLabel>Full name</MonoLabel>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <div className="space-y-1.5">
              <MonoLabel>Email address</MonoLabel>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                  <Input value={user.email} disabled className="pl-9" aria-label="Email address" />
                </div>
                {canChangeEmail && (
                  <Button variant="outline" onClick={() => setDialog('email')}>
                    Change
                  </Button>
                )}
              </div>
              <span className="flex items-center gap-1.5 text-[11px] text-subtle">
                <TriangleAlert className="size-3" />
                {canChangeEmail
                  ? 'Changing your email needs your password and a code sent to the new address.'
                  : 'Your email is managed by an administrator.'}
              </span>
            </div>
          </Panel>

          <Panel className="space-y-4 bg-raised/50 p-5">
            <h2 className="border-b border-line-strong pb-3 text-sm font-semibold text-ink">
              Session Audit
            </h2>
            <div>
              <MonoLabel>Account created</MonoLabel>
              <p className="mt-1 border-l border-line-strong pl-2 text-sm text-ink">
                <LocalTime value={user.createdAt} />
              </p>
            </div>
            <div>
              <MonoLabel>Last login</MonoLabel>
              <p className="mt-1 border-l border-accent pl-2 text-sm text-ink">
                <LocalTime value={user.lastLoginAt} empty="Never" />
              </p>
            </div>
            <div>
              <MonoLabel>Status</MonoLabel>
              <p className="mt-1 border-l border-line-strong pl-2 font-mono text-xs capitalize text-ink">
                {user.status ?? 'active'}
              </p>
            </div>
          </Panel>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line pt-5">
          {error && <span className="mr-auto text-sm text-critical">{error}</span>}
          {saved && (
            <span className="mr-auto flex items-center gap-1.5 text-sm text-success">
              <CircleCheck className="size-4" /> Profile updated
            </span>
          )}
          <Button
            variant="outline"
            mono
            disabled={!dirty || saving}
            onClick={() => setUsername(user.username)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!dirty || saving}
            className="bg-low text-white hover:bg-low/90 disabled:bg-low/30 disabled:text-ink/60"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>

      <Panel className="space-y-4 bg-raised/50 p-5">
        <h2 className="border-b border-line-strong pb-3 text-sm font-semibold text-ink">
          Security
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 size-4 text-muted" />
            <div>
              <p className="text-sm text-ink">Password</p>
              <p className="text-xs text-muted">
                Confirmed with a code sent to your email. Other devices are signed out afterwards.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setDialog('password')}>
            Change password
          </Button>
        </div>
      </Panel>

      {dialog === 'password' && <ChangePasswordDialog onClose={() => setDialog(null)} />}
      {dialog === 'email' && canChangeEmail && (
        <ChangeEmailDialog onClose={() => setDialog(null)} />
      )}
    </div>
  );
};
