import React, { useState } from 'react';
import { Modal } from '../ui/Modal.tsx';
import { Button } from '../ui/Button.tsx';
import { FormSection } from '../common/FormSection.tsx';
import { ActivationResult } from '../common/ActivationResult.tsx';
import { RenameCompanyForm } from './RenameCompanyForm.tsx';
import { ReplaceAdminForm } from './ReplaceAdminForm.tsx';
import type { ICompany, ICompanyWithActivation } from '../../types/company.ts';

interface IEditCompanyModalProps {
  company: ICompany;
  onUpdated: (company: ICompany) => void;
  onClose: () => void;
}

export const EditCompanyModal: React.FC<IEditCompanyModalProps> = ({
  company,
  onUpdated,
  onClose,
}) => {
  const [replaced, setReplaced] = useState<ICompanyWithActivation | null>(null);

  const handleReplaced = (result: ICompanyWithActivation) => {
    onUpdated(result.company);
    setReplaced(result);
  };

  return (
    <Modal
      title={`Edit ${company.name}`}
      description="Rename the company or hand it over to a new admin."
      onClose={onClose}
    >
      {replaced ? (
        <ActivationResult
          title={
            <>
              <span className="font-medium">{replaced.company.admin?.username}</span> is the new
              admin
            </>
          }
          recipient={replaced.company.admin}
          grant={replaced.activation}
        >
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </ActivationResult>
      ) : (
        <div className="space-y-6">
          <FormSection title="Company details">
            <RenameCompanyForm company={company} onSaved={onUpdated} />
          </FormSection>

          <FormSection title="Company admin">
            {company.status === 'deactivated' ? (
              <p className="text-sm text-muted">
                Reactivate the company before changing its admin, so the new admin can sign in.
              </p>
            ) : (
              <ReplaceAdminForm company={company} onReplaced={handleReplaced} />
            )}
          </FormSection>
        </div>
      )}
    </Modal>
  );
};
