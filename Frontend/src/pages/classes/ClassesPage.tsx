import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { classroomApi } from '../../services/classroomApi';
import type { Classroom } from '../../types/domain';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const ClassesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Classroom[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isTeacher = user?.role === 'TEACHER';

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await classroomApi.getClassrooms(
        user.role === 'TEACHER'
          ? { teacherId: user.id }
          : { studentId: user.id }
      );
      setClasses(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to create a class');
      return;
    }
    try {
      await classroomApi.createClassroom(user.id, { name, description });
      toast.success('Class created');
      setCreateOpen(false);
      setName('');
      setDescription('');
      await load();
      // Refresh dashboard if we're on it
      if (window.location.pathname === '/dashboard') {
        window.dispatchEvent(new Event('focus'));
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to create class');
    }
  };

  const handleDelete = async (classId: string) => {
    if (!user) {
      toast.error('You must be logged in to delete a class');
      return;
    }
    const confirmed = window.confirm('Delete this class for everyone? This cannot be undone.');
    if (!confirmed) return;
    setDeletingId(classId);
    try {
      await classroomApi.deleteClassroom(classId, user.id);
      toast.success('Class deleted');
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete class');
    } finally {
      setDeletingId(null);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to join a class');
      return;
    }
    try {
      await classroomApi.joinClassroom(user.id, joinCode);
      toast.success('Joined class');
      setJoinOpen(false);
      setJoinCode('');
      load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to join class');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header similar to Google Classroom "Home" */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Classes</h1>
          <p className="mt-1 text-sm text-slate-500">
            All the classrooms you teach or are enrolled in.
          </p>
        </div>
        <div className="flex gap-2">
          {isTeacher && (
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              + Create class
            </Button>
          )}
          <Button onClick={() => setJoinOpen(true)}>Join class</Button>
        </div>
      </div>

      {loading && (
        <div className="py-10 text-center text-sm text-slate-500">
          <Spinner />
        </div>
      )}

      {!loading && (!classes || classes.length === 0) && (
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">No classes yet</p>
            <p className="text-xs text-slate-500">
              {isTeacher
                ? 'Create a class and share the code with your students.'
                : 'Ask your teacher for a class code to join.'}
            </p>
          </div>
        </Card>
      )}

      {/* Class cards redesigned to look like Google Classroom tiles */}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {classes?.map((c) => (
          <div
            key={c.id}
            className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
            onClick={() => navigate(`/class/${c.id}`)}
          >
            {/* Banner */}
            <div className="relative h-28 bg-gradient-to-r from-[#4f9cff] via-[#3f8cff] to-[#6fb3ff]">
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage:
                  'radial-gradient(circle at 0 0, white 0, transparent 55%), radial-gradient(circle at 100% 0, white 0, transparent 55%)',
              }} />
                <div className="relative flex h-full flex-col justify-between p-4 text-white">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-blue-100">
                    {c.code}
                  </p>
                  <h2 className="mt-1 line-clamp-2 text-lg font-semibold leading-snug">
                    {c.name}
                  </h2>
                </div>
                <p className="text-xs font-medium text-blue-50">{c.teacherName}</p>
              </div>
            </div>

            {/* Card footer */}
            <div className="flex items-center justify-between bg-white px-4 py-3 text-xs text-slate-600">
              <span className="font-medium text-slate-700">
                Class code: <span className="font-mono text-slate-800">{c.code}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full px-3 py-1 text-xs font-semibold text-[#3f8cff] transition hover:bg-blue-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/class/${c.id}`);
                  }}
                >
                  Open
                </button>
                {isTeacher && (
                  <button
                    className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(c.id);
                    }}
                    disabled={deletingId === c.id}
                  >
                    {deletingId === c.id ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create class">
        <form className="space-y-4" onSubmit={handleCreate}>
          <Input
            label="Class name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title="Join class">
        <form className="space-y-4" onSubmit={handleJoin}>
          <Input
            label="Class code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setJoinOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Join</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
