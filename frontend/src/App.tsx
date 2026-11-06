import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useAuthStore } from './store/auth.store.ts';
import { ProtectedRoute } from './components/common/ProtectedRoute.tsx';
import { AppShell } from './components/layout/AppShell.tsx';
import { homePathFor } from './lib/permissions.ts';
import { Login } from './pages/auth/Login.tsx';
import { Setup } from './pages/auth/Setup.tsx';
import { AcceptInvite } from './pages/auth/AcceptInvite.tsx';
import { ForgotPassword } from './pages/auth/ForgotPassword.tsx';
import { ResetPassword } from './pages/auth/ResetPassword.tsx';
import { Unauthorized } from './pages/Unauthorized.tsx';
import { UserManagement } from './pages/settings/UserManagement.tsx';
import { InviteUser } from './pages/settings/InviteUser.tsx';
import { Profile } from './pages/settings/Profile.tsx';

const RootRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={homePathFor(user)} replace />;
};

const CanManageUsers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute permission="users.manage">{children}</ProtectedRoute>
);

export const App: React.FC = () => {
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
};

export default App;
