import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assignmentApi } from '../../services/assignmentApi';
import type {
  Assignment,
  Submission,
  AssignmentStatistics,
  NonSubmittedStudent,
} from '../../types/domain';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export const AssignmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isTeacher = user?.role === 'TEACHER';

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [statistics, setStatistics] = useState<AssignmentStatistics | null>(null);
  const [nonSubmittedStudents, setNonSubmittedStudents] = useState<NonSubmittedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [grading, setGrading] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);

  const [contentUrl, setContentUrl] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [gradeMarks, setGradeMarks] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [newDeadline, setNewDeadline] = useState('');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const asg = await assignmentApi.getAssignment(id);
        setAssignment(asg);
        setNewDeadline(
          new Date(asg.dueDate).toISOString().slice(0, 16)
        );

        if (isTeacher) {
          const [subs, stats, nonSub] = await Promise.all([
            assignmentApi.getSubmissions(id),
            assignmentApi.getAssignmentStatistics(asg.classroomId, id),
            assignmentApi.getNonSubmittedStudents(asg.classroomId, id),
          ]);
          setSubmissions(subs);
          setStatistics(stats);
          setNonSubmittedStudents(nonSub);
        } else {
          // For students, get their own submission
          if (user) {
            const mySub = await assignmentApi.getMySubmission(id, user.id);
            setSubmissions(mySub ? [mySub] : []);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isTeacher]);

  const handleUpdateDeadline = async () => {
    if (!id || !assignment) return;
    const parsed = new Date(newDeadline);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      toast.error('Due date must be in the future');
      return;
    }
    try {
      const updated = await assignmentApi.updateAssignment(
        assignment.classroomId,
        id,
        { dueDate: parsed.toISOString() }
      );
      setAssignment(updated);
      setEditingDeadline(false);
      toast.success('Deadline updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update deadline');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !assignment || !user) return;

    // Check if deadline has passed
    if (new Date() > new Date(assignment.dueDate)) {
      toast.error('Cannot submit assignment after the deadline');
      return;
    }

    setSubmitting(true);
    try {
      let finalUrl = contentUrl;
      if (submissionFile) {
        // upload and get URL
        // Lazy-import to avoid circulars at top level
        const { fileApi } = await import('../../services/fileApi');
        finalUrl = await fileApi.upload(submissionFile);
      }

      if (!finalUrl || finalUrl.trim() === '') {
        toast.error('Please provide a submission link or upload a file');
        setSubmitting(false);
        return;
      }

      const created = await assignmentApi.submitAssignment(id, user.id, {
        contentUrl: finalUrl,
      });
      // Reload the submission to get updated data
      if (!isTeacher && user) {
        const mySub = await assignmentApi.getMySubmission(id, user.id);
        setSubmissions(mySub ? [mySub] : []);
      } else {
        setSubmissions((prev) => (prev ? [...prev, created] : [created]));
      }
      setContentUrl('');
      setSubmissionFile(null);
      toast.success('Submission uploaded');
      // Refresh assignments page and dashboard
      if (window.location.pathname === '/assignments') {
        window.dispatchEvent(new Event('focus'));
      }
      if (window.location.pathname === '/dashboard') {
        window.dispatchEvent(new Event('focus'));
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenGrade = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradeMarks(submission.marks?.toString() ?? '');
    setGradeFeedback(submission.feedback ?? '');
  };

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedSubmission) return;
    setGrading(true);
    try {
      const updated = await assignmentApi.gradeSubmission(id, selectedSubmission.id, {
        marks: Number(gradeMarks),
        feedback: gradeFeedback,
      });
      setSubmissions((prev) =>
        prev?.map((s) => (s.id === updated.id ? updated : s)) ?? [updated]
      );
      toast.success('Submission graded');
      setSelectedSubmission(null);
      setGradeMarks('');
      setGradeFeedback('');
    } catch (e) {
      console.error(e);
      toast.error('Failed to grade submission');
    } finally {
      setGrading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        <Spinner />
      </div>
    );
  }

  if (!assignment) {
    return <p className="text-sm text-slate-500">Assignment not found.</p>;
  }

  const isPastDeadline = assignment && new Date() > new Date(assignment.dueDate);
  const mySubmission = submissions?.find((s) => s.studentName === user?.name);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs text-[var(--text-secondary)]">
          <Link to="/classes" className="text-[var(--primary)] hover:opacity-90">
            Back to classes
          </Link>
        </p>
        <h1 className="text-xl font-semibold text-[var(--text)]">{assignment.title}</h1>
        <p className="text-sm text-[var(--text-secondary)]">{assignment.description}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-[var(--text-secondary)]">
            Due {new Date(assignment.dueDate).toLocaleString()} · Max {assignment.maxMarks} marks
          </p>
          {assignment.attachmentUrl && (
            <a
              href={assignment.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-[var(--primary)] hover:opacity-90"
            >
              Open material
            </a>
          )}
          {isTeacher && (
            <button
              onClick={() => setEditingDeadline(!editingDeadline)}
              className="text-xs font-medium text-[var(--primary)] hover:opacity-90"
            >
              Edit deadline
            </button>
          )}
        </div>
        {editingDeadline && (
            <div className="mt-2 flex items-center gap-2">
            <input
              type="datetime-local"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
            />
            <Button size="sm" onClick={handleUpdateDeadline}>
              Save
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditingDeadline(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {!isTeacher && (
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text)]">Your submission</h2>
          {mySubmission ? (
            <div className="space-y-2">
              <Badge variant="success">Submitted</Badge>
              {mySubmission.contentUrl && (
                <div>
                  <a
                    href={mySubmission.contentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs font-medium text-primary-600 hover:text-primary-700"
                  >
                    View submitted file
                  </a>
                </div>
              )}
              <p className="text-xs text-[var(--text-secondary)]">
                Submitted on {new Date(mySubmission.submittedAt).toLocaleString()}
              </p>
              {mySubmission.marks != null && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-slate-900">
                    Grade: {mySubmission.marks}/{assignment.maxMarks}
                  </p>
                  {mySubmission.feedback && (
                    <p className="mt-1 text-xs text-slate-600">
                      Feedback: {mySubmission.feedback}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : isPastDeadline ? (
            <div className="rounded-lg bg-red-50/80 p-3">
              <p className="text-sm font-medium text-red-800">Deadline has passed</p>
              <p className="mt-1 text-xs text-red-600">
                You can no longer submit this assignment.
              </p>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmit}>
              <Input
                label="Submission link (optional)"
                placeholder="Paste a URL, or upload a file below"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
              />
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[var(--text)]">
                  Upload file (any type)
                </label>
                <input
                  type="file"
                  className="block w-full text-xs text-[var(--text-secondary)] file:mr-3 file:rounded-md file:border file:border-[var(--border-subtle)] file:bg-[var(--light)] file:px-3 file:py-1 file:text-xs file:font-medium file:text-[var(--text)] hover:file:bg-[color-mix(in_oklab,var(--light)_80%,var(--background)_20%)]"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setSubmissionFile(file);
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit assignment'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {isTeacher && statistics && (
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text)]">Statistics</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg bg-[color-mix(in_oklab,var(--background)_90%,var(--light)_10%)] p-3">
              <p className="text-xs text-[var(--text-secondary)]">Total Students</p>
              <p className="text-lg font-semibold text-[var(--text)]">
                {statistics.totalStudents}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-blue-700">Submitted</p>
              <p className="text-lg font-semibold text-blue-900">
                {statistics.submittedCount}
              </p>
            </div>
            <div className="rounded-lg bg-orange-50 p-3">
              <p className="text-xs text-orange-700">Not Submitted</p>
              <p className="text-lg font-semibold text-orange-900">
                {statistics.notSubmittedCount}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-blue-700">Graded</p>
              <p className="text-lg font-semibold text-blue-900">
                {statistics.gradedCount}
              </p>
            </div>
          </div>
        </Card>
      )}

      {isTeacher && nonSubmittedStudents.length > 0 && (
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Students who haven't submitted
          </h2>
          <div className="space-y-2">
            {nonSubmittedStudents.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between rounded-lg bg-[color-mix(in_oklab,var(--background)_90%,var(--light)_10%)] px-3 py-2"
              >
                <div>
                  <p className="text-xs font-medium text-[var(--text)]">{student.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{student.email}</p>
                </div>
                <Badge variant="warning">Not submitted</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {isTeacher && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text)]">Submissions</h2>
            <span className="text-xs text-[var(--text-secondary)]">
              {submissions?.length ?? 0} submissions
            </span>
          </div>
          {(!submissions || submissions.length === 0) && (
            <p className="text-sm text-[var(--text-secondary)]">No submissions yet.</p>
          )}
          {submissions && submissions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Student</th>
                    <th className="px-3 py-2 font-medium">Submitted at</th>
                    <th className="px-3 py-2 font-medium">Marks</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text)]">
                  {submissions.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2">{s.studentName}</td>
                      <td className="px-3 py-2">
                        {new Date(s.submittedAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        {s.contentUrl && (
                          <a
                            href={s.contentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mr-2 text-xs font-medium text-[var(--primary)] hover:opacity-90"
                          >
                            View
                          </a>
                        )}
                        {s.marks != null ? (
                          <Badge variant="success">{s.marks}</Badge>
                        ) : (
                          <span className="text-xs text-[var(--text-secondary)]/80">Not graded</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          className="text-xs font-medium text-[var(--primary)] hover:opacity-90"
                          onClick={() => handleOpenGrade(s)}
                        >
                          Grade
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedSubmission && (
            <div className="mt-4 rounded-xl bg-[color-mix(in_oklab,var(--background)_90%,var(--light)_10%)] p-3 text-xs">
              <p className="mb-2 font-medium text-[var(--text)]">
                Grading {selectedSubmission.studentName}
              </p>
              <form className="flex flex-col gap-2" onSubmit={handleGrade}>
                <Input
                  type="number"
                  label="Marks"
                  value={gradeMarks}
                  onChange={(e) => setGradeMarks(e.target.value)}
                  required
                />
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-[var(--text)]">
                    Feedback
                  </label>
                  <textarea
                    className="block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-3 py-2 text-xs shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] text-[var(--text)]"
                    rows={3}
                    value={gradeFeedback}
                    onChange={(e) => setGradeFeedback(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setSelectedSubmission(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={grading}>
                    {grading ? 'Saving...' : 'Save grade'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
