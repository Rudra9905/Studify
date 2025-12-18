import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoCameraIcon, PlusIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { classroomApi } from '../../services/classroomApi';
import { meetingApi } from '../../services/meetingApi';
import toast from 'react-hot-toast';
import type { Classroom } from '../../types/domain';

export const UniversalMeetingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingMeeting, setCreatingMeeting] = useState<string | null>(null);

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

  const handleCreateMeeting = async (classroomId: string) => {
    if (!user) return;

    try {
      setCreatingMeeting(classroomId);
      const meeting = await meetingApi.createMeeting({
        classroomId: parseInt(classroomId, 10),
        userId: parseInt(user.id, 10),
      });
      
      toast.success('Meeting created successfully!');
      // Navigate to meeting page using classroom ID
      navigate(`/meeting/${classroomId}`);
    } catch (error: any) {
      console.error('Failed to create meeting:', error);
      const errorMsg = error.response?.data?.message || 'Failed to create meeting';
      toast.error(errorMsg);
    } finally {
      setCreatingMeeting(null);
    }
  };

  const handleJoinMeeting = async (classroomId: string) => {
    if (!user) return;

    try {
      // Validate that user can join
      await meetingApi.joinMeeting({
        classroomId: parseInt(classroomId, 10),
        userId: parseInt(user.id, 10),
      });

      // Navigate to meeting page
      navigate(`/meeting/${classroomId}`);
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
              ? 'Create and manage live meetings for your classrooms'
              : 'Join live meetings for your enrolled classrooms'}
          </p>
        </div>

        {classrooms.length === 0 ? (
          <Card className="p-12 text-center">
            <VideoCameraIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Classrooms</h2>
            <p className="text-gray-600">
              {user?.role === 'TEACHER'
                ? 'Create a classroom to start hosting meetings'
                : 'Enroll in a classroom to join meetings'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classrooms.map((classroom) => (
              <Card key={classroom.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                    {getInitials(classroom.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{classroom.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{classroom.teacherName}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {user?.role === 'TEACHER' ? (
                    <Button
                      onClick={() => handleCreateMeeting(classroom.id)}
                      disabled={creatingMeeting === classroom.id}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      {creatingMeeting === classroom.id ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <PlusIcon className="h-4 w-4" />
                          Start Meeting
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleJoinMeeting(classroom.id)}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <ArrowRightIcon className="h-4 w-4" />
                      Join Meeting
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
