import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from './layouts/AuthLayout';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ClassesPage } from './pages/classes/ClassesPage';
import { ClassDetailPage } from './pages/classes/ClassDetailPage';
import { AssignmentsPage } from './pages/assignments/AssignmentsPage';
import { AssignmentDetailPage } from './pages/assignments/AssignmentDetailPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { MeetingPage } from './pages/meeting/MeetingPage';
import { MeetingJoinPage } from './pages/meeting/MeetingJoinPage';
import { MeetingsPage } from './pages/meetings/MeetingsPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { AssistantPage } from './pages/assistant/AssistantPage';
import { PdfSummaryPage } from './pages/ai/PdfSummaryPage';
import { useAuth } from './hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout /> }>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/meetings" element={<MeetingsPage />} />
        <Route path="/meeting/join/:meetingCode" element={<MeetingJoinPage />} />
        <Route path="/meeting/:meetingCode" element={<MeetingPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/ai/pdf-summary" element={<PdfSummaryPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/classes/:id" element={<ClassDetailPage />} />
        <Route path="/class/:id" element={<ClassDetailPage />} />
        <Route path="/assignments" element={<AssignmentsPage />} />
        <Route path="/assignments/:id" element={<AssignmentDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
