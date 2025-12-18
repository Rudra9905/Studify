import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { assignmentApi } from '../../services/assignmentApi';
import { classroomApi } from '../../services/classroomApi';
import type { StudentAssignment, Classroom, Announcement } from '../../types/domain';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

type Sender = 'user' | 'assistant';

interface AssistantMessage {
  id: number;
  sender: Sender;
  text: string;
  createdAt: string;
}

const NO_DATA_MESSAGE =
  'I couldnt find that information. Please check with your teacher or try another query.';

interface AssistantContext {
  assignments: StudentAssignment[];
  classrooms: Classroom[];
  announcements: Announcement[];
}

const buildAssistantAnswer = (question: string, ctx: AssistantContext): string => {
  const q = question.toLowerCase();
  const { assignments, classrooms, announcements } = ctx;

  const hasAny = (words: string[]) => words.some((w) => q.includes(w));

  const now = new Date();
  const sameDay = (d: Date, ref: Date) => d.toDateString() === ref.toDateString();

  const isToday = (iso: string) => sameDay(new Date(iso), now);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = startOfToday; // treat "this week" as the next 7 days from today
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

  const normalizedClassrooms = classrooms.map((c) => ({
    ...c,
    _name: c.name.toLowerCase(),
    _code: c.code.toLowerCase(),
  }));

  const findClassMatchesInQuestion = () => {
    const matches = normalizedClassrooms.filter(
      (c) => q.includes(c._name) || q.includes(c._code)
    );
    return matches;
  };

  // ---------- 1) Teacher / subject questions ----------
  if (hasAny(['teacher', 'sir', 'madam', 'professor'])) {
    const matches = findClassMatchesInQuestion();

    if (matches.length === 0) {
      if (classrooms.length === 0) return NO_DATA_MESSAGE;
      return 'Which subject or class are you asking about? For example: "Who is the teacher for Data Science?"';
    }

    if (matches.length === 1) {
      const c = matches[0];
      return `The teacher for ${c.name} is ${c.teacherName}.`;
    }

    const lines = matches.map((c) => `- ${c.name}: ${c.teacherName}`);
    return `I found multiple classes:
${lines.join('\n')}`;
  }

  // Helper to decide if a question is clearly about assignments
  const mentionsAssignments = hasAny(['assignment', 'assignments', 'homework', 'task']);

  // Pre-compute assignment stats
  const total = assignments.length;
  const submitted = assignments.filter((a) => a.isSubmitted).length;
  const graded = assignments.filter((a) => a.marks != null).length;
  const pending = assignments.filter((a) => !a.isSubmitted && !a.isPastDeadline).length;
  const overdue = assignments.filter((a) => !a.isSubmitted && a.isPastDeadline).length;

  const assignmentsDueBetween = (from: Date, to: Date) =>
    assignments.filter((a) => {
      const d = new Date(a.dueDate);
      return d >= from && d <= to;
    });

  const upcomingAssignments = assignments.filter((a) => new Date(a.dueDate) > now);

  // ---------- 2) Pending / overdue / due today / due this week ----------
  if (mentionsAssignments && hasAny(['pending', 'left', 'not submitted', 'overdue', 'due'])) {
    if (!assignments.length) return NO_DATA_MESSAGE;

    if (hasAny(['today', "today's", 'todays'])) {
      const todays = assignments.filter((a) => isToday(a.dueDate));
      if (!todays.length) return NO_DATA_MESSAGE;

      const todaysPending = todays.filter((a) => !a.isSubmitted && !a.isPastDeadline).length;
      const todaysOverdue = todays.filter((a) => !a.isSubmitted && a.isPastDeadline).length;

      const lines = todays.map(
        (a) =>
          `- ${a.title} (${a.classroomName}) · due ${new Date(a.dueDate).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}`
      );

      return `Today you have ${todaysPending} pending and ${todaysOverdue} overdue assignments.\n${lines.join('\n')}`;
    }

    if (hasAny(['this week', 'current week'])) {
      const weekAssignments = assignmentsDueBetween(startOfWeek, endOfWeek);
      if (!weekAssignments.length) return NO_DATA_MESSAGE;

      const lines = weekAssignments.map(
        (a) =>
          `- ${a.title} (${a.classroomName}) · due ${new Date(a.dueDate).toLocaleDateString()}`
      );

      return `You have ${weekAssignments.length} assignments due this week:\n${lines.join('\n')}`;
    }

    // Generic pending/overdue summary
    return `You currently have ${pending} pending assignments and ${overdue} overdue assignments.`;
  }

  // ---------- 3) Graded / marks / scores ----------
  if (mentionsAssignments && hasAny(['graded', 'marks', 'score', 'scored', 'result'])) {
    if (!assignments.length) return NO_DATA_MESSAGE;
    if (!graded) return 'None of your assignments have been graded yet.';

    const gradedAssignments = assignments.filter((a) => a.marks != null);
    const averagePercent = (() => {
      const totalMax = gradedAssignments.reduce((sum, a) => sum + (a.maxMarks || 0), 0);
      const totalMarks = gradedAssignments.reduce((sum, a) => sum + (a.marks || 0), 0);
      if (!totalMax) return null;
      return (totalMarks / totalMax) * 100;
    })();

    let summary = `You have ${graded} graded assignments.`;
    if (averagePercent != null) {
      summary += ` Your average score is ${averagePercent.toFixed(1)}%.`;
    }
    return summary;
  }

  // ---------- 4) Upcoming deadlines / due soon ----------
  if (
    mentionsAssignments &&
    (hasAny(['upcoming', 'deadline', 'deadlines']) || hasAny(['show my upcoming']))
  ) {
    if (!assignments.length) return NO_DATA_MESSAGE;
    if (!upcomingAssignments.length) return 'You have no upcoming assignment deadlines.';

    const sorted = [...upcomingAssignments].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    const top = sorted.slice(0, 5);

    const lines = top.map(
      (a) =>
        `- ${a.title} (${a.classroomName}) · due ${new Date(a.dueDate).toLocaleString()}`
    );

    return `Here are your upcoming deadlines (${upcomingAssignments.length} total):\n${lines.join('\n')}`;
  }

  // ---------- 5) Total / submitted / done ----------
  if (
    mentionsAssignments &&
    (hasAny(['how many', 'count', 'total']) ||
      hasAny(['done', 'completed', 'finished', 'submitted']))
  ) {
    if (!assignments.length) return NO_DATA_MESSAGE;

    const notSubmitted = pending + overdue;
    return `You have ${total} assignments in total: ${submitted} submitted, ${graded} graded, and ${notSubmitted} not submitted yet (${pending} pending, ${overdue} overdue).`;
  }

  // ---------- 6) Subjects / classes list ----------
  if (hasAny(['subject', 'subjects', 'classes', 'class list', 'my subjects'])) {
    if (!classrooms.length) return NO_DATA_MESSAGE;
    const lines = classrooms.map((c) => `- ${c.name} (teacher: ${c.teacherName})`);
    return `You are enrolled in these classes:\n${lines.join('\n')}`;
  }

  // ---------- 7) Todays classroom updates (announcements) ----------
  if (
    hasAny(['today\'s updates', 'todays updates', 'today updates', 'classroom updates']) ||
    (q.includes('today') && hasAny(['update', 'updates', 'announcement', 'announcements']))
  ) {
    if (!announcements.length) return NO_DATA_MESSAGE;

    const todaysAnns = announcements.filter((a) => isToday(a.createdAt));
    if (!todaysAnns.length) return NO_DATA_MESSAGE;

    const lines = todaysAnns.map(
      (a) =>
        `- ${a.title} by ${a.authorName} on ${new Date(a.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}`
    );

    return `Todays classroom updates:\n${lines.join('\n')}`;
  }

  // ---------- 8) Progress summary ----------
  if (hasAny(['progress', 'summary', 'overview', 'performance'])) {
    if (!assignments.length) return NO_DATA_MESSAGE;

    const gradedAssignments = assignments.filter((a) => a.marks != null);
    const averagePercent = (() => {
      const totalMax = gradedAssignments.reduce((sum, a) => sum + (a.maxMarks || 0), 0);
      const totalMarks = gradedAssignments.reduce((sum, a) => sum + (a.marks || 0), 0);
      if (!totalMax) return null;
      return (totalMarks / totalMax) * 100;
    })();

    let lines = [
      `Total assignments: ${total}`,
      `Submitted: ${submitted}`,
      `Graded: ${graded}`,
      `Pending: ${pending}`,
      `Overdue: ${overdue}`,
    ];

    if (averagePercent != null) {
      lines.push(`Average score: ${averagePercent.toFixed(1)}%`);
    }

    return `Here is a summary of your progress:\n- ${lines.join('\n- ')}`;
  }

  // ---------- 9) Fallback: clarifying question ----------
  return 'Im not sure what you mean. You can ask things like "How many assignments are pending?", "Which assignments are due this week?", or "Who is the teacher for Data Science?"';
};

