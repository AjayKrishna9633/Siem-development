import React from 'react';
import { Routes, Route, Navigate } from 'react-router';
import {
  useAuthStore,
  ProtectedRoute,
  homePathFor,
  Login,
  Setup,
  AcceptInvite,
  ForgotPassword,
  ResetPassword,
} from '@/features/auth';
import { AppShell } from './layout/AppShell.tsx';
import { Unauthorized } from '@/pages/Unauthorized.tsx';
import { UserManagement } from '@/pages/settings/UserManagement.tsx';
import { InviteUser } from '@/pages/settings/InviteUser.tsx';
import { Profile } from '@/pages/settings/Profile.tsx';

const RootRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={homePathFor(user)} replace />;
};

const CanManageUsers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute permission="users.manage">{children}</ProtectedRoute>
);

export const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/setup" element={<Setup />} />
    <Route path="/accept-invite" element={<AcceptInvite />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />

    <Route
      element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }
    >
      <Route path="/profile" element={<Profile />} />
      <Route
        path="/users"
        element={
          <CanManageUsers>
            <UserManagement />
          </CanManageUsers>
        }
      />
      <Route
        path="/users/new"
        element={
          <CanManageUsers>
            <InviteUser />
          </CanManageUsers>
        }
      />
      <Route path="/unauthorized" element={<Unauthorized />} />
    </Route>

    <Route path="/" element={<RootRedirect />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
