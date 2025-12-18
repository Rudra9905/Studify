import type { User, UserRole } from '../context/AuthContext';

export type { User, UserRole };

export interface Classroom {
  id: string;
  name: string;
  description?: string;
  code: string;
  teacherName: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorProfileImageUrl?: string;
  createdAt: string;
  attachmentUrl?: string;
}

export type AssignmentStatus = 'OPEN' | 'CLOSED' | 'SUBMITTED' | 'GRADED';

export interface Assignment {
  id: string;
  classroomId: string;
  title: string;
  description?: string;
  dueDate: string;
  maxMarks: number;
  status?: AssignmentStatus;
  attachmentUrl?: string;
}

export interface StudentAssignment {
  id: string;
  classroomId: string;
  classroomName: string;
  title: string;
  description?: string;
  dueDate: string;
  maxMarks: number;
  createdAt: string;
  attachmentUrl?: string;
  isSubmitted: boolean;
  submittedAt?: string;
  marks?: number;
  feedback?: string;
  isPastDeadline: boolean;
}

export interface AssignmentStatistics {
  assignmentId: string;
  totalStudents: number;
  submittedCount: number;
  notSubmittedCount: number;
  gradedCount: number;
}

export interface NonSubmittedStudent {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Member {
  id: string;
  name: string;
  role: UserRole;
  joinedAt: string;
  profileImageUrl?: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentName: string;
  submittedAt: string;
  contentUrl?: string;
  marks?: number;
  feedback?: string;
}

export interface ChatMessage {
  id: string;
  classroomId: string;
  senderName: string;
  senderProfileImageUrl?: string;
  content: string;
  createdAt: string;
}

export interface DashboardSummary {
  classCount: number;
  pendingAssignments: number;
  upcomingDeadlines: number;
}
