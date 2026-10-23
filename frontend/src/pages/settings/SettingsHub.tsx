import React from 'react';
import { Link } from 'react-router';
import { ArrowRight, History, UserRound, Users } from 'lucide-react';
import { HubLayout } from '../../components/ui/Hub.tsx';
import { useAuthStore } from '../../store/auth.store.ts';
import { ADMIN_ROLES } from '../../lib/roles.ts';

export const SettingsHub: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = !!user && ADMIN_ROLES.includes(user.role);

  const items = [
    {
      to: '/profile',
      title: 'Profile',
      description: 'Update your display name and review session history.',
      icon: <UserRound className="size-5" />,
      show: true,
    },
    {
      to: '/settings/users',
      title: 'User Management',
      description: 'Invite analysts and administrators, and review account status.',
      icon: <Users className="size-5" />,
      show: isAdmin,
    },
    {
      to: '/settings/audit',
      title: 'Audit Log',
      description: 'Append-only record of privileged actions across the platform.',
      icon: <History className="size-5" />,
      show: isAdmin,
    },
  ].filter((i) => i.show);

  return (
    <HubLayout
      title="Settings"
      description="Manage your account and, if you are an administrator, the people and records of this workspace."
    >
      <div className="mx-auto grid max-w-3xl gap-4">
        {items.map((i) => (
          <Link
            key={i.to}
            to={i.to}
            className="group flex items-center gap-4 rounded-md border border-line-strong/70 bg-raised/60 p-5 transition-colors hover:border-accent/50"
          >
            <span className="flex size-11 items-center justify-center rounded border border-line-strong bg-canvas text-accent">
              {i.icon}
            </span>
            <span className="flex-1">
              <span className="block font-semibold text-ink">{i.title}</span>
              <span className="block text-sm text-muted">{i.description}</span>
            </span>
            <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
          </Link>
        ))}
      </div>
    </HubLayout>
  );
};
