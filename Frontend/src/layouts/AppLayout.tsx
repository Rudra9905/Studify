import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Top app bar */}
      <Navbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />

      {/* Main content area with permanent left rail like Google Classroom */}
      <div className="flex w-full pt-16">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-x-hidden px-4 pb-10 pt-4 lg:px-10">
          <div className="mx-auto max-w-6xl space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
