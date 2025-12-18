import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs } from '../../components/ui/Tabs';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { classroomApi } from '../../services/classroomApi';
import { chatApi } from '../../services/chatApi';
import { assignmentApi } from '../../services/assignmentApi';
import { fileApi } from '../../services/fileApi';
import { meetingApi } from '../../services/meetingApi';
import { Link } from 'react-router-dom';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  FaceSmileIcon,
  TrashIcon,
  ArrowDownCircleIcon,
  CheckIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/solid';
import type {
  Classroom,
  Announcement,
  Assignment,
  Member,
  ChatMessage,
} from '../../types/domain';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const TAB_IDS = {
  STREAM: 'stream',
  ASSIGNMENTS: 'assignments',
  MEMBERS: 'members',
  CHAT: 'chat',
  // LIVE: 'live', // Removed as per new meeting system design
} as const;

export const ClassDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.role === 'TEACHER';

  const [activeTab, setActiveTab] = useState<string>(TAB_IDS.STREAM);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [announcementMeetingStatus, setAnnouncementMeetingStatus] = useState<Map<string, boolean>>(new Map());
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<number | null>(null);

  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementContent, setNewAnnouncementContent] = useState('');
  const [announcementFile, setAnnouncementFile] = useState<File | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [joinMeetingCode, setJoinMeetingCode] = useState('');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [assignmentDueDate, setAssignmentDueDate] = useState('');
  const [assignmentMaxMarks, setAssignmentMaxMarks] = useState('');
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isDeletingClass, setIsDeletingClass] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAtBottom(true);
  };

  useEffect(() => {
    if (activeTab === TAB_IDS.CHAT) {
      scrollToBottom();
    }
  }, [activeTab]);

  // Only auto-scroll on tab change or when user is already near the bottom;
  // do NOT force-scroll on every messages change to avoid dragging the user.

  // Track scroll position for "scroll to bottom" button
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (!el) return;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setIsAtBottom(distanceFromBottom < 8);
    };

    el.addEventListener('scroll', handleScroll);
    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Live reload: Poll for new messages when chat tab is active
  useEffect(() => {
    if (activeTab !== TAB_IDS.CHAT || !id || !user) return;

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let isPolling = false;

    const pollMessages = async () => {
      if (isPolling) return;
      isPolling = true;
      setIsRefreshing(true);

      try {
        const msgs = await chatApi.getMessages(id, user.id);
        
        // Check if there are new messages
        if (msgs.length > 0) {
          const latestMessageId = parseInt(msgs[msgs.length - 1].id);
          const hasNewMessages = lastMessageId === null || latestMessageId > lastMessageId;
          
          if (hasNewMessages && lastMessageId !== null) {
            const el2 = messagesContainerRef.current;
            if (el2) {
              const nearBottom = el2.scrollHeight - el2.scrollTop - el2.clientHeight < 8;
              if (nearBottom) {
                setTimeout(() => scrollToBottom(), 100);
              }
            }
          }
          
          setLastMessageId(latestMessageId);
          setMessages(msgs);
        } else {
          setMessages([]);
        }
      } catch (e: any) {
        console.error('Failed to poll chat messages:', e);
      } finally {
        setIsRefreshing(false);
        isPolling = false;
      }
    };

    // Initial load
    pollMessages();

    // Set up polling interval (every 2 seconds)
    pollInterval = setInterval(pollMessages, 2000);

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [activeTab, id, user, lastMessageId]);

  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [cls, anns, asg, mem] = await Promise.all([
          classroomApi.getClassroom(id),
          classroomApi.getAnnouncements(id),
          classroomApi.getAssignments(id),
          classroomApi.getMembers(id),
        ]);
        setClassroom(cls);
        setAnnouncements(anns);
        setAssignments(asg);
        setMembers(mem);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load classroom');
      } finally {
        setLoading(false);
      }
      
      // Load chat messages separately so failure doesn't break the page
      try {
        const msgs = await chatApi.getMessages(id, user.id);
        setMessages(msgs);
        // Set last message ID for polling
        if (msgs.length > 0) {
          setLastMessageId(parseInt(msgs[msgs.length - 1].id));
        }
      } catch (e: any) {
        console.error('Failed to load chat messages:', e);
        const errorMessage = e.response?.data?.message || e.message || 'Failed to load chat messages';
        toast.error(errorMessage);
        setMessages([]); // Set to empty array instead of null
      }
    };
    load();
  }, [id, user]);

  // Add useEffect to check meeting statuses for announcements
  useEffect(() => {
    if (!announcements || announcements.length === 0) return;
    
    const checkMeetingStatuses = async () => {
      const statusMap = new Map<string, boolean>();
      
      // Filter announcements that contain meeting codes
      const meetingAnnouncements = announcements.filter(a => 
        a.content.includes('Code:') && a.content.includes('live meeting has started')
      );
      
      // Check status for each meeting announcement
      for (const announcement of meetingAnnouncements) {
        const match = announcement.content.match(/Code:\s*([A-Z0-9]{6})/);
        if (match && match[1]) {
          try {
            const meetingStatus = await meetingApi.getMeetingStatus(match[1]);
            statusMap.set(announcement.id.toString(), meetingStatus.active);
          } catch (err) {
            console.error('Failed to check meeting status for announcement:', announcement.id, err);
            // Default to active if we can't check
            statusMap.set(announcement.id.toString(), true);
          }
        }
      }
      
      setAnnouncementMeetingStatus(statusMap);
    };
    
    checkMeetingStatuses();
    
    // Periodically check meeting statuses every 30 seconds
    const interval = setInterval(checkMeetingStatuses, 30000);
    
    return () => clearInterval(interval);
  }, [announcements]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!user) return;
    try {
      let attachmentUrl: string | undefined;
      if (announcementFile) {
        const ext = announcementFile.name.split('.').pop()?.toLowerCase();
        const allowed = ['pdf', 'zip', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!ext || !allowed.includes(ext)) {
          toast.error('Only PDF, image, or ZIP files are allowed');
          return;
        }
        attachmentUrl = await fileApi.upload(announcementFile);
      }
      const created = await classroomApi.createAnnouncement(id, user.id, {
        title: newAnnouncementTitle,
        content: newAnnouncementContent,
        attachmentUrl,
      });
      setAnnouncements((prev) => (prev ? [created, ...prev] : [created]));
      setNewAnnouncementTitle('');
      setNewAnnouncementContent('');
      setAnnouncementFile(null);
      toast.success('Announcement posted');
    } catch (e) {
      console.error(e);
      toast.error('Failed to post announcement');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) {
      toast.error('Missing classroom or user information');
      return;
    }

    const due = new Date(assignmentDueDate);
    if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
      toast.error('Due date must be in the future');
      return;
    }

    try {
      let attachmentUrl: string | undefined;
      if (assignmentFile) {
        const ext = assignmentFile.name.split('.').pop()?.toLowerCase();
        const allowed = ['pdf', 'zip', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!ext || !allowed.includes(ext)) {
          toast.error('Only PDF, image, or ZIP files are allowed');
          return;
        }
        attachmentUrl = await fileApi.upload(assignmentFile);
      }

      const created = await classroomApi.createAssignment(id, user.id, {
        title: assignmentTitle,
        description: assignmentDescription,
        dueDate: new Date(assignmentDueDate).toISOString(),
        maxMarks: parseInt(assignmentMaxMarks, 10),
        attachmentUrl,
      });
      setAssignments((prev) => (prev ? [created, ...prev] : [created]));
      setShowAssignmentModal(false);
      setAssignmentTitle('');
      setAssignmentDescription('');
      setAssignmentDueDate('');
      setAssignmentMaxMarks('');
      setAssignmentFile(null);
      toast.success('Assignment created');
      // Refresh dashboard if we're on it
      if (window.location.pathname === '/dashboard') {
        window.dispatchEvent(new Event('focus'));
      }
    } catch (e: any) {
      console.error('Error creating assignment:', e);
      const errorMessage = e.response?.data?.message || e.message || 'Failed to create assignment';
      toast.error(errorMessage);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !chatInput.trim() || !user) return;
    const messageContent = chatInput.trim();
    setChatInput(''); // Clear input immediately for better UX
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    try {
      const created = await chatApi.sendMessage(id, user.id, { content: messageContent });
      setMessages((prev) => {
        const updated = prev ? [...prev, created] : [created];
        // Update last message ID
        if (updated.length > 0) {
          setLastMessageId(parseInt(updated[updated.length - 1].id));
        }
        return updated;
      });
      // Scroll to bottom after sending
      setTimeout(() => scrollToBottom(), 100);
    } catch (e: any) {
      console.error('Failed to send message:', e);
      setChatInput(messageContent); // Restore message on error
      const errorMessage = e.response?.data?.message || e.message || 'Failed to send message';
      toast.error(errorMessage);
    }
  };

  const handleSendAttachment = async (file: File) => {
    if (!id || !user) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['pdf', 'zip', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!ext || !allowed.includes(ext)) {
      toast.error('Only PDF, image, or ZIP files are allowed');
      return;
    }
    try {
      setIsUploadingAttachment(true);
      const url = await fileApi.upload(file);
      const content = `${file.name}\n${url}`;
      const created = await chatApi.sendMessage(id, user.id, { content });
      setMessages((prev) => {
        const updated = prev ? [...prev, created] : [created];
        if (updated.length > 0) {
          setLastMessageId(parseInt(updated[updated.length - 1].id));
        }
        return updated;
      });
      setTimeout(() => scrollToBottom(), 100);
    } catch (e: any) {
      console.error('Failed to send attachment:', e);
      const errorMessage = e.response?.data?.message || e.message || 'Failed to send attachment';
      toast.error(errorMessage);
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const generateMeetingCode = () => {
    // 6-digit numeric code as string
    const n = Math.floor(100000 + Math.random() * 900000);
    return String(n);
  };

  const handleStartNewMeeting = async () => {
    if (!isTeacher) {
      toast.error('Only teachers can start meetings');
      return;
    }
    if (!id || !user) {
      toast.error('Unable to start meeting');
      return;
    }
    
    try {
      toast.loading('Starting meeting...');
      // Create classroom meeting in backend
      const meeting = await meetingApi.createClassroomMeeting({
        classroomId: parseInt(id, 10),
        hostUserId: parseInt(user.id, 10)
      });
      toast.dismiss();
      toast.success(`Meeting started! Code: ${meeting.meetingCode}`);
      // Navigate to meeting join page using meeting code
      navigate(`/meeting/join/${meeting.meetingCode}`);
    } catch (error: any) {
      toast.dismiss();
      console.error('Failed to create meeting:', error);
      const errorMsg = error.response?.data?.message || 'Failed to start meeting';
      toast.error(errorMsg);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinMeetingCode.trim();
    if (!trimmed) {
      toast.error('Enter a meeting code');
      return;
    }
    navigate(`/meeting/join/${trimmed}`);
  };

  const handleDeleteClass = async () => {
    if (!id || !user || !isTeacher) return;
    const confirmed = window.confirm(
      'Delete this class and remove all enrolled students? This cannot be undone.'
    );
    if (!confirmed) return;
    try {
      setIsDeletingClass(true);
      await classroomApi.deleteClassroom(id, user.id);
      toast.success('Class deleted');
      navigate('/classes');
    } catch (e: any) {
      console.error(e);
      const message = e.response?.data?.message || e.message || 'Failed to delete class';
      toast.error(message);
    } finally {
      setIsDeletingClass(false);
    }
  };

  const handleClearChat = async () => {
    if (!id || !user || !isTeacher) return;
    if (!confirm('Clear all chat messages for this class? This cannot be undone.')) return;
    try {
      setIsClearingChat(true);
      await chatApi.clearMessages(id, user.id);
      setMessages([]);
      setLastMessageId(null);
      setTimeout(() => scrollToBottom(), 50);
      toast.success('Chat cleared');
    } catch (e: any) {
      console.error('Failed to clear chat messages:', e);
      const status = e.response?.status as number | undefined;
      let errorMessage = (e.response?.data as any)?.message || e.message || 'Failed to clear chat';
      if (!errorMessage || errorMessage === 'Internal server error' || (status && status >= 500)) {
        errorMessage = 'Failed to clear chat. Please try again.';
      }
      toast.error(errorMessage);
    } finally {
      setIsClearingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        <Spinner />
      </div>
    );
  }

  if (!classroom) {
    return <p className="text-sm text-slate-500">Classroom not found.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Classroom hero header with primary blue gradient */}
      <header
        className="overflow-hidden rounded-2xl text-white shadow-md"
        style={{
          background:
            'linear-gradient(135deg, #4f9cff 0%, #3f8cff 50%, #6fb3ff 100%)',
        }}
      >
        <div className="relative flex flex-col gap-6 px-6 py-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[color-mix(in_oklab,#e0f2fe_88%,#ffffff_12%)]">
              Class · {classroom.code}
            </p>
            <h1 className="mt-1 text-2xl font-semibold leading-snug md:text-3xl">
              {classroom.name}
            </h1>
            <p className="mt-1 text-sm text-[color-mix(in_oklab,#e0f2fe_92%,#ffffff_8%)]">
              {classroom.teacherName}
            </p>
            {classroom.description && (
              <p className="mt-2 max-w-xl text-xs text-[color-mix(in_oklab,#e0f2fe_88%,#ffffff_12%)]">
                {classroom.description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-3 text-xs text-blue-50 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-900/20 px-4 py-2 shadow-sm ring-1 ring-blue-300/60">
                <p className="text-[11px] uppercase tracking-wide text-blue-100">
                  Class code
                </p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-white">
                  {classroom.code}
                </p>
              </div>
              {isTeacher && (
                <div className="rounded-xl bg-red-900/20 px-4 py-2 shadow-sm ring-1 ring-red-300/60">
                  <p className="text-[11px] uppercase tracking-wide text-red-100">
                    Delete class
                  </p>
                  <button
                    type="button"
                    onClick={handleDeleteClass}
                    disabled={isDeletingClass}
                    className="mt-0.5 block text-sm font-semibold text-white transition hover:text-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeletingClass ? 'Deleting...' : 'Delete Class'}
                  </button>
                </div>
              )}
            </div>
            {!isTeacher && user && (
              <button
                type="button"
                className="rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-semibold text-red-100 backdrop-blur transition hover:bg-white/20"
                onClick={async () => {
                  if (!id || !user) return;
                  if (!confirm('Leave this class? You will lose access to all assignments and materials.')) return;
                  try {
                    await classroomApi.leaveClassroom(id, user.id);
                    toast.success('Left class');
                    navigate('/classes');
                  } catch (err: any) {
                    console.error(err);
                    toast.error(err.response?.data?.message || 'Failed to leave class');
                  }
                }}
              >
                Leave class
              </button>
            )}
          </div>
        </div>
      </header>

      <Tabs
        tabs={[
          { id: TAB_IDS.STREAM, label: 'Stream' },
          { id: TAB_IDS.ASSIGNMENTS, label: 'Assignments' },
          { id: TAB_IDS.MEMBERS, label: 'Members' },
          { id: TAB_IDS.CHAT, label: 'Chat' },
          // { id: TAB_IDS.LIVE, label: 'Live' }, // Removed as per new meeting system design
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === TAB_IDS.STREAM && (
        <section className="space-y-4">
          {isTeacher && (
            <Card>
              <form className="space-y-3" onSubmit={handleCreateAnnouncement}>
                <Input
                  label="Title"
                  value={newAnnouncementTitle}
                  onChange={(e) => setNewAnnouncementTitle(e.target.value)}
                  required
                />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Announcement
                  </label>
                  <textarea
                    className="block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] text-[var(--text)]"
                    rows={3}
                    value={newAnnouncementContent}
                    onChange={(e) => setNewAnnouncementContent(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Attachment (optional)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/*,application/zip"
                    className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-md file:border file:border-[var(--border-subtle)] file:bg-[var(--light)] file:px-3 file:py-1 file:text-sm file:font-medium file:text-[var(--text)] hover:file:bg-[color-mix(in_oklab,var(--light)_80%,var(--background)_20%)]"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setAnnouncementFile(file);
                    }}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Post</Button>
                </div>
              </form>
            </Card>
          )}

          {(!announcements || announcements.length === 0) && (
            <p className="text-sm text-slate-500">No announcements yet.</p>
          )}
          <div className="space-y-3">
            {announcements?.map((a) => (
              <Card key={a.id} className="space-y-1">
                <div className="flex items-center gap-3">
                  <Avatar name={a.authorName} imageUrl={a.authorProfileImageUrl} size="sm" />
                  <div className="flex-1 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center">
                      <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
                      {a.content.includes('Code:') && a.content.includes('live meeting has started') && (
                        (() => {
                          const isActive = announcementMeetingStatus.get(a.id.toString()) ?? true;
                          return (
                            <>
                              {isActive ? (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 ml-2">
                                  Live Meeting
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 ml-2">
                                  Meeting Ended
                                </span>
                              )}
                            </>
                          );
                        })()
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p>{new Date(a.createdAt).toLocaleString()}</p>
                      {isTeacher && (
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:text-red-700"
                          onClick={async () => {
                            if (!id) return;
                            if (!confirm('Delete this announcement? This cannot be undone.')) return;
                            try {
                              await classroomApi.deleteAnnouncement(id, a.id);
                              setAnnouncements((prev) => prev?.filter((ann) => ann.id !== a.id) ?? []);
                              toast.success('Announcement deleted');
                            } catch (err) {
                              console.error(err);
                              toast.error('Failed to delete announcement');
                            }
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-700">{a.content}</p>
                {/* Check if this is a classroom meeting announcement and extract meeting code */}
                {a.content.includes('Code:') && a.content.includes('live meeting has started') && (
                  <div className="mt-2">
                    <Button 
                      size="sm" 
                      disabled={!(announcementMeetingStatus.get(a.id.toString()) ?? true)}
                      onClick={async () => {
                        // Extract meeting code from content like "Code: ABC123"
                        const match = a.content.match(/Code:\s*([A-Z0-9]{6})/);
                        if (match && match[1]) {
                          try {
                            // Check meeting status before navigating
                            const meetingStatus = await meetingApi.getMeetingStatus(match[1]);
                            if (meetingStatus.active) {
                              navigate(`/meeting/${match[1]}`);
                            } else {
                              toast.error('This meeting has already ended');
                            }
                          } catch (err) {
                            console.error('Failed to check meeting status:', err);
                            toast.error('Could not verify meeting status. Please try again.');
                          }
                        } else {
                          toast.error('Could not extract meeting code from announcement');
                        }
                      }}
                    >
                      {(announcementMeetingStatus.get(a.id.toString()) ?? true) ? 'Join Meeting' : 'Meeting Ended'}
                    </Button>
                  </div>
                )}
                {a.attachmentUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <a
                      href={a.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      Open attachment
                    </a>
                    {isTeacher && (
                      <button
                        type="button"
                        className="text-xs text-slate-400 hover:text-red-600"
                        onClick={async () => {
                          if (!id) return;
                          try {
                            const updated = await classroomApi.clearAnnouncementAttachment(
                              id,
                              a.id
                            );
                            setAnnouncements((prev) =>
                              prev?.map((ann) => (ann.id === updated.id ? updated : ann)) ?? []
                            );
                            toast.success('Attachment removed');
                          } catch (err) {
                            console.error(err);
                            toast.error('Failed to remove attachment');
                          }
                        }}
                      >
                        Remove material
                      </button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {activeTab === TAB_IDS.ASSIGNMENTS && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Assignments</h2>
            {isTeacher && (
              <Button onClick={() => setShowAssignmentModal(true)}>Create assignment</Button>
            )}
          </div>

          {showAssignmentModal && (
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">New Assignment</h3>
                <button
                  onClick={() => setShowAssignmentModal(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
              <form className="space-y-3" onSubmit={handleCreateAssignment}>
                <Input
                  label="Title"
                  value={assignmentTitle}
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                  required
                />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    className="block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] text-[var(--text)]"
                    rows={3}
                    value={assignmentDescription}
                    onChange={(e) => setAssignmentDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">
                      Due Date
                    </label>
                    <input
                      type="datetime-local"
                      className="block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] text-[var(--text)]"
                      value={assignmentDueDate}
                      onChange={(e) => setAssignmentDueDate(e.target.value)}
                      required
                    />
                  </div>
                  <Input
                    label="Max Marks"
                    type="number"
                    value={assignmentMaxMarks}
                    onChange={(e) => setAssignmentMaxMarks(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Attachment (optional)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/*,application/zip"
                    className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-md file:border file:border-[var(--border-subtle)] file:bg-[var(--light)] file:px-3 file:py-1 file:text-sm file:font-medium file:text-[var(--text)] hover:file:bg-[color-mix(in_oklab,var(--light)_80%,var(--background)_20%)]"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setAssignmentFile(file);
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAssignmentModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </Card>
          )}

          {(!assignments || assignments.length === 0) && (
            <p className="text-sm text-slate-500">No assignments yet.</p>
          )}
          <div className="space-y-3">
            {assignments?.map((a) => (
              <Card key={a.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-500">
                    Due {new Date(a.dueDate).toLocaleDateString()} · Max {a.maxMarks} marks
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {isTeacher ? (
                    <>
                      <Link
                        to={`/assignments/${a.id}`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        OPEN
                      </Link>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          if (!id || !user) {
                            toast.error('Missing classroom or user information');
                            return;
                          }
                          if (confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
                            try {
                              await assignmentApi.deleteAssignment(id, a.id, user.id);
                              setAssignments((prev) => prev?.filter((asg) => asg.id !== a.id) || null);
                              toast.success('Assignment deleted');
                            } catch (error: any) {
                              console.error('Failed to delete assignment:', error);
                              const message =
                                error?.response?.data?.message ||
                                error?.message ||
                                'Failed to delete assignment. Please try again.';
                              toast.error(message);
                            }
                          }
                        }}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-50"
                      >
                        DELETE
                      </button>
                    </>
                  ) : (
                    <Link
                      to={`/assignments/${a.id}`}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      OPEN
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {activeTab === TAB_IDS.MEMBERS && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Members</h2>
          </div>
          {(!members || members.length === 0) && (
            <p className="text-sm text-slate-500">No members yet.</p>
          )}
          <ul className="divide-y divide-slate-100 rounded-2xl bg-white shadow-soft ring-1 ring-slate-100">
            {members?.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <Avatar name={m.name} imageUrl={m.profileImageUrl} size="md" />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{m.name}</p>
                  <p className="text-xs text-slate-500">
                    Joined {new Date(m.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={m.role === 'TEACHER' ? 'outline' : 'default'}>
                  {m.role === 'TEACHER' ? 'Teacher' : 'Student'}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeTab === TAB_IDS.CHAT && (
        <section className="flex h-[600px] flex-col rounded-2xl bg-white/80 shadow-soft ring-1 ring-slate-100 backdrop-blur-sm dark:bg-slate-900/70 dark:ring-slate-700">
          {/* Chat Top Bar / Nav */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 px-4 py-3 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 dark:border-slate-800">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600/10 text-primary-600 dark:bg-primary-500/10 dark:text-primary-300">
                  <span className="text-xs font-semibold">CC</span>
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {classroom.name} · Class Chat
                  </h3>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {classroom.teacherName} · {classroom.code}
                  </p>
                </div>
                {isRefreshing && (
                  <div className="flex items-center gap-1.5 pl-1">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-500 dark:bg-primary-300" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)] dark:shadow-[0_0_0_4px_rgba(45,212,191,0.35)]" />
              </div>
              {isTeacher && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear chat"
                  disabled={isClearingChat}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-red-500/60 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Messages Container */}
          <div
            ref={messagesContainerRef}
            className="relative flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/60 via-slate-50/40 to-white px-3 py-3 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900"
          >
            {(!messages || messages.length === 0) && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-slate-100 p-6">
                  <svg
                    className="h-12 w-12 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9 8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700">No messages yet</p>
                <p className="mt-1 text-xs text-slate-500">Start the conversation!</p>
              </div>
            )}

            {messages && messages.length > 0 && (
              <div className="space-y-4">
                {Object.entries(
                  messages.reduce<Record<string, ChatMessage[]>>((groups, m) => {
                    const d = new Date(m.createdAt);
                    const key = d.toDateString();
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(m);
                    return groups;
                  }, {})
                ).map(([dateKey, groupMessages]) => {
                  const dateObj = new Date(groupMessages[0].createdAt);
                  const label =
                    dateObj.toDateString() === new Date().toDateString()
                      ? 'Today'
                      : dateObj.toDateString();
                  return (
                    <div key={dateKey} className="space-y-2">
                      <div className="sticky top-0 z-10 flex justify-center py-1">
                        <span className="rounded-full bg-white/80 px-3 py-0.5 text-[11px] font-medium text-slate-500 shadow-sm ring-1 ring-slate-200/70 backdrop-blur-sm dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700">
                          {label}
                        </span>
                      </div>
                      <div className="space-y-3 px-1">
                        {groupMessages.map((m, index) => {
                          const isCurrentUser = m.senderName === user?.name;
                          const messageDate = new Date(m.createdAt);
                          const isToday = messageDate.toDateString() === new Date().toDateString();
                          const isRecent = Date.now() - messageDate.getTime() < 60000;
                          const timeString = isToday
                            ? messageDate.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })
                            : messageDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              });
                          const globalIndex = messages.findIndex((mm) => mm.id === m.id);
                          const isLastFromCurrentUser =
                            isCurrentUser &&
                            globalIndex !== -1 &&
                            globalIndex === messages.length - 1;
                          const statusLabel = isLastFromCurrentUser ? 'Seen' : 'Sent';

                          // Basic attachment parsing: we encode attachments as "fileName\nurl"
                          const lines = m.content.split('\n').map((l) => l.trim()).filter(Boolean);
                          let attachmentType: 'image' | 'file' | null = null;
                          let attachmentName: string | null = null;
                          let attachmentUrl: string | null = null;

                          if (lines.length === 2 && /^https?:\/\//i.test(lines[1])) {
                            const name = lines[0];
                            const url = lines[1];
                            const ext = name.split('.').pop()?.toLowerCase();
                            const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                            if (ext && imageExts.includes(ext)) {
                              attachmentType = 'image';
                            } else {
                              attachmentType = 'file';
                            }
                            attachmentName = name;
                            attachmentUrl = url;
                          }

                          return (
                            <div
                              key={m.id}
                              className={`flex gap-3 text-sm transition-all duration-200 ${
                                isCurrentUser ? 'flex-row-reverse' : 'flex-row'
                              }`}
                            >
                              <div className="mt-0.5 flex-shrink-0">
                                <Avatar name={m.senderName} imageUrl={m.senderProfileImageUrl} size="sm" />
                              </div>
                              <div
                                className={`flex max-w-[78%] flex-col ${
                                  isCurrentUser ? 'items-end' : 'items-start'
                                }`}
                              >
                                <div
                                  className={`mb-0.5 flex items-center gap-1 text-[11px] ${
                                    isCurrentUser
                                      ? 'justify-end text-slate-500 dark:text-slate-400'
                                      : 'justify-start text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  {!isCurrentUser && (
                                    <span className="font-medium">{m.senderName}</span>
                                  )}
                                  <span>·</span>
                                  <span>{timeString}</span>
                                </div>
                                <div
                                  className={`group relative w-full rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ring-1 transition-all hover:shadow-md ${
                                    isCurrentUser
                                      ? 'rounded-br-md bg-gradient-to-br from-primary-600 to-primary-700 text-white ring-primary-500/60 dark:from-primary-500 dark:to-primary-600'
                                      : 'rounded-bl-md bg-white text-slate-900 ring-slate-200 hover:ring-slate-300 dark:bg-slate-800 dark:text-slate-50 dark:ring-slate-700 dark:hover:ring-slate-500'
                                  } ${isRecent ? 'ring-2 ring-primary-200 dark:ring-primary-400/60' : ''}`}
                                >
                                  {attachmentType === 'image' && attachmentUrl && attachmentName ? (
                                    <div className="space-y-2">
                                      <a
                                        href={attachmentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900"
                                      >
                                        <img
                                          src={attachmentUrl}
                                          alt={attachmentName}
                                          className="max-h-64 w-full object-contain"
                                        />
                                      </a>
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="truncate opacity-90">{attachmentName}</span>
                                        <a
                                          href={attachmentUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium shadow-sm ${
                                            isCurrentUser
                                              ? 'bg-white/10 text-white hover:bg-white/20'
                                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-50 dark:hover:bg-slate-600'
                                          }`}
                                        >
                                          View
                                        </a>
                                      </div>
                                    </div>
                                  ) : attachmentType === 'file' && attachmentUrl && attachmentName ? (
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                                          isCurrentUser
                                            ? 'bg-primary-500/20 text-white'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-100'
                                        }`}
                                      >
                                        <PaperClipIcon className="h-4 w-4" />
                                      </div>
                                      <div className="min-w-0 flex-1 text-xs">
                                        <p className="truncate font-medium">{attachmentName}</p>
                                        <p className="text-[11px] opacity-70">Document</p>
                                      </div>
                                      <a
                                        href={attachmentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`flex items-center justify-center rounded-full px-2 py-1 text-[11px] font-medium shadow-sm ${
                                          isCurrentUser
                                            ? 'bg-white/10 text-white hover:bg-white/20'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-50 dark:hover:bg-slate-600'
                                        }`}
                                      >
                                        Download
                                      </a>
                                    </div>
                                  ) : (
                                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                                      {m.content}
                                    </p>
                                  )}
                                </div>
                                {isCurrentUser && (
                                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                                    {statusLabel === 'Seen' ? (
                                      <CheckBadgeIcon className="h-3.5 w-3.5 text-primary-400 dark:text-primary-300" />
                                    ) : (
                                      <CheckIcon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                    )}
                                    <span>{statusLabel}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Typing indicator (local) */}
            {isTyping && (
              <div className="mt-2 flex items-center gap-2 px-2 text-[11px] text-slate-400 dark:text-slate-500">
                <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
                  <span>Typing</span>
                  <span className="flex gap-0.5">
                    <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                    <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400" />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-1" />

            {/* Scroll to bottom FAB */}
            {!isAtBottom && messages && messages.length > 0 && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="group absolute bottom-3 right-3 inline-flex h-9 items-center justify-center rounded-full bg-white/95 px-3 text-xs font-medium text-slate-600 shadow-lg ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-800 dark:bg-slate-800/95 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
              >
                <ArrowDownCircleIcon className="mr-1 h-4 w-4 text-primary-500 group-hover:text-primary-600 dark:text-primary-400" />
                New messages
              </button>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-200 bg-gradient-to-b from-white/80 to-slate-50/70 p-3 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
            <form
              className="space-y-1"
              onSubmit={handleSendMessage}
            >
              <div className="relative flex items-end gap-3">
                <div className="relative flex-1">
                  <textarea
                    ref={textareaRef}
                    className="block w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pr-12 text-sm placeholder:text-slate-400 outline-none shadow-sm transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-500"
                    placeholder={`Message #${classroom.code} · Type a message, share a file, or add an emoji...`}
                    value={chatInput}
                    onChange={(e) => {
                      setChatInput(e.target.value);
                      setIsTyping(true);
                      if (typingTimeoutRef.current) {
                        window.clearTimeout(typingTimeoutRef.current);
                      }
                      typingTimeoutRef.current = window.setTimeout(() => {
                        setIsTyping(false);
                      }, 1500);
                      // Auto-resize textarea
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (chatInput.trim()) {
                          const formEvent = new Event('submit', { bubbles: true, cancelable: true });
                          e.currentTarget.closest('form')?.dispatchEvent(formEvent);
                        }
                      }
                    }}
                    rows={1}
                    style={{ maxHeight: '120px' }}
                  />

                  {/* Right input icons */}
                  <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      title="Attach file"
                      disabled={isUploadingAttachment}
                    >
                      <PaperClipIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEmojiPickerOpen((v) => !v)}
                      className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      title="Add emoji"
                    >
                      <FaceSmileIcon className="h-4 w-4" />
                    </button>
                  </div>

                {/* Emoji picker (simple) */}
                {isEmojiPickerOpen && (
                  <div className="absolute bottom-12 left-0 z-20 w-52 rounded-2xl bg-white p-2 text-base shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                    <div className="mb-1 px-1 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Quick emojis
                    </div>
                    <div className="grid grid-cols-6 gap-1 text-lg">
                      {['😀', '😊', '😂', '😍', '👍', '🎉', '🙌', '🤔', '😢', '🔥', '🙏', '📚'].map(
                        (emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => {
                              setChatInput((prev) => `${prev}${emoji}`);
                              setIsEmojiPickerOpen(false);
                              textareaRef.current?.focus();
                            }}
                          >
                            {emoji}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden file input for attachments */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="application/pdf,image/*,application/zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleSendAttachment(file);
                  }
                }}
              />

              {/* Floating send button */}
              <div className="relative h-11 w-11 shrink-0">
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="group absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/40 transition-all hover:from-primary-700 hover:to-primary-800 hover:shadow-primary-500/60 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-primary-600 disabled:hover:to-primary-700 dark:shadow-primary-500/30 dark:focus:ring-offset-slate-900"
                  title="Send message (Enter)"
                >
                  <PaperAirplaneIcon className="h-5 w-5 -rotate-6 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            {/* Helper text row below input */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <span className="hidden sm:inline">Press Enter to send · Shift+Enter for new line</span>
              <span className="sm:hidden">Enter = send</span>
              <span className="ml-auto hidden pl-4 sm:inline">Messages refresh every 2s</span>
            </div>
          </form>
        </div>
        </section>
      )}

      {/* Live Tab Content removed as per new meeting system design */}
      {/* {activeTab === TAB_IDS.LIVE && (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-900">Live meeting</h2>
              <p className="text-xs text-slate-500 max-w-sm">
                Teachers can start a new live meeting and share the meeting code. Students can
                join using the code.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              {isTeacher && (
                <Button type="button" onClick={handleStartNewMeeting}>
                  Start new meeting
                </Button>
              )}
              {!isTeacher && (
                <p className="text-xs text-slate-500 text-right">
                  Ask your teacher for a meeting code and join below.
                </p>
              )}
            </div>
          </div>

          <Card className="max-w-md">
            <form className="flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={handleJoinByCode}>
              <div className="flex-1">
                <input
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="Enter meeting code"
                  value={joinMeetingCode}
                  onChange={(e) => setJoinMeetingCode(e.target.value)}
                />
              </div>
              <Button type="submit" className="shrink-0">
                Join by code
              </Button>
            </form>
          </Card>
        </section>
      )} */}
    </div>
  );
};
