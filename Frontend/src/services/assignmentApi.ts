import { apiClient } from './apiClient';
import type {
  Assignment,
  Submission,
  StudentAssignment,
  AssignmentStatistics,
  NonSubmittedStudent,
} from '../types/domain';

export const assignmentApi = {
  async createAssignment(
    classroomId: string,
    payload: {
      title: string;
      description: string;
      dueDate: string;
      maxMarks: number;
      attachmentUrl?: string;
    }
  ): Promise<Assignment> {
    const { data } = await apiClient.post<Assignment>(
      `/classrooms/${classroomId}/assignments`,
      payload
    );
    return {
      id: String(data.id),
      classroomId: String(data.classroomId),
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      maxMarks: data.maxMarks,
      attachmentUrl: data.attachmentUrl,
    };
  },
  async getAssignment(id: string): Promise<Assignment> {
    const { data } = await apiClient.get<any>(`/assignments/${id}`);
    return {
      id: String(data.id),
      classroomId: String(data.classroomId),
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      maxMarks: data.maxMarks,
      attachmentUrl: data.attachmentUrl,
    };
  },
  async getSubmissions(assignmentId: string): Promise<Submission[]> {
    const { data } = await apiClient.get<Submission[]>(
      `/assignments/${assignmentId}/submissions`
    );
    return data;
  },
  async getMySubmission(assignmentId: string, studentId: string): Promise<Submission | null> {
    try {
      const { data } = await apiClient.get<Submission>(
        `/assignments/${assignmentId}/submissions/my`,
        {
          params: { studentId },
        }
      );
      return data;
    } catch (e: any) {
      if (e.response?.status === 404) {
        return null;
      }
      throw e;
    }
  },
  async submitAssignment(
    assignmentId: string,
    studentId: string,
    payload: { contentUrl?: string; text?: string }
  ): Promise<Submission> {
    const { data } = await apiClient.post<Submission>(
      `/assignments/${assignmentId}/submissions`,
      payload,
      {
        params: { studentId },
      }
    );
    return data;
  },
  async gradeSubmission(
    assignmentId: string,
    submissionId: string,
    payload: { marks: number; feedback?: string }
  ): Promise<Submission> {
    const { data } = await apiClient.put<Submission>(
      `/assignments/${assignmentId}/submissions/${submissionId}/grade`,
      payload
    );
    return data;
  },
  async updateAssignment(
    classroomId: string,
    assignmentId: string,
    payload: { title?: string; description?: string; dueDate?: string; maxMarks?: number; attachmentUrl?: string }
  ): Promise<Assignment> {
    const { data } = await apiClient.put<Assignment>(
      `/classrooms/${classroomId}/assignments/${assignmentId}`,
      payload
    );
    return data;
  },
  async deleteAssignment(
    classroomId: string,
    assignmentId: string,
    teacherId: string
  ): Promise<void> {
    await apiClient.delete(`/classrooms/${classroomId}/assignments/${assignmentId}` , {
      params: { teacherId },
    });
  },
  async getAssignmentStatistics(
    classroomId: string,
    assignmentId: string
  ): Promise<AssignmentStatistics> {
    const { data } = await apiClient.get<AssignmentStatistics>(
      `/classrooms/${classroomId}/assignments/${assignmentId}/statistics`
    );
    return data;
  },
  async getNonSubmittedStudents(
    classroomId: string,
    assignmentId: string
  ): Promise<NonSubmittedStudent[]> {
    const { data } = await apiClient.get<NonSubmittedStudent[]>(
      `/classrooms/${classroomId}/assignments/${assignmentId}/non-submitted-students`
    );
    return data;
  },
  async getStudentAssignments(userId: string, role?: string): Promise<StudentAssignment[]> {
    const { data } = await apiClient.get<StudentAssignment[]>(
      '/assignments/my',
      {
        params: { userId, role },
      }
    );
    return data;
  },
};
