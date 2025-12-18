import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VideoCameraIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { meetingApi } from '../../services/meetingApi';
import toast from 'react-hot-toast';

interface MeetingInfo {
  meetingCode: string;
  title: string;
  hostName: string;
  isClassroomMeeting: boolean;
  classroomName?: string;
}

export const MeetingJoinPage: React.FC = () => {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!meetingCode) {
      setError('Invalid meeting code');
      setLoading(false);
      return;
    }

    const validateMeeting = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Validate the meeting code with backend
        const response = await meetingApi.joinMeeting({
          meetingCode,
          userId: parseInt(user.id, 10),
        });
        
        setMeetingInfo({
          meetingCode: response.meetingCode,
          title: response.title || 'Untitled Meeting',
          hostName: response.host.name,
          isClassroomMeeting: response.isClassroomMeeting,
          classroomName: response.classroomName,
        });
      } catch (err: any) {
        console.error('Failed to validate meeting:', err);
        const errorMsg = err.response?.data?.message || 'Invalid or expired meeting code';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    validateMeeting();
  }, [meetingCode, user, navigate]);

  const handleJoinMeeting = async () => {
    if (!user || !meetingCode || !meetingInfo) return;

    try {
      setJoining(true);
      
      // Navigate to actual meeting room
      navigate(`/meeting/${meetingCode}`);
    } catch (err: any) {
      console.error('Failed to join meeting:', err);
      const errorMsg = err.response?.data?.message || 'Failed to join meeting';
      toast.error(errorMsg);
    } finally {
      setJoining(false);
    }
  };

  const handleBack = () => {
    navigate('/meetings');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Validating meeting code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Invalid Meeting</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <div className="mt-6">
            <Button onClick={handleBack} className="w-full">
              Back to Meetings
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!meetingInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Unable to load meeting information</p>
          <Button onClick={handleBack} className="mt-4">
            Back to Meetings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <VideoCameraIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Join Meeting</h2>
          
          <div className="mt-6 space-y-4">
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{meetingInfo.title}</h3>
              <p className="text-sm text-gray-600 mt-1">
                Hosted by: {meetingInfo.hostName}
              </p>
              {meetingInfo.isClassroomMeeting && meetingInfo.classroomName && (
                <p className="text-sm text-gray-600">
                  Classroom: {meetingInfo.classroomName}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Meeting Code: <span className="font-mono font-bold">{meetingInfo.meetingCode}</span>
              </p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 text-left">
              <h4 className="text-sm font-medium text-blue-800">Meeting Details</h4>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li>• All participants must be logged in</li>
                {meetingInfo.isClassroomMeeting ? (
                  <li>• Only classroom members can join</li>
                ) : (
                  <li>• Anyone with the code can join</li>
                )}
                <li>• Enable your camera and microphone for full participation</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleBack}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleJoinMeeting}
              disabled={joining}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {joining ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Joining...
                </>
              ) : (
                'Join Meeting'
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};