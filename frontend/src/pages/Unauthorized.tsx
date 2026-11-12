import React from 'react';
import { Link } from 'react-router';
import { ShieldX } from 'lucide-react';
import { EmptyState } from '../components/ui/Misc.tsx';
import { Button } from '../components/ui/Button.tsx';

export const Unauthorized: React.FC = () => (
  <div className="flex min-h-[70vh] items-center justify-center px-6">
    <EmptyState
      icon={<ShieldX className="size-5 text-critical" />}
      title="Access restricted"
      description="Your role doesn't grant access to this area. Ask an administrator if you need it."
      action={
        <Link to="/">
          <Button variant="primary">Back to home</Button>
        </Link>
      }
    />
  </div>
);
