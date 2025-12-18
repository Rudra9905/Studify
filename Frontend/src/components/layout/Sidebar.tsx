import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
  AcademicCapIcon,
  ChevronRightIcon,
  ChatBubbleLeftRightIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import type { Classroom } from '../../types/domain';
import { useAuth } from '../../hooks/useAuth';
import { classroomApi } from '../../services/classroomApi';

const primaryNav = [
  { to: '/dashboard', label: 'Home', icon: HomeIcon },
  { to: '/calendar', label: 'Calendar', icon: CalendarDaysIcon },
  { to: '/meetings', label: 'Meetings', icon: VideoCameraIcon },
  { to: '/assistant', label: 'Chatbot', icon: ChatBubbleLeftRightIcon },
  { to: '/ai/pdf-summary', label: 'AI Summary', icon: AcademicCapIcon },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Classroom[] | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [enrolledOpen, setEnrolledOpen] = useState(true);

  const classQuery = useMemo(() => {
    if (!user) return null;
    return user.role === 'TEACHER'
      ? { teacherId: user.id }
      : { studentId: user.id };
  }, [user?.id, user?.role]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!classQuery) return;
      setLoadingClasses(true);
      try {
        const data = await classroomApi.getClassrooms(classQuery);
        if (!cancelled) {
          setClasses(data);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Failed to load sidebar classes', e);
        }
      } finally {
        if (!cancelled) {
          setLoadingClasses(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [classQuery]);

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
    return (parts[0]![0] + parts[1]![0]).toUpperCase();
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Left navigation rail styled like Google Classroom */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[var(--card)] pt-16 shadow-lg transition-transform lg:static lg:translate-x-0 lg:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex h-full flex-col justify-between border-r border-[var(--border-subtle)] px-3 pb-4 pt-4 text-sm">
          <div className="space-y-4">
            {/* Top navigation (Home, Calendar, Gemini) */}
            <div className="space-y-1 text-black">
              {primaryNav.map((item) => (
                <NavLink
                  key={item.to + item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-full px-3 py-2 font-medium transition-colors ${
                      isActive
                        ? 'bg-[#e3f0ff] text-black'
                        : 'text-black hover:bg-[#f1f5ff] hover:text-black'
                    }`
                  }
                  onClick={onClose}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* Enrolled section */}
            <div className="pt-2 text-black">
              <button
                type="button"
                onClick={() => setEnrolledOpen((v) => !v)}
                className={`flex w-full items-center justify-between rounded-full border px-3 py-2 text-left text-sm font-medium shadow-sm transition-colors ${
                  enrolledOpen
                    ? 'border-[#b3d1ff] bg-[#e3f0ff] text-black'
                    : 'border-[var(--border-subtle)] bg-white text-black hover:bg-[#f1f5ff]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <AcademicCapIcon className="h-5 w-5 text-black" />
                  <span>Enrolled</span>
                </span>
                <ChevronRightIcon
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    enrolledOpen ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {enrolledOpen && (
                    <div className="mt-2 space-y-1 pl-1 text-black">
                  {loadingClasses && (
                    <div className="rounded-full bg-[color-mix(in_oklab,var(--background)_90%,var(--light)_10%)] px-3 py-2 text-xs text-[var(--text-secondary)]/70">
                      Loading classes...
                    </div>
                  )}
                  {!loadingClasses && (!classes || classes.length === 0) && (
                    <div className="rounded-full px-3 py-2 text-xs text-[var(--text-secondary)]/70">
                      No classes yet.
                    </div>
                  )}
                  {classes?.map((c) => (
                    <NavLink
                      key={c.id}
                      to={`/class/${c.id}`}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-full px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-[#e3f0ff] text-black'
                            : 'text-black hover:bg-[#f1f5ff] hover:text-black'
                        }`
                      }
                      onClick={onClose}
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#e5edff] text-xs font-semibold text-black">
                        {getInitials(c.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-black">
                          {c.name}
                        </p>
                        <p className="truncate text-[11px] text-black/70">
                          {c.teacherName}
                        </p>
                      </div>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>

            {/* To-do entry */}
            <div className="pt-2 text-black">
              <NavLink
                to="/assignments"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-full px-3 py-2 font-medium transition-colors ${
                    isActive
                      ? 'bg-[#e3f0ff] text-black'
                      : 'text-black hover:bg-[#f1f5ff] hover:text-black'
                  }`
                }
                onClick={onClose}
              >
                <ClipboardDocumentListIcon className="h-5 w-5" />
                <span>To-do</span>
              </NavLink>
            </div>
          </div>

          {/* Bottom section */}
          <div className="space-y-1 border-t border-[var(--border-subtle)] pt-3 text-black">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-full px-3 py-2 font-medium transition-colors ${
                  isActive
                    ? 'bg-[#e3f0ff] text-black'
                    : 'text-black hover:bg-[#f1f5ff] hover:text-black'
                }`
              }
              onClick={onClose}
            >
              <Cog6ToothIcon className="h-5 w-5" />
              <span>Settings</span>
            </NavLink>
          </div>
        </nav>
      </aside>
    </>
  );
};
