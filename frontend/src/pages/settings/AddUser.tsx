import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Check, CircleCheck, Copy, Info } from 'lucide-react';
import { Page, PageHeader } from '../../components/ui/PageHeader.tsx';
import { Panel } from '../../components/ui/Panel.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Field, Input, Select } from '../../components/ui/Form.tsx';
import { useAuthStore } from '../../store/auth.store.ts';
import { authService } from '../../services/auth.service.ts';
import type { IInviteResponse, UserRole } from '../../types/auth.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { roleLabel } from '../../lib/roles.ts';

const roleHelp: Record<Exclude<UserRole, 'super_admin'>, string> = {
  analyst: 'View and triage alerts. Cannot manage users or edit platform settings.',
  org_admin: 'Manages analysts and settings for a single organization.',
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="border-b border-line-strong pb-2 font-mono text-[11px] uppercase tracking-[1px] text-muted">
    {children}
  </h2>
);

export const AddUser: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // Super admins provision org admins; org admins provision analysts in their own org
  const allowedRoles: Exclude<UserRole, 'super_admin'>[] =
    user?.role === 'super_admin' ? ['org_admin'] : ['analyst'];

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<UserRole, 'super_admin'>>(allowedRoles[0]);
  const [method, setMethod] = useState<'invite' | 'sso'>('invite');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IInviteResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const valid = username.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && method === 'invite';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.inviteUser({
        email: email.trim(),
        username: username.trim(),
        role,
        organizationId: user?.role === 'org_admin' ? user.organizationId : undefined,
      });
      setResult(res);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Failed to create the invitation.'));
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Page>
        <PageHeader
          crumbs={[{ label: 'User Management', to: '/users' }, { label: 'Add User' }]}
          title="Add User"
          description="Provision a new analyst or administrator identity."
          actions={
            !result && (
              <>
                <Button variant="outline" onClick={() => navigate('/users')}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={!valid || submitting}>
                  {submitting ? 'Creating…' : 'Create User'}
                </Button>
              </>
            )
          }
        />

        <Panel className="mx-auto max-w-[620px] space-y-6 bg-raised/50 p-5">
          {result ? (
            <div className="space-y-4 py-2">
              <p className="flex items-center gap-2 text-ink">
                <CircleCheck className="size-5 text-success" /> Invitation created for{' '}
                <span className="font-mono">{result.email}</span>
              </p>
              <p className="text-sm text-muted">
                Share this one-time link with {result.username}. They&apos;ll set a passphrase and
                join as {roleLabel[result.role]}.
              </p>
              <div className="flex items-center gap-2 rounded border border-line-strong bg-canvas p-2">
                <code className="flex-1 truncate px-1 font-mono text-xs text-accent">
                  {result.inviteLink}
                </code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={copyLink}
                  icon={
                    copied ? (
                      <Check className="size-3.5 text-success" />
                    ) : (
                      <Copy className="size-3.5" />
                    )
                  }
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setResult(null);
                    setUsername('');
                    setEmail('');
                  }}
                >
                  Invite another
                </Button>
                <Link to="/users">
                  <Button variant="primary">Back to users</Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <section className="space-y-4">
                <SectionTitle>Identity</SectionTitle>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Full Name" required>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. Jane Doe"
                    />
                  </Field>
                  <Field label="Email Address" required>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane.doe@organization.com"
                    />
                  </Field>
                </div>
              </section>

              <section className="space-y-4">
                <SectionTitle>Role assignment</SectionTitle>
                <Field label="System Role" required hint={roleHelp[role]} className="max-w-sm">
                  <Select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Exclude<UserRole, 'super_admin'>)}
                  >
                    {allowedRoles.map((r) => (
                      <option key={r} value={r}>
                        {r === 'analyst' ? 'Tier 1 Analyst' : 'Organization Administrator'}
                      </option>
                    ))}
                  </Select>
                </Field>
              </section>

              <section className="space-y-4">
                <SectionTitle>Provisioning method</SectionTitle>
                <div className="flex gap-6 text-sm">
                  {[
                    { id: 'invite' as const, label: 'Invite link (local account)' },
                    { id: 'sso' as const, label: 'Azure AD' },
                  ].map((m) => (
                    <label key={m.id} className="flex cursor-pointer items-center gap-2 text-ink">
                      <input
                        type="radio"
                        name="method"
                        checked={method === m.id}
                        onChange={() => setMethod(m.id)}
                        className="size-3.5 accent-[#adc6ff]"
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
                <p className="flex gap-3 rounded border border-line-strong bg-canvas/50 p-3 text-sm text-ink">
                  <Info className="mt-0.5 size-4 shrink-0 text-muted" />
                  {method === 'invite'
                    ? 'A one-time invitation link is generated. The user sets their own passphrase when they accept it.'
                    : 'Azure AD provisioning is not configured for this workspace yet. Use an invite link for now.'}
                </p>
              </section>

              {error && <p className="text-sm text-critical">{error}</p>}
            </>
          )}
        </Panel>
      </Page>
    </form>
  );
};
