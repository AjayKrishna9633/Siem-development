import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CircleCheck } from 'lucide-react';
import { Page, PageHeader } from '../../components/ui/PageHeader.tsx';
import { Panel } from '../../components/ui/Panel.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { InviteUserForm } from '../../components/users/InviteUserForm.tsx';
import { InviteDeliveryDetails } from '../../components/common/InviteDeliveryDetails.tsx';
import type { IInviteResult } from '../../types/auth.ts';
import { roleLabel } from '../../lib/roles.ts';

export const InviteUser: React.FC = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<IInviteResult | null>(null);

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'User Management', to: '/users' }, { label: 'Invite User' }]}
        title="Invite User"
        description="Invite an analyst or administrator to SIEMple."
      />

      <Panel className="mx-auto max-w-[620px] bg-raised/50 p-5">
        {result ? (
          <div className="space-y-4 py-2">
            <p className="flex items-center gap-2 text-ink">
              <CircleCheck className="size-5 text-success" />
              <span>
                <span className="font-mono text-sm">{result.user.email}</span> was invited as{' '}
                {roleLabel[result.user.role]}
              </span>
            </p>
            <InviteDeliveryDetails delivery={result.invite} email={result.user.email} />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setResult(null)}>
                Invite another
              </Button>
              <Link to="/users">
                <Button variant="primary">Back to users</Button>
              </Link>
            </div>
          </div>
        ) : (
          <InviteUserForm onInvited={setResult} onCancel={() => navigate('/users')} />
        )}
      </Panel>
    </Page>
  );
};
