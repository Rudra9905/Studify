import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { classroomApi } from '../../services/classroomApi';
import { assignmentApi } from '../../services/assignmentApi';
import type { Classroom, Announcement, StudentAssignment } from '../../types/domain';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { Link } from 'react-router-dom';

type CalendarEventType = 'ASSIGNMENT_DUE' | 'ANNOUNCEMENT';

interface CalendarEventBase {
  id: string;
  type: CalendarEventType;
  classroomId: string;
  classroomName: string;
  date: string; // ISO string
}

interface AssignmentEvent extends CalendarEventBase {
  type: 'ASSIGNMENT_DUE';
  title: string;
  assignmentId: string;
}

interface AnnouncementEvent extends CalendarEventBase {
  type: 'ANNOUNCEMENT';
  title: string;
  announcementId: string;
}

type CalendarEvent = AssignmentEvent | AnnouncementEvent;

export const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Load all classrooms the user is part of
        const classrooms: Classroom[] = await classroomApi.getClassrooms(
          user.role === 'TEACHER' ? { teacherId: user.id } : { studentId: user.id }
        );

        // Assignments for this user (as student or teacher)
        const assignments: StudentAssignment[] = await assignmentApi.getStudentAssignments(
          user.id,
          user.role
        );

        const assignmentEvents: AssignmentEvent[] = assignments.map((a) => ({
          id: `a-${a.id}`,
          type: 'ASSIGNMENT_DUE',
          classroomId: a.classroomId,
          classroomName: a.classroomName,
          date: a.dueDate,
          title: a.title,
          assignmentId: a.id,
        }));

        // Load announcements per classroom in parallel
        const announcementsPerClass: { classroom: Classroom; announcements: Announcement[] }[] =
          await Promise.all(
            classrooms.map(async (cls) => ({
              classroom: cls,
              announcements: await classroomApi.getAnnouncements(cls.id),
            }))
          );

        const announcementEvents: AnnouncementEvent[] = announcementsPerClass.flatMap(
          ({ classroom, announcements }) =>
            announcements.map((ann) => ({
              id: `n-${ann.id}`,
              type: 'ANNOUNCEMENT' as const,
              classroomId: classroom.id,
              classroomName: classroom.name,
              date: ann.createdAt,
              title: ann.title,
              announcementId: ann.id,
            }))
        );

        const allEvents: CalendarEvent[] = [...assignmentEvents, ...announcementEvents].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        setEvents(allEvents);
      } catch (e) {
        console.error('Failed to load calendar data', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const groupedByDate = events.reduce<Record<string, CalendarEvent[]>>((groups, ev) => {
    const key = new Date(ev.date).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(ev);
    return groups;
  }, {});

  const sortedDateKeys = Object.keys(groupedByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Calendar</h1>
        <p className="mt-1 text-sm text-slate-500">
          See assignments and announcements across all your classes, sorted by date.
        </p>
      </div>

      {loading && (
        <div className="py-10 text-center text-sm text-slate-500">
          <Spinner />
        </div>
      )}

      {!loading && events.length === 0 && (
        <p className="text-sm text-slate-500">No assignments or announcements yet.</p>
      )}

      {!loading && events.length > 0 && (
        <div className="space-y-4">
          {sortedDateKeys.map((dateKey) => {
            const dateEvents = groupedByDate[dateKey]!;
            const dateObj = new Date(dateEvents[0]!.date);
            return (
              <Card key={dateKey} className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  {dateObj.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h2>

                <ul className="divide-y divide-slate-100">
                  {dateEvents.map((ev) => {
                    const timeLabel = new Date(ev.date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const isAssignment = ev.type === 'ASSIGNMENT_DUE';

                    return (
                      <li key={ev.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={isAssignment ? 'success' : 'default'}>
                              {isAssignment ? 'Assignment' : 'Announcement'}
                            </Badge>
                            <span className="truncate font-medium text-slate-900">{ev.title}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {ev.classroomName} · {timeLabel}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {isAssignment ? (
                            <Link
                              to={`/assignments/${(ev as AssignmentEvent).assignmentId}`}
                              className="text-xs font-semibold text-[#3f8cff] hover:text-[#2563eb]"
                            >
                              Open assignment
                            </Link>
                          ) : (
                            <Link
                              to={`/class/${ev.classroomId}`}
                              className="text-xs font-semibold text-[#3f8cff] hover:text-[#2563eb]"
                            >
                              View in class
                            </Link>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
