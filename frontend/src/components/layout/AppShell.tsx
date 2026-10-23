import React from 'react';
import { Outlet } from 'react-router';
import { TopNavBar } from './TopNavBar.tsx';
import { Sidebar } from './Sidebar.tsx';

export const AppShell: React.FC = () => (
  <div className="flex min-h-screen flex-col bg-canvas">
    <TopNavBar />
    <div className="flex flex-1">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  </div>
);
