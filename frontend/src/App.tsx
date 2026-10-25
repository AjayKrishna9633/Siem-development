import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useAuthStore } from './store/auth.store.ts';
import { ProtectedRoute } from './components/common/ProtectedRoute.tsx';
import { AppShell } from './components/layout/AppShell.tsx';
import { homePathFor } from './lib/roles.ts';
import { Login } from './pages/auth/Login.tsx';
import { SetupSuperAdmin } from './pages/auth/SetupSuperAdmin.tsx';
import { Activate } from './pages/auth/Activate.tsx';
import { ForgotPassword } from './pages/auth/ForgotPassword.tsx';
import { Unauthorized } from './pages/Unauthorized.tsx';
import { UserManagement } from './pages/settings/UserManagement.tsx';
import { AddUser } from './pages/settings/AddUser.tsx';
import { CompanyManagement } from './pages/settings/CompanyManagement.tsx';
import { AddCompany } from './pages/settings/AddCompany.tsx';
import { Profile } from './pages/settings/Profile.tsx';

// Super admins land on companies, company admins on their team, analysts on their profile
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={homePathFor(user.role)} replace />;
};

const SuperAdminOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['super_admin']}>{children}</ProtectedRoute>
);

// The super admin sees companies, not employees, so the team pages are company-admin only
const OrgAdminOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['org_admin']}>{children}</ProtectedRoute>
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
        <Route path="/setup-super-admin" element={<SetupSuperAdmin />} />
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
              <OrgAdminOnly>
                <UserManagement />
              </OrgAdminOnly>
            }
          />
          <Route
            path="/users/new"
            element={
              <OrgAdminOnly>
                <AddUser />
              </OrgAdminOnly>
            }
          />
          <Route
            path="/companies"
            element={
              <SuperAdminOnly>
                <CompanyManagement />
              </SuperAdminOnly>
            }
          />
          <Route
            path="/companies/new"
            element={
              <SuperAdminOnly>
                <AddCompany />
              </SuperAdminOnly>
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
