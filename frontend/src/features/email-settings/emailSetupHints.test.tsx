import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { useAuthStore } from '@/features/auth';
import type { Permission, UserRole } from '@/features/auth';
import { LinkDeliveryDetails } from '@/components/common/LinkDeliveryDetails.tsx';
import { TopNavBar } from '@/app/layout/TopNavBar.tsx';

vi.mock('@/features/auth/api/authApi.ts', () => ({ authService: { logout: vi.fn() } }));

const signInAs = (role: UserRole, permissions: Permission[]) =>
  useAuthStore.setState({
    user: { id: 'u1', email: `${role}@example.com`, username: role, role, permissions },
    isAuthenticated: true,
    isLoading: false,
  });

const ADMIN: Permission[] = ['users.manage', 'audit.view', 'settings.manage'];
const notEmailed = {
  delivered: false,
  expiresAt: '2026-11-30T10:00:00.000Z',
  link: 'http://x/accept?token=t',
};

describe('email setup hints', () => {
  it('points admins to Settings → Email when an invite could not be emailed', () => {
    signInAs('admin', ADMIN);
    render(
      <MemoryRouter>
        <LinkDeliveryDetails delivery={notEmailed} email="new@example.com" />
      </MemoryRouter>,
    );
    expect(screen.getByText('http://x/accept?token=t')).toBeInTheDocument();
    expect(screen.getByText(/to send invites automatically/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings → Email' })).toHaveAttribute(
      'href',
      '/settings/email',
    );
  });

  it('says nothing when the email was delivered', () => {
    signInAs('admin', ADMIN);
    render(
      <MemoryRouter>
        <LinkDeliveryDetails
          delivery={{ delivered: true, expiresAt: '2026-11-30T10:00:00.000Z' }}
          email="new@example.com"
        />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/settings → email/i)).not.toBeInTheDocument();
  });

  it('shows Settings in the nav to admins only', () => {
    signInAs('admin', ADMIN);
    const { unmount } = render(
      <MemoryRouter>
        <TopNavBar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings/email',
    );
    unmount();

    signInAs('t1_analyst', ['alerts.view']);
    render(
      <MemoryRouter>
        <TopNavBar />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });
});
