import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useAuthStore } from './store/auth.store.ts';
import { ProtectedRoute } from './components/common/ProtectedRoute.tsx';
import { AppShell } from './components/layout/AppShell.tsx';
import { ADMIN_ROLES } from './lib/roles.ts';
import { Login } from './pages/auth/Login.tsx';
import { SetupSuperAdmin } from './pages/auth/SetupSuperAdmin.tsx';
import { AcceptInvite } from './pages/auth/AcceptInvite.tsx';
import { ForgotPassword } from './pages/auth/ForgotPassword.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { Alerts } from './pages/Alerts.tsx';
import { LogExplorer } from './pages/LogExplorer.tsx';
import { Compliance } from './pages/Compliance.tsx';
import { Help } from './pages/Help.tsx';
import { Unauthorized } from './pages/Unauthorized.tsx';
import { ThreatHuntingHub } from './pages/threat-hunting/ThreatHuntingHub.tsx';
import { ThreatHuntingDashboard } from './pages/threat-hunting/ThreatHuntingDashboard.tsx';
import { ThreatHuntingEvents } from './pages/threat-hunting/ThreatHuntingEvents.tsx';
import { MitreHub } from './pages/mitre/MitreHub.tsx';
import { MitreDashboard } from './pages/mitre/MitreDashboard.tsx';
import { MitreIntelligence } from './pages/mitre/MitreIntelligence.tsx';
import { MitreFramework } from './pages/mitre/MitreFramework.tsx';
import { MitreEvents } from './pages/mitre/MitreEvents.tsx';
import { MalwareHub } from './pages/malware/MalwareHub.tsx';
import { MalwareDashboard } from './pages/malware/MalwareDashboard.tsx';
import { MalwareEvents } from './pages/malware/MalwareEvents.tsx';
import { FimHub } from './pages/fim/FimHub.tsx';
import { FimDashboard } from './pages/fim/FimDashboard.tsx';
import { FimEvents } from './pages/fim/FimEvents.tsx';
import { ConfigHub } from './pages/configuration/ConfigHub.tsx';
import { ConfigDashboard } from './pages/configuration/ConfigDashboard.tsx';
import { ConfigInventory } from './pages/configuration/ConfigInventory.tsx';
import { ConfigEvents } from './pages/configuration/ConfigEvents.tsx';
import { VulnHub } from './pages/vulnerability/VulnHub.tsx';
import { VulnDashboard } from './pages/vulnerability/VulnDashboard.tsx';
import { VulnInventory } from './pages/vulnerability/VulnInventory.tsx';
import { VulnEvents } from './pages/vulnerability/VulnEvents.tsx';
import { Agents } from './pages/agents/Agents.tsx';
import { AgentDetail } from './pages/agents/AgentDetail.tsx';
import { DeployAgent } from './pages/agents/DeployAgent.tsx';
import { SettingsHub } from './pages/settings/SettingsHub.tsx';
import { UserManagement } from './pages/settings/UserManagement.tsx';
import { AddUser } from './pages/settings/AddUser.tsx';
import { AuditLog } from './pages/settings/AuditLog.tsx';
import { Profile } from './pages/settings/Profile.tsx';

const RootRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  return <Navigate to={isAuthenticated && user ? '/dashboard' : '/login'} replace />;
};

const AdminOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={ADMIN_ROLES}>{children}</ProtectedRoute>
);

export const App: React.FC = () => {
  const { fetchCurrentUser, token } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchCurrentUser().catch(() => {});
    }
  }, [token, fetchCurrentUser]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/setup-super-admin" element={<SetupSuperAdmin />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Authenticated console */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/alerts" element={<Alerts />} />

          <Route path="/threat-hunting" element={<ThreatHuntingHub />} />
          <Route path="/threat-hunting/dashboard" element={<ThreatHuntingDashboard />} />
          <Route path="/threat-hunting/events" element={<ThreatHuntingEvents />} />

          <Route path="/mitre" element={<MitreHub />} />
          <Route path="/mitre/dashboard" element={<MitreDashboard />} />
          <Route path="/mitre/intelligence" element={<MitreIntelligence />} />
          <Route path="/mitre/framework" element={<MitreFramework />} />
          <Route path="/mitre/events" element={<MitreEvents />} />

          <Route path="/malware" element={<MalwareHub />} />
          <Route path="/malware/dashboard" element={<MalwareDashboard />} />
          <Route path="/malware/events" element={<MalwareEvents />} />

          <Route path="/fim" element={<FimHub />} />
          <Route path="/fim/dashboard" element={<FimDashboard />} />
          <Route path="/fim/events" element={<FimEvents />} />

          <Route path="/configuration" element={<ConfigHub />} />
          <Route path="/configuration/dashboard" element={<ConfigDashboard />} />
          <Route path="/configuration/inventory" element={<ConfigInventory />} />
          <Route path="/configuration/events" element={<ConfigEvents />} />

          <Route path="/vulnerabilities" element={<VulnHub />} />
          <Route path="/vulnerabilities/dashboard" element={<VulnDashboard />} />
          <Route path="/vulnerabilities/inventory" element={<VulnInventory />} />
          <Route path="/vulnerabilities/events" element={<VulnEvents />} />

          <Route path="/agents" element={<Agents />} />
          <Route
            path="/agents/deploy"
            element={
              <AdminOnly>
                <DeployAgent />
              </AdminOnly>
            }
          />
          <Route path="/agents/:agentId" element={<AgentDetail />} />

          <Route path="/logs" element={<LogExplorer />} />
          <Route path="/compliance" element={<Compliance />} />

          <Route path="/settings" element={<SettingsHub />} />
          <Route
            path="/settings/users"
            element={
              <AdminOnly>
                <UserManagement />
              </AdminOnly>
            }
          />
          <Route
            path="/settings/users/new"
            element={
              <AdminOnly>
                <AddUser />
              </AdminOnly>
            }
          />
          <Route
            path="/settings/audit"
            element={
              <AdminOnly>
                <AuditLog />
              </AdminOnly>
            }
          />
          <Route path="/profile" element={<Profile />} />
          <Route path="/help" element={<Help />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Old role dashboards now land on the shared console */}
          <Route path="/admin" element={<Navigate to="/settings/users" replace />} />
          <Route path="/org-admin" element={<Navigate to="/settings/users" replace />} />
          <Route path="/analyst" element={<Navigate to="/alerts" replace />} />
        </Route>

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
