import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { ModuleTabs, PageHeader } from '../../components/ui/PageHeader.tsx';

const mitreTabs = [
  { label: 'Dashboard', to: '/mitre/dashboard' },
  { label: 'Intelligence', to: '/mitre/intelligence' },
  { label: 'Framework', to: '/mitre/framework' },
  { label: 'Events', to: '/mitre/events' },
];

export const MitreHeader: React.FC<{ section: string; actions?: React.ReactNode }> = ({
  section,
  actions,
}) => (
  <div className="space-y-4 border-b border-line px-6 pt-5">
    <PageHeader
      crumbs={[
        { label: 'Intelligence' },
        { label: 'MITRE ATT&CK', to: '/mitre' },
        { label: section },
      ]}
      title="MITRE ATT&CK"
      icon={<LayoutGrid className="size-5" />}
      actions={actions}
    />
    <ModuleTabs tabs={mitreTabs} className="border-b-0" />
  </div>
);
