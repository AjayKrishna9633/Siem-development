import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useAuthStore } from './store/auth.store.ts';
import { ProtectedRoute } from './components/common/ProtectedRoute.tsx';
import { AppShell } from './components/layout/AppShell.tsx';
import { homePathFor } from './lib/roles.ts';
import { Login } from './pages/auth/Login.tsx';
import { Activate } from './pages/auth/Activate.tsx';
import { ForgotPassword } from './pages/auth/ForgotPassword.tsx';
import { Unauthorized } from './pages/Unauthorized.tsx';
import { UserManagement } from './pages/settings/UserManagement.tsx';
import { AddUser } from './pages/settings/AddUser.tsx';
import { Profile } from './pages/settings/Profile.tsx';

// Admins land on user management, analysts on their profile
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={homePathFor(user.role)} replace />;
};

const AdminOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['admin']}>{children}</ProtectedRoute>
);

export const App: React.FC = () => {
  const restoreSession = useAuthStore((s) => s.restoreSession);

  // The access token is memory-only, so each page load trades the refresh cookie for a new one
  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/activate" element={<Activate />} />
        <Route path="/accept-invite" element={<Navigate to="/activate" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Authenticated account pages */}
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
              <AdminOnly>
                <UserManagement />
              </AdminOnly>
            }
          />
          <Route
            path="/users/new"
            element={
              <AdminOnly>
                <AddUser />
              </AdminOnly>
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
