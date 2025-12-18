import React from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { Avatar } from '../ui/Avatar';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--border-subtle)] bg-[color-mix(in_oklab,var(--card)_90%,var(--background)_10%)] px-4 shadow-sm backdrop-blur lg:px-6 transition-colors duration-300">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          className="inline-flex items-center justify-center rounded-full p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
          onClick={onToggleSidebar}
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        {/* Brand */}
        <Logo size="md" showText={true} />
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <div className="hidden text-right text-xs sm:block">
            <div className="font-semibold text-black">{user.name}</div>
            <div className="text-[11px] capitalize text-slate-600">
              {user.role.toLowerCase()}
            </div>
          </div>
          <Avatar name={user.name} imageUrl={user.profileImageUrl} size="sm" />
          <button
            onClick={logout}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-[#e3f0ff] hover:text-[#3f8cff]"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
};
