import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '../../store/auth.store.ts';
import type { Permission } from '../../types/auth.ts';
import { can } from '../../lib/permissions.ts';

interface IProtectedRouteProps {
  permission?: Permission;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<IProtectedRouteProps> = ({ permission, children }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          <span className="font-mono text-xs text-muted">AUTHENTICATING TELEMETRY...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !can(user, permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
