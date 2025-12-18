import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Users,
  MessageSquare,
  Hand,
  Monitor,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createMeetingClient, type MeetingClient } from '../../services/meetingClient';
import { classroomApi } from '../../services/classroomApi';
import { meetingApi } from '../../services/meetingApi';
import { Logo } from '../../components/ui/Logo';
import type { Classroom, User } from '../../types/domain';
import toast from 'react-hot-toast';

interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isLocal?: boolean;
  avatarUrl?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
}

const ParticipantThumbnail: React.FC<{
  participant: Participant;
  stream?: MediaStream;
  isMain?: boolean;
  onDoubleClick?: () => void;
  isFullscreen?: boolean;
}> = ({ participant, stream, isMain = false, onDoubleClick, isFullscreen = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Clear any existing stream
    videoElement.srcObject = null;

    if (stream && !participant.isVideoOff) {
      // Always set the stream to the video element
      videoElement.srcObject = stream;

      // Check for video tracks
      const checkVideoTracks = () => {
        const videoTracks = stream.getVideoTracks();
        const hasActiveVideo = videoTracks.length > 0 && videoTracks.some(track => track.enabled);
        setHasVideo(hasActiveVideo);
        console.log(`Participant ${participant.name}: hasVideo=${hasActiveVideo}, tracks=${videoTracks.length}, enabled=${videoTracks.filter(t => t.enabled).length}`);
      };

      // Initial check
      checkVideoTracks();

      // Listen for track changes
      const handleTrackChange = () => {
        checkVideoTracks();
      };

      // Listen for when tracks are added to the stream
      stream.addEventListener('addtrack', (event) => {
        if (event.track && event.track.kind === 'video') {
          checkVideoTracks();
          event.track.addEventListener('ended', handleTrackChange);
          event.track.addEventListener('mute', handleTrackChange);
          event.track.addEventListener('unmute', handleTrackChange);
        }
      });

      stream.getVideoTracks().forEach(track => {
        track.addEventListener('ended', handleTrackChange);
        track.addEventListener('mute', handleTrackChange);
        track.addEventListener('unmute', handleTrackChange);
        track.addEventListener('started', handleTrackChange);
      });

      // Also check periodically in case tracks become active later
      const intervalId = setInterval(() => {
        checkVideoTracks();
      }, 1000);

      // Force video to play (muted for local, unmuted for remote)
      // Add a small delay to ensure the stream is properly set
      setTimeout(() => {
        videoElement.play().catch(err => {
          console.error('Error playing video:', err);
          // Retry with muted if autoplay fails
          if (!participant.isLocal) {
            videoElement.muted = true;
            videoElement.play().catch(err2 => console.error('Error playing muted video:', err2));
          }
        });
      }, 100);

      // Cleanup
      return () => {
        clearInterval(intervalId);
        stream.removeEventListener('addtrack', handleTrackChange);
        stream.getVideoTracks().forEach(track => {
          track.removeEventListener('ended', handleTrackChange);
          track.removeEventListener('mute', handleTrackChange);
          track.removeEventListener('unmute', handleTrackChange);
          track.removeEventListener('started', handleTrackChange);
        });
        if (videoElement) {
          videoElement.srcObject = null;
        }
      };
    } else {
      setHasVideo(false);
      if (videoElement) {
        videoElement.srcObject = null;
      }
    }
  }, [stream, participant.isLocal, participant.name, participant.isVideoOff]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeClasses = isMain || isFullscreen
    ? 'w-full h-full min-h-[400px]'
    : 'w-full h-full';

  return (
    <div
      className={`relative ${sizeClasses} rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center cursor-pointer ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
      onDoubleClick={onDoubleClick}
    >
      {stream && !participant.isVideoOff && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      )}
      {(!stream || participant.isVideoOff) && (
        <div className="flex flex-col items-center justify-center">
          {participant.avatarUrl ? (
            <img
              src={participant.avatarUrl}
              alt={participant.name}
              className={`${isMain || isFullscreen ? 'w-32 h-32' : 'w-16 h-16'} rounded-full object-cover border-4 border-blue-500`}
              onError={(e) => {
                // Fallback to initials if image fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className={`${isMain || isFullscreen ? 'w-32 h-32' : 'w-16 h-16'} rounded-full bg-blue-500 flex items-center justify-center text-white ${isMain || isFullscreen ? 'text-4xl' : 'text-xl'} font-semibold`}>
              {getInitials(participant.name)}
            </div>
          )}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
        <div className="flex flex-col gap-1 text-white">
          {isMain && participant.isLocal && (
            <>
              <span className="text-sm font-medium">You</span>
              <span className="text-xs text-gray-300">Teacher</span>
            </>
          )}
          {!isMain && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium truncate">{participant.name}</span>
              {participant.isMuted && (
                <MicOff className="w-3 h-3 ml-1 flex-shrink-0" />
              )}
            </div>
          )}
        </div>
      </div>
      {isFullscreen && (
        <button
          onClick={onDoubleClick}
          className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

const ChatMessageItem: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-gray-900">{message.sender}</span>
        <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{message.message}</p>
    </div>
  );
};

export const MeetingPage: React.FC = () => {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    { userId: string; stream: MediaStream }[]
  >([]);
  const [joinedParticipants, setJoinedParticipants] = useState<Set<string>>(new Set());
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'participants' | 'chat'>('participants');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [isInitializing, setIsInitializing] = useState(true);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [participantNames, setParticipantNames] = useState<Map<string, string>>(new Map());
  const [participantAvatars, setParticipantAvatars] = useState<Map<string, string>>(new Map());
  const [fullscreenParticipant, setFullscreenParticipant] = useState<string | null>(null);
  const [participantMicStates, setParticipantMicStates] = useState<Map<string, boolean>>(new Map());
  const [participantVideoStates, setParticipantVideoStates] = useState<Map<string, boolean>>(new Map());

  const meetingClientRef = useRef<MeetingClient | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Build participants list from local user and remote streams
  const localParticipant: Participant = {
    id: user?.id?.toString() || '1',
    name: user?.name || 'You',
    isMuted: !micEnabled,
    isVideoOff: !cameraEnabled,
    isLocal: true,
    avatarUrl: user?.profileImageUrl,
  };

  // Create remote participants from all joined participants (not just those with streams)
  const remoteParticipants: Participant[] = Array.from(joinedParticipants)
    .filter((userId) => userId !== localParticipant.id)
    .map((userId) => {
      // Use signaling state for both mic and video, not track state
      const micState = participantMicStates.get(userId);
      const isMuted = micState !== undefined ? !micState : true;
      
      const videoState = participantVideoStates.get(userId);
      const isVideoOff = videoState !== undefined ? !videoState : true;
      
      return {
        id: userId,
        name: participantNames.get(userId) || userId,
        isMuted,
        isVideoOff,
        isLocal: false,
        avatarUrl: participantAvatars.get(userId),
      };
    });

  const participants = [localParticipant, ...remoteParticipants];

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch classroom data
  useEffect(() => {
    if (!meetingCode) return;

    const fetchClassroom = async () => {
      try {
        const classroomData = await classroomApi.getClassroom(meetingCode);
        setClassroom(classroomData);
      } catch (error) {
        console.error('Failed to fetch classroom:', error);
        // Don't show error toast, just use meeting code as fallback
      }
    };

    fetchClassroom();
  }, [meetingCode]);

  // Initialize meeting client on mount
  useEffect(() => {
    if (!user || !meetingCode) {
      navigate('/login');
      return;
    }

    const initializeMeeting = async () => {
      try {
        setIsInitializing(true);

        // Step 1: Validate meeting exists and user is authorized
        console.log('[Meeting] Validating meeting access for classroom:', meetingCode);
        let signalingToken = '';
        try {
          const meetingResponse = await meetingApi.joinMeeting({
            meetingCode: meetingCode,
            userId: parseInt(user.id, 10)
          });
          signalingToken = meetingResponse.signalingToken || '';
          console.log('[Meeting] Meeting validated successfully. Meeting ID:', meetingResponse.meetingId);
        } catch (error: any) {
          console.error('[Meeting] Failed to validate meeting:', error);
          const errorMsg = error.response?.data?.message || 'You are not authorized to join this meeting or the meeting does not exist';
          toast.error(errorMsg);
          navigate('/meetings');
          return;
        }

        // Step 2: Create meeting client and join WebSocket
        meetingClientRef.current = createMeetingClient({
          classroomId: meetingCode,
          user,
          signalingToken, // Pass token for authentication
          onParticipantJoined: (userId) => {
            setJoinedParticipants((prev) => {
              const next = new Set(prev);
              next.add(userId);
              return next;
            });
            console.log('Participant joined:', userId);

            // Fetch user profile to get avatar
            import('../../services/userApi').then(({ userApi }) => {
              userApi.getById(userId).then((userProfile: User) => {
                console.log('Fetched user profile for', userId, ':', userProfile);
                if (userProfile.profileImageUrl) {
                  setParticipantAvatars((prev) => {
                    const next = new Map(prev);
                    next.set(userId, userProfile.profileImageUrl!);
                    return next;
                  });
                }
                if (userProfile.name) {
                  setParticipantNames((prev) => {
                    const next = new Map(prev);
                    next.set(userId, userProfile.name);
                    return next;
                  });
                }
              }).catch((err: any) => {
                console.warn('Could not fetch user profile for', userId, ':', err);
              });
            });
          },
          onParticipantLeft: (userId) => {
            setJoinedParticipants((prev) => {
              const next = new Set(prev);
              next.delete(userId);
              return next;
            });
            setRemoteStreams((prev) => prev.filter((p) => p.userId !== userId));
            setRaisedHands((prev) => {
              const next = new Set(prev);
              next.delete(userId);
              return next;
            });
            setParticipantNames((prev) => {
              const next = new Map(prev);
              next.delete(userId);
              return next;
            });
            console.log('Participant left:', userId);
          },
          onRemoteStream: (userId, stream) => {
            console.log(`Received remote stream from ${userId}:`, {
              videoTracks: stream.getVideoTracks().length,
              audioTracks: stream.getAudioTracks().length,
              videoEnabled: stream.getVideoTracks().some(t => t.enabled),
              audioEnabled: stream.getAudioTracks().some(t => t.enabled),
            });

            setRemoteStreams((prev) => {
              const without = prev.filter((p) => p.userId !== userId);
              return [...without, { userId, stream }];
            });
            // Ensure participant is in joined list
            setJoinedParticipants((prev) => {
              const next = new Set(prev);
              next.add(userId);
              return next;
            });
          },
          onRemoteStreamRemoved: (userId) => {
            setRemoteStreams((prev) => prev.filter((p) => p.userId !== userId));
          },
          onRaiseHand: (userId, raised) => {
            setRaisedHands((prev) => {
              const next = new Set(prev);
              if (raised) {
                next.add(userId);
              } else {
                next.delete(userId);
              }
              return next;
            });
          },
          onChatMessage: (userId, userName, message, timestamp) => {
            setParticipantNames((prev) => {
              const next = new Map(prev);
              next.set(userId, userName);
              return next;
            });
            setChatMessages((prev) => {
              // Check if message already exists (to avoid duplicates from optimistic updates)
              const messageId = `${userId}-${timestamp.getTime()}`;
              const exists = prev.some(m => m.id === messageId ||
                (m.sender === userName && m.message === message &&
                 Math.abs(m.timestamp.getTime() - timestamp.getTime()) < 1000));
              if (exists) return prev;

              return [
                ...prev,
                {
                  id: messageId,
                  sender: userName,
                  message,
                  timestamp,
                },
              ];
            });
          },
          onMeetingEnded: () => {
            // Teacher ended the meeting for everyone
            console.log('[Meeting] Meeting ended by teacher - disconnecting all streams');
            toast.error('Meeting ended by teacher', { duration: 3000 });

            // Clean up immediately
            const stopAllTracks = (stream: MediaStream | null) => {
              if (stream) {
                stream.getTracks().forEach((track) => {
                  track.stop();
                  stream.removeTrack(track);
                });
              }
            };

            stopAllTracks(screenStreamRef.current);
            stopAllTracks(cameraStreamRef.current);
            stopAllTracks(localStream);

            // Close meeting client
            if (meetingClientRef.current) {
              meetingClientRef.current.leave();
              meetingClientRef.current = null;
            }

            // Navigate back after a short delay to show the message
            setTimeout(() => {
              navigate('/meetings');
            }, 2000);
          },
          onMicStateChanged: (userId, isOn) => {
            console.log(`[Meeting] User ${userId} mic state: ${isOn ? 'ON' : 'OFF'}`);
            setParticipantMicStates((prev) => {
              const next = new Map(prev);
              next.set(userId, isOn);
              return next;
            });
          },
          onCamStateChanged: (userId, isOn) => {
            console.log(`[Meeting] User ${userId} cam state: ${isOn ? 'ON' : 'OFF'}`);
            setParticipantVideoStates((prev) => {
              const next = new Map(prev);
              next.set(userId, isOn);
              return next;
            });
          },
        });

        // Add local user to joined participants
        if (user?.id) {
          setJoinedParticipants((prev) => {
            const next = new Set(prev);
            next.add(String(user.id));
            return next;
          });
        }

        // Join the meeting
        meetingClientRef.current.join();
        toast.success(`Meeting code: ${meetingCode}`);
      } catch (error) {
        console.error('Failed to create meeting client:', error);
        toast.error('Failed to initialize meeting. Please try again.');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeMeeting();

    // Cleanup on unmount
    return () => {
      if (meetingClientRef.current) {
        meetingClientRef.current.leave();
      }
    };
  }, [user, meetingCode, navigate]);

  const handleStartCamera = async () => {
    // Check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('Your browser does not support camera/microphone access');
      console.error('[getUserMedia] MediaDevices API not available');
      return;
    }

    try {
      console.log('[getUserMedia] Requesting camera and microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      });

      console.log('[getUserMedia] Success! Stream tracks:', {
        video: stream.getVideoTracks().length,
        audio: stream.getAudioTracks().length,
      });

      cameraStreamRef.current = stream;
      setLocalStream(stream);
      setMicEnabled(true);
      setCameraEnabled(true);

      if (meetingClientRef.current) {
        console.log('[getUserMedia] Setting local stream on meeting client');
        meetingClientRef.current.setLocalStream(stream);
        // Broadcast initial mic and camera states as ON
        meetingClientRef.current.updateMicState(true);
        meetingClientRef.current.updateCamState(true);
      }

      toast.success('Camera and microphone enabled');
    } catch (error: any) {
      console.error('[getUserMedia] Error accessing media devices:', error);

      let errorMessage = 'Could not access camera or microphone';
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Permission denied. Please allow camera and microphone access in your browser settings.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = 'No camera or microphone found. Please connect a device and try again.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = 'Camera or microphone is already in use by another application.';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
          errorMessage = 'Camera or microphone does not meet the required specifications.';
        } else {
          errorMessage = `Could not access camera or microphone: ${error.message}`;
        }
      }

      toast.error(errorMessage);
      setMicEnabled(false);
      setCameraEnabled(false);
    }
  };

  const toggleMic = async () => {
    if (!micEnabled && !localStream) {
      // Need to start camera first if no stream exists
      await handleStartCamera();
      return;
    }

    if (!localStream) {
      toast.error('Please start your camera first');
      return;
    }

    setMicEnabled((prev) => {
      const next = !prev;
      
      // Notify other participants about mic state change
      // The meeting client will handle track updates and renegotiation
      if (meetingClientRef.current) {
        meetingClientRef.current.updateMicState(next);
      }

      // Update local participant state immediately
      setParticipantMicStates(prevStates => {
        const newStates = new Map(prevStates);
        newStates.set(user?.id?.toString() || '1', next);
        return newStates;
      });

      return next;
    });
  };

  const toggleCamera = async () => {
    if (!cameraEnabled && !localStream) {
      // Start camera if not already started
      await handleStartCamera();
      return;
    }

    if (!localStream) {
      toast.error('Could not access camera');
      return;
    }

    setCameraEnabled((prev) => {
      const next = !prev;
      
      // Notify other participants about camera state change
      // The meeting client will handle track updates and renegotiation
      if (meetingClientRef.current) {
        meetingClientRef.current.updateCamState(next);
      }

      // Update local participant state immediately
      setParticipantVideoStates(prevStates => {
        const newStates = new Map(prevStates);
        newStates.set(user?.id?.toString() || '1', next);
        return newStates;
      });

      return next;
    });
  };

  const handleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        console.log('[ScreenShare] Stopping screen share');
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((t) => t.stop());
          screenStreamRef.current = null;
        }
        if (cameraStreamRef.current && meetingClientRef.current) {
          console.log('[ScreenShare] Reverting to camera stream');
          setLocalStream(cameraStreamRef.current);
          meetingClientRef.current.setLocalStream(cameraStreamRef.current);
          // Notify other participants that camera is back on
          meetingClientRef.current.updateCamState(true);
        }
        setIsScreenSharing(false);
        toast.success('Screen sharing stopped');
      } else {
        if (!meetingClientRef.current) {
          toast.error('Please join the meeting first');
          return;
        }

        console.log('[ScreenShare] Requesting screen share...');
        const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: true,
        });

        console.log('[ScreenShare] Screen share granted');
        screenStreamRef.current = displayStream;

        // Combine screen video with audio from camera (if available)
        const audioTracks = localStream?.getAudioTracks() || [];
        const combined = new MediaStream([
          ...audioTracks,
          ...displayStream.getVideoTracks(),
        ]);

        console.log('[ScreenShare] Setting combined stream (screen + audio)');
        setLocalStream(combined);
        meetingClientRef.current.setLocalStream(combined);
        // Notify other participants that screen sharing is active
        meetingClientRef.current.updateCamState(true);
        setIsScreenSharing(true);
        toast.success('Screen sharing started');

        // Handle screen share stop (when user clicks browser's stop sharing button)
        const [videoTrack] = displayStream.getVideoTracks();
        if (videoTrack) {
          videoTrack.onended = () => {
            console.log('[ScreenShare] Screen share ended by user');
            handleScreenShare();
          };
        }
      }
    } catch (e: any) {
      console.error('[ScreenShare] Error:', e);
      if (e.name === 'NotAllowedError') {
        toast.error('Screen sharing permission denied');
      } else {
        toast.error('Could not start screen sharing');
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user || !meetingClientRef.current) return;

    const message = chatInput.trim();
    const timestamp = new Date();
    setChatInput('');

    // Send message via meeting client
    try {
      meetingClientRef.current.sendChatMessage(message);

      // Optimistically add message to local state
      const newMessage: ChatMessage = {
        id: `local-${user.id}-${timestamp.getTime()}`,
        sender: user.name || 'You',
        message,
        timestamp,
      };

      setChatMessages((prev) => [...prev, newMessage]);

      // Scroll to bottom after a short delay to ensure DOM update
      setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Failed to send chat message:', error);
      toast.error('Failed to send message. Please try again.');
    }
  };

  // Auto-scroll chat when new messages arrive
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenParticipant) {
        setFullscreenParticipant(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [fullscreenParticipant]);

  const handleEndClass = async () => {
    if (user?.role === 'TEACHER') {
      // Teacher ending - terminate meeting for everyone via backend
      console.log('[Meeting] Teacher ending meeting for all participants');

      if (!meetingCode) {
        toast.error('Meeting code not found');
        return;
      }

      try {
        // Call backend API to end the meeting (sets active=false)
        await meetingApi.endMeeting(meetingCode, parseInt(user.id, 10));
        console.log('[Meeting] Backend meeting ended successfully');

        // Send end signal via WebSocket to all participants
        if (meetingClientRef.current) {
          meetingClientRef.current.endMeeting(); // Send end signal to all
        }

        toast.success('Meeting ended for all participants');
      } catch (error: any) {
        console.error('[Meeting] Failed to end meeting:', error);
        const errorMsg = error.response?.data?.message || 'Failed to end meeting';
        toast.error(errorMsg);
      }

      // Clean up local resources
      if (meetingClientRef.current) {
        meetingClientRef.current.leave();
        meetingClientRef.current = null;
      }
    } else {
      // Student leaving - just leave for themselves
      console.log('[Meeting] Student leaving meeting');
      if (meetingClientRef.current) {
        meetingClientRef.current.leave();
        meetingClientRef.current = null;
      }
      toast.success('Left meeting');
    }

    const stopAllTracks = (stream: MediaStream | null) => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
          stream.removeTrack(track);
        });
      }
    };

    stopAllTracks(screenStreamRef.current);
    stopAllTracks(cameraStreamRef.current);
    stopAllTracks(localStream);

    navigate('/meetings');
  };

  const participantCount = participants.length;

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Logo size="md" showText={false} />
          <div>
            <h1 className="text-base font-semibold text-gray-900">
              {classroom?.name || 'Meeting'}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Meeting Code: {meetingCode || 'N/A'}</span>

              <span>{participantCount} participants</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleEndClass}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
          >
            {user?.role === 'TEACHER' ? 'End Meeting' : 'Leave Meeting'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Side: Video Display Area */}
        <div className="flex flex-1 flex-col bg-gray-50">
          {/* Video Grid - Show all participants */}
          <div className="flex-1 overflow-y-auto p-4">
            {fullscreenParticipant ? (
              // Fullscreen view
              <div className="fixed inset-0 z-50 bg-black">
                {(() => {
                  const participant = participants.find(p => p.id === fullscreenParticipant);
                  const streamData = fullscreenParticipant === localParticipant.id
                    ? { stream: localStream ?? undefined }
                    : remoteStreams.find(rs => rs.userId === fullscreenParticipant);
                  return participant ? (
                    <ParticipantThumbnail
                      participant={participant}
                      stream={streamData?.stream}
                      isFullscreen={true}
                      onDoubleClick={() => setFullscreenParticipant(null)}
                    />
                  ) : null;
                })()}
              </div>
            ) : (
              // Grid view
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
                {/* Local participant */}
                {localParticipant && (
                  <div className="aspect-video">
                    <ParticipantThumbnail
                      participant={localParticipant}
                      stream={localStream || undefined}
                      onDoubleClick={() => setFullscreenParticipant(localParticipant.id)}
                    />
                  </div>
                )}
                {/* Remote participants */}
                {remoteParticipants.map((participant) => {
                  const streamData = remoteStreams.find(
                    (rs) => rs.userId === participant.id
                  );
                  return (
                    <div key={participant.id} className="aspect-video">
                      <ParticipantThumbnail
                        participant={participant}
                        stream={streamData?.stream}
                        onDoubleClick={() => setFullscreenParticipant(participant.id)}
                      />
                    </div>
                  );
                })}
                {participants.length === 0 && (
                  <div className="col-span-full flex items-center justify-center h-64 text-sm text-gray-500">
                    No participants yet
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Collapsible Sidebar */}
        {sidebarOpen && (
          <aside className="flex w-[320px] flex-shrink-0 flex-col border-l border-gray-200 bg-white">
            {/* Tab Toggle */}
            <div className="flex border-b border-gray-200 relative">
              <button
                onClick={() => setActiveTab('participants')}
                className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'participants'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-4 h-4" />
                Participants
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'chat'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Participants Panel */}
            {activeTab === 'participants' && (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      {participant.avatarUrl ? (
                        <img
                          src={participant.avatarUrl}
                          alt={participant.name}
                          className="h-10 w-10 flex-shrink-0 rounded-full object-cover border-2 border-blue-500"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white ${participant.avatarUrl ? 'hidden' : ''}`}>
                        {participant.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {participant.name}
                          {participant.isLocal && (
                            <span className="ml-2 text-xs text-gray-500">(You)</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {participant.isMuted && (
                          <MicOff className="w-4 h-4 flex-shrink-0 text-gray-400" />
                        )}
                        {raisedHands.has(participant.id) && (
                          <Hand className="w-4 h-4 flex-shrink-0 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Panel */}
            {activeTab === 'chat' && (
              <div className="flex flex-1 flex-col">
                <div className="flex-1 overflow-y-auto p-4">
                  {chatMessages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    <div>
                      {chatMessages.map((message) => (
                        <ChatMessageItem key={message.id} message={message} />
                      ))}
                      <div ref={chatMessagesEndRef} />
                    </div>
                  )}
                </div>
                <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4">
                  <div className="flex gap-2">
                    <input
                      ref={chatInputRef}
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </div>
            )}
          </aside>
        )}

        {/* Sidebar Toggle Button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </main>

      {/* Bottom Control Bar */}
      <footer className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-4">
        {/* Left: Mic and Video Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMic}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              micEnabled
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleCamera}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              cameraEnabled
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
        </div>

        {/* Center: Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSidebarOpen(!sidebarOpen);
              setActiveTab('participants');
            }}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              sidebarOpen && activeTab === 'participants'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setSidebarOpen(!sidebarOpen);
              setActiveTab('chat');
            }}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              sidebarOpen && activeTab === 'chat'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              if (!meetingClientRef.current || !user) return;
              const userId = String(user.id);
              const currentlyRaised = raisedHands.has(userId);
              const newRaisedState = !currentlyRaised;

              meetingClientRef.current.raiseHand(newRaisedState);
              setRaisedHands((prev) => {
                const next = new Set(prev);
                if (newRaisedState) {
                  next.add(userId);
                } else {
                  next.delete(userId);
                }
                return next;
              });
            }}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              raisedHands.has(String(user?.id))
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Hand className="w-5 h-5" />
          </button>
          <button
            onClick={handleScreenShare}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              isScreenSharing
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Monitor className="w-5 h-5" />
          </button>
        </div>

      </footer>
    </div>
  );
};
