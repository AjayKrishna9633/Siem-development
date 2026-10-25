import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Page, PageHeader } from '../../components/ui/PageHeader.tsx';
import { Panel } from '../../components/ui/Panel.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { ActivationResult } from '../../components/common/ActivationResult.tsx';
import { AddCompanyForm } from '../../components/companies/AddCompanyForm.tsx';
import type { ICompanyWithActivation } from '../../types/company.ts';

export const AddCompany: React.FC = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<ICompanyWithActivation | null>(null);

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Company Management', to: '/companies' }, { label: 'Add Company' }]}
        title="Add Company"
        description="Onboard a new company and the admin who will manage its team."
      />

      <Panel className="mx-auto max-w-[620px] bg-raised/50 p-5">
        {result ? (
          <ActivationResult
            title={
              <>
                <span className="font-medium">{result.company.name}</span> was created
              </>
            }
            recipient={result.company.admin}
            grant={result.activation}
          >
            <Button variant="secondary" onClick={() => setResult(null)}>
              Add another
            </Button>
            <Link to="/companies">
              <Button variant="primary">Back to companies</Button>
            </Link>
          </ActivationResult>
        ) : (
          <AddCompanyForm onCreated={setResult} onCancel={() => navigate('/companies')} />
        )}
      </Panel>
    </Page>
  );
};
