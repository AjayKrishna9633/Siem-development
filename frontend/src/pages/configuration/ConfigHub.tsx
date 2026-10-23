import React from 'react';
import { Search } from 'lucide-react';
import { HubCard, HubLayout, WindowPreview } from '../../components/ui/Hub.tsx';
import { RingGauge } from '../../components/ui/RingGauge.tsx';

export const ConfigHub: React.FC = () => (
  <HubLayout
    title="Configuration Assessment Hub"
    description="Select a module below to analyze configuration compliance or investigate historical state changes across the infrastructure."
  >
    <div className="grid gap-6 md:grid-cols-2">
      <HubCard
        to="/configuration/dashboard"
        title="Security Posture Dashboard"
        description="View high-level compliance scores, visual KPIs, and top host violators."
        tags={['CIS benchmarks', 'Custom policies']}
        visual={
          <RingGauge size={104} stroke={9} percent={68} color="#3b82f6" track="#3b82f6">
            <span className="text-xl text-ink">68%</span>
            <span className="font-mono text-[9px] uppercase text-low">Compliant</span>
          </RingGauge>
        }
      />
      <HubCard
        to="/configuration/events"
        title="Event Forensics"
        description="Deep dive into raw configuration logs, timestamps, and search historical data."
        tags={['Raw logs', 'Timeline']}
        visual={
          <div className="relative">
            <WindowPreview className="w-28" />
            <span className="absolute -bottom-2 -right-3 flex size-8 items-center justify-center rounded border border-line-strong bg-raised text-ink">
              <Search className="size-4" />
            </span>
          </div>
        }
      />
    </div>
  </HubLayout>
);
