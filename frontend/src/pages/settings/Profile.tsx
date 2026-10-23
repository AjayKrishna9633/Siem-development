import React, { useEffect, useState } from 'react';
import { CircleCheck, Info, Mail, TriangleAlert } from 'lucide-react';
import { Panel, MonoLabel } from '../../components/ui/Panel.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Input } from '../../components/ui/Form.tsx';
import { useAuthStore } from '../../store/auth.store.ts';
import { authService } from '../../services/auth.service.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { roleLabel } from '../../lib/roles.ts';

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}, ${d.toISOString().slice(11, 16)} UTC`;
};

export const Profile: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [username, setUsername] = useState(user?.username ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Session payloads carry only identity fields; load audit timestamps from /me
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
    <form onSubmit={handleSave} className="mx-auto w-full max-w-[640px] space-y-6 px-6 py-8">
      <div className="border-b border-line pb-4">
        <h1 className="text-xl font-semibold text-ink">
          {user.role === 'analyst' ? 'Analyst Profile' : 'Profile'}
        </h1>
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
          <p className="text-sm text-muted">
            {user.organizationId
              ? `Organization ${user.organizationId.slice(0, 8)}`
              : 'Platform scope'}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-subtle">
            <Info className="size-3.5" /> Your role is managed by an administrator. Contact your SOC
            manager for permission changes.
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
          <label className="block space-y-1.5">
            <MonoLabel>Email address</MonoLabel>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input value={user.email} disabled className="pl-9" />
            </div>
            <span className="flex items-center gap-1.5 text-[11px] text-subtle">
              <TriangleAlert className="size-3" /> Email changes require an administrator and
              re-verification.
            </span>
          </label>
        </Panel>

        <Panel className="space-y-4 bg-raised/50 p-5">
          <h2 className="border-b border-line-strong pb-3 text-sm font-semibold text-ink">
            Session Audit
          </h2>
          <div>
            <MonoLabel>Account created</MonoLabel>
            <p className="mt-1 border-l border-line-strong pl-2 text-sm text-ink">
              {formatDate(user.createdAt)}
            </p>
          </div>
          <div>
            <MonoLabel>Last login</MonoLabel>
            <p className="mt-1 border-l border-accent pl-2 text-sm text-ink">
              {formatDate(user.lastLoginAt)}
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
  );
};
