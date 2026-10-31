import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Page, PageHeader } from '../../components/ui/PageHeader.tsx';
import { Panel } from '../../components/ui/Panel.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { ActivationResult } from '../../components/common/ActivationResult.tsx';
import { AddUserForm } from '../../components/users/AddUserForm.tsx';
import type { ITeamMemberWithActivation } from '../../types/auth.ts';

export const AddUser: React.FC = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<ITeamMemberWithActivation | null>(null);

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'User Management', to: '/users' }, { label: 'Add User' }]}
        title="Add User"
        description="Add an analyst or administrator to SIEMple."
      />

      <Panel className="mx-auto max-w-[620px] bg-raised/50 p-5">
        {result ? (
          <ActivationResult
            title={
              <>
                <span className="font-medium">{result.member.username}</span> was added
              </>
            }
            recipient={result.member}
            grant={result.activation}
          >
            <Button variant="secondary" onClick={() => setResult(null)}>
              Add another
            </Button>
            <Link to="/users">
              <Button variant="primary">Back to users</Button>
            </Link>
          </ActivationResult>
        ) : (
          <AddUserForm onCreated={setResult} onCancel={() => navigate('/users')} />
        )}
      </Panel>
    </Page>
  );
};
