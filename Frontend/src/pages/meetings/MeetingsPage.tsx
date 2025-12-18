import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoCameraIcon, PlusIcon, ArrowRightIcon, KeyIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { classroomApi } from '../../services/classroomApi';
import { meetingApi } from '../../services/meetingApi';
import toast from 'react-hot-toast';
import type { Classroom } from '../../types/domain';

export const MeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingClassroomMeeting, setCreatingClassroomMeeting] = useState<string | null>(null);
  const [creatingNormalMeeting, setCreatingNormalMeeting] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadClassrooms = async () => {
      try {
        setLoading(true);
        const query = user.role === 'TEACHER'
          ? { teacherId: user.id }
          : { studentId: user.id };
        const data = await classroomApi.getClassrooms(query);
        setClassrooms(data);
      } catch (error) {
        console.error('Failed to load classrooms:', error);
        toast.error('Failed to load classrooms');
      } finally {
        setLoading(false);
      }
    };

    loadClassrooms();
  }, [user, navigate]);

  const handleCreateClassroomMeeting = async (classroomId: string) => {
    if (!user) return;

    try {
      setCreatingClassroomMeeting(classroomId);
      const meeting = await meetingApi.createClassroomMeeting({
        classroomId: parseInt(classroomId, 10),
        hostUserId: parseInt(user.id, 10),
      });
      
      toast.success('Classroom meeting created successfully!');
      // Navigate to meeting join page using the meeting code
      navigate(`/meeting/join/${meeting.meetingCode}`);
    } catch (error: any) {
      console.error('Failed to create classroom meeting:', error);
      const errorMsg = error.response?.data?.message || 'Failed to create classroom meeting';
      toast.error(errorMsg);
    } finally {
      setCreatingClassroomMeeting(null);
    }
  };

  const handleCreateNormalMeeting = async () => {
    if (!user) return;

    try {
      setCreatingNormalMeeting(true);
      const meeting = await meetingApi.createNormalMeeting({
        hostUserId: parseInt(user.id, 10),
      });
      
      toast.success('Normal meeting created successfully!');
      // Navigate to meeting join page using the meeting code
      navigate(`/meeting/join/${meeting.meetingCode}`);
    } catch (error: any) {
      console.error('Failed to create normal meeting:', error);
      const errorMsg = error.response?.data?.message || 'Failed to create normal meeting';
      toast.error(errorMsg);
    } finally {
      setCreatingNormalMeeting(false);
    }
  };

  const handleJoinMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !joinCode.trim()) return;

    try {
      // Validate that user can join
      await meetingApi.joinMeeting({
        meetingCode: joinCode.trim(),
        userId: parseInt(user.id, 10),
      });

      // Navigate to meeting join page
      navigate(`/meeting/join/${joinCode.trim()}`);
    } catch (error: any) {
      console.error('Failed to join meeting:', error);
      const errorMsg = error.response?.data?.message || 'Failed to join meeting';
      toast.error(errorMsg);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading classrooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <VideoCameraIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
          </div>
          <p className="text-gray-600">
            {user?.role === 'TEACHER'
              ? 'Create and manage live meetings for your classrooms or start normal meetings'
              : 'Join live meetings for your enrolled classrooms or enter a meeting code'}
          </p>
        </div>

        {/* Join by Code Section */}
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Join Meeting by Code</h2>
          <form onSubmit={handleJoinMeeting} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit meeting code"
                maxLength={6}
                className="w-full"
              />
            </div>
            <Button
              type="submit"
              disabled={!joinCode.trim()}
              className="flex items-center justify-center gap-2"
            >
              <ArrowRightIcon className="h-4 w-4" />
              Join Meeting
            </Button>
          </form>
        </Card>

        {/* Create Meetings Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Classroom Meetings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <VideoCameraIcon className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Classroom Meetings</h2>
            </div>
            <p className="text-gray-600 mb-4">
              {user?.role === 'TEACHER'
                ? 'Create meetings for your classrooms. Students will receive an announcement.'
                : 'Join meetings created by your teachers for specific classrooms.'}
            </p>
            
            {classrooms.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500">
                  {user?.role === 'TEACHER'
                    ? 'Create a classroom to start hosting meetings'
                    : 'Enroll in a classroom to join meetings'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {classrooms.map((classroom) => (
                  <div key={classroom.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                        {getInitials(classroom.name)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{classroom.name}</h3>
                        <p className="text-xs text-gray-500">{classroom.teacherName}</p>
                      </div>
                    </div>
                    
                    {user?.role === 'TEACHER' ? (
                      <Button
                        onClick={() => handleCreateClassroomMeeting(classroom.id)}
                        disabled={creatingClassroomMeeting === classroom.id}
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        {creatingClassroomMeeting === classroom.id ? (
                          <>
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <PlusIcon className="h-3 w-3" />
                            Create
                          </>
                        )}
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-500">Classroom-only</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Normal Meetings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <KeyIcon className="h-5 w-5 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Normal Meetings</h2>
            </div>
            <p className="text-gray-600 mb-4">
              {user?.role === 'TEACHER'
                ? 'Create meetings that anyone with the code can join.'
                : 'Join meetings created by teachers using a shared code.'}
            </p>
            
            <Button
              onClick={handleCreateNormalMeeting}
              disabled={creatingNormalMeeting}
              className="w-full flex items-center justify-center gap-2"
            >
              {creatingNormalMeeting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4" />
                  Create Normal Meeting
                </>
              )}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};