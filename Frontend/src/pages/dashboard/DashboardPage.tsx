import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { classroomApi } from '../../services/classroomApi';
import { assignmentApi } from '../../services/assignmentApi';
import type { Classroom, StudentAssignment } from '../../types/domain';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Classroom[] | null>(null);
  const [assignments, setAssignments] = useState<StudentAssignment[] | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cls, asg] = await Promise.all([
        classroomApi.getClassrooms(
          user.role === 'TEACHER'
            ? { teacherId: user.id }
            : { studentId: user.id }
        ),
        assignmentApi.getStudentAssignments(user.id, user.role),
      ]);
      setClasses(cls);
      setAssignments(asg);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Refresh when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      loadData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  const pendingList =
    assignments
      // Only show assignments that are still open (not submitted and not past the deadline)
      ?.filter((a) => !a.isSubmitted && !a.isPastDeadline)
      // Sort by nearest upcoming deadline first
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      // Show only the top 3 as highest priority
      .slice(0, 3) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Hi, {user?.name.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s what&apos;s happening in your classes.
        </p>
      </div>

      {/* Main content: class tiles + To-do list */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Class cards, similar to Google Classroom home */}
        <section className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Classes</h2>
            <Link
              to="/classes"
              className="text-xs font-medium text-[#3f8cff] hover:text-[#2563eb]"
            >
              View all classes
            </Link>
          </div>

          {loading && (
            <div className="py-10 text-center text-sm text-slate-500">
              <Spinner />
            </div>
          )}

          {!loading && (!classes || classes.length === 0) && (
            <p className="text-sm text-slate-500">No classes yet. Create or join one to get started.</p>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classes?.map((c) => (
              <div
                key={c.id}
                className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Link to={`/class/${c.id}`} className="block h-full">
                  <div className="relative h-24 bg-gradient-to-r from-[#4f9cff] via-[#3f8cff] to-[#6fb3ff]">
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage:
                          'radial-gradient(circle at 0 0, white 0, transparent 55%), radial-gradient(circle at 100% 0, white 0, transparent 55%)',
                      }}
                    />
                    <div className="relative flex h-full flex-col justify-between p-4 text-white">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-blue-100">
                          {c.code}
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug">
                          {c.name}
                        </h3>
                      </div>
                      <p className="text-[11px] font-medium text-blue-50">{c.teacherName}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-white px-4 py-3 text-xs text-slate-600">
                    <span className="font-medium text-slate-700">
                      Class code: <span className="font-mono text-slate-800">{c.code}</span>
                    </span>
                    <span className="rounded-full px-3 py-1 text-[11px] font-semibold text-[#3f8cff] transition group-hover:bg-blue-50">
                      Open
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* To-do list (assignments) */}
        <section>
          <Card className="flex h-full flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">To-do</h2>
              <Link
                to="/assignments"
                className="text-xs font-medium text-[#3f8cff] hover:text-[#2563eb]"
              >
                View all
              </Link>
            </div>

            {loading && (
              <div className="py-6 text-center text-sm text-slate-500">
                <Spinner />
              </div>
            )}

            {!loading && pendingList.length === 0 && (
              <p className="text-sm text-slate-500">No pending assignments. You&apos;re all caught up!</p>
            )}

            <ul className="space-y-3">
              {pendingList.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{a.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {a.classroomName} · Due{' '}
                      {new Date(a.dueDate).toLocaleDateString()} at{' '}
                      {new Date(a.dueDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Link
                    to={`/assignments/${a.id}`}
                    className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold text-[#3f8cff] hover:bg-blue-50"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>
    </div>
  );
};