export const AssistantPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      try {
        const [cls, asg] = await Promise.all([
          classroomApi.getClassrooms(
            user.role === 'TEACHER' ? { teacherId: user.id } : { studentId: user.id }
          ),
          assignmentApi.getStudentAssignments(user.id, user.role),
        ]);

        setClassrooms(cls);
        setAssignments(asg);

        // Load announcements for each classroom in parallel
        const annResults = await Promise.all(
          cls.map(async (c) => {
            try {
              return await classroomApi.getAnnouncements(c.id);
            } catch (e) {
              console.error('Failed to load announcements for classroom', c.id, e);
              return [] as Announcement[];
            }
          })
        );
        setAnnouncements(annResults.flat());
      } catch (e) {
        console.error('Failed to load data for assistant', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || !user) return;

    const timestamp = new Date().toISOString();

    const userMessage: AssistantMessage = {
      id: Date.now(),
      sender: 'user',
      text: question,
      createdAt: timestamp,
    };

    const answerText = buildAssistantAnswer(question, {
      assignments,
      classrooms,
      announcements,
    });

    const assistantMessage: AssistantMessage = {
      id: Date.now() + 1,
      sender: 'assistant',
      text: answerText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Chatbot</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ask questions about your assignments and calendar, like "how many assignments are pending" or "how many have I done".
        </p>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
              {messages.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
                  <p className="font-medium text-slate-700">Welcome!</p>
                  <p className="mt-1">
                    You can ask things like:
                  </p>
                  <ul className="mt-1 list-disc pl-5">
                    <li>"how many assignments are pending"</li>
                    <li>"how many assignments i have done"</li>
                    <li>"how many assignments are due today"</li>
                  </ul>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                      m.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-100 p-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the chatbot about your assignments..."
              />
              <Button type="submit" size="md" disabled={loading} className="hover:shadow-md hover:shadow-blue-200 transition-shadow">
                Ask
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
};
