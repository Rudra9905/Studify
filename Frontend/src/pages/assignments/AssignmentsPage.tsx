import React, { useEffect, useState } from 'react';
import { assignmentApi } from '../../services/assignmentApi';
import type { StudentAssignment } from '../../types/domain';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Tabs } from '../../components/ui/Tabs';
import { Link } from 'react-router-dom';

type FilterType = 'all' | 'pending' | 'submitted' | 'graded';

export const AssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<StudentAssignment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await assignmentApi.getStudentAssignments(user.id, user.role);
        setAssignments(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const filteredAssignments = assignments?.filter((a) => {
    if (filter === 'pending') return !a.isSubmitted && !a.isPastDeadline;
    if (filter === 'submitted') return a.isSubmitted && a.marks == null;
    if (filter === 'graded') return a.marks != null;
    return true;
  });

  const getDeadlineStatus = (assignment: StudentAssignment) => {
    if (assignment.isPastDeadline) return { text: 'Overdue', variant: 'danger' as const };
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDue < 24) return { text: 'Due Soon', variant: 'warning' as const };
    return { text: 'Open', variant: 'success' as const };
  };

  const tabs = [
    { id: 'all', label: 'All', count: assignments?.length ?? 0 },
    {
      id: 'pending',
      label: 'Pending',
      count: assignments?.filter((a) => !a.isSubmitted && !a.isPastDeadline).length ?? 0,
    },
    {
      id: 'submitted',
      label: 'Submitted',
      count: assignments?.filter((a) => a.isSubmitted && a.marks == null).length ?? 0,
    },
    {
      id: 'graded',
      label: 'Graded',
      count: assignments?.filter((a) => a.marks != null).length ?? 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text)]">Assignments</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          All your assignments across classes.
        </p>
      </div>

      <Tabs
        tabs={tabs}
        activeTab={filter}
        onChange={(tabId) => setFilter(tabId as FilterType)}
      />

      {loading && (
        <div className="py-10 text-center text-sm text-[var(--text-secondary)]">
          <Spinner />
        </div>
      )}
      {!loading && (!filteredAssignments || filteredAssignments.length === 0) && (
        <p className="text-sm text-[var(--text-secondary)]">No assignments found.</p>
      )}
      <div className="space-y-3">
        {filteredAssignments?.map((a) => {
          const deadlineStatus = getDeadlineStatus(a);
          return (
            <Card key={a.id} className="flex items-center justify-between text-sm">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[var(--text)]">{a.title}</p>
                  <span className="text-xs text-[var(--text-secondary)]/70">•</span>
                  <p className="text-xs text-[var(--text-secondary)]">{a.classroomName}</p>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Due {new Date(a.dueDate).toLocaleDateString()} at{' '}
                  {new Date(a.dueDate).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · Max {a.maxMarks} marks
                </p>
                {a.isSubmitted && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Submitted on {new Date(a.submittedAt!).toLocaleDateString()}
                    {a.marks != null && (
                      <span className="ml-2 font-medium text-blue-600">
                        Score: {a.marks}/{a.maxMarks}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {a.isSubmitted ? (
                  a.marks != null ? (
                    <Badge variant="success">Graded</Badge>
                  ) : (
                    <Badge variant="default">Submitted</Badge>
                  )
                ) : (
                  <Badge variant={deadlineStatus.variant}>{deadlineStatus.text}</Badge>
                )}
                <Link
                  to={`/assignments/${a.id}`}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  {a.isSubmitted ? 'View' : 'Open'}
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
