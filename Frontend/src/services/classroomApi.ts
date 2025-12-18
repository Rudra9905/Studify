import { apiClient } from './apiClient';
import type { Announcement, Assignment, Classroom, Member, UserRole } from '../types/domain';

type ClassroomResponseDTO = {
  id: number;
  name: string;
  description?: string | null;
  code: string;
  teacher: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
  };
};

type ClassroomMemberResponseDTO = {
  id: number;
  classroomId: number;
  user: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
  };
  roleInClass: string;
  joinedAt: string;
};

type AnnouncementResponseDTO = {
  id: number;
  classroomId: number;
  author: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    profileImageUrl?: string | null;
  };
  title: string;
  content: string;
  attachmentUrl?: string | null;
  createdAt: string;
};

const mapClassroom = (dto: ClassroomResponseDTO): Classroom => ({
  id: String(dto.id),
  name: dto.name,
  description: dto.description ?? undefined,
  code: dto.code,
  teacherName: dto.teacher.name,
});

const mapMember = (dto: ClassroomMemberResponseDTO): Member => ({
  id: String(dto.id),
  name: dto.user.name,
  role: dto.user.role,
  joinedAt: dto.joinedAt,
  profileImageUrl: dto.user.profileImageUrl,
});

const mapAnnouncement = (dto: AnnouncementResponseDTO): Announcement => ({
  id: String(dto.id),
  title: dto.title,
  content: dto.content,
  authorName: dto.author.name,
  authorProfileImageUrl: dto.author.profileImageUrl,
  createdAt: dto.createdAt,
  attachmentUrl: dto.attachmentUrl ?? undefined,
});

export const classroomApi = {
  async getClassrooms(params?: { teacherId?: string; studentId?: string }): Promise<Classroom[]> {
    const { data } = await apiClient.get<ClassroomResponseDTO[]>('/classrooms', {
      params: {
        teacherId: params?.teacherId,
        studentId: params?.studentId,
      },
    });
    return data.map(mapClassroom);
  },
  async createClassroom(
    teacherId: string,
    payload: { name: string; description?: string }
  ): Promise<Classroom> {
    const { data } = await apiClient.post<ClassroomResponseDTO>('/classrooms', payload, {
      params: { teacherId },
    });
    return mapClassroom(data);
  },
  async joinClassroom(userId: string, code: string): Promise<Classroom> {
    const { data } = await apiClient.post<ClassroomResponseDTO>(
      '/classrooms/join',
      { code },
      { params: { userId } }
    );
    return mapClassroom(data);
  },
  async getClassroom(id: string): Promise<Classroom> {
    const { data } = await apiClient.get<ClassroomResponseDTO>(`/classrooms/${id}`);
    return mapClassroom(data);
  },
  async deleteClassroom(id: string, teacherId: string): Promise<void> {
    await apiClient.delete(`/classrooms/${id}`, { params: { teacherId } });
  },
  async leaveClassroom(classroomId: string, userId: string): Promise<void> {
    await apiClient.delete(`/classrooms/${classroomId}/leave`, {
      params: { userId },
    });
  },
  async deleteAnnouncement(classroomId: string, announcementId: string): Promise<void> {
    await apiClient.delete(`/classrooms/${classroomId}/announcements/${announcementId}`);
  },
  async getAnnouncements(classroomId: string): Promise<Announcement[]> {
    const { data } = await apiClient.get<AnnouncementResponseDTO[]>(
      `/classrooms/${classroomId}/announcements`
    );
    return data.map(mapAnnouncement);
  },
  async clearAnnouncementAttachment(
    classroomId: string,
    announcementId: string
  ): Promise<Announcement> {
    const { data } = await apiClient.delete<AnnouncementResponseDTO>(
      `/classrooms/${classroomId}/announcements/${announcementId}/attachment`
    );
    return mapAnnouncement(data);
  },
  async createAnnouncement(
    classroomId: string,
    authorId: string,
    payload: { title: string; content: string; attachmentUrl?: string }
  ): Promise<Announcement> {
    const { data } = await apiClient.post<AnnouncementResponseDTO>(
      `/classrooms/${classroomId}/announcements`,
      payload,
      { params: { authorId } }
    );
    return mapAnnouncement(data);
  },
  async getAssignments(classroomId: string): Promise<Assignment[]> {
    const { data } = await apiClient.get<any[]>(
      `/classrooms/${classroomId}/assignments`
    );
    return data.map((a) => ({
      id: String(a.id),
      classroomId: String(a.classroomId),
      title: a.title,
      description: a.description,
      dueDate: a.dueDate,
      maxMarks: a.maxMarks,
      attachmentUrl: a.attachmentUrl,
    }));
  },
  async createAssignment(
    classroomId: string,
    teacherId: string,
    payload: { title: string; description?: string; dueDate: string; maxMarks: number; attachmentUrl?: string }
  ): Promise<Assignment> {
    console.log('API Call - createAssignment:', {
      url: `/classrooms/${classroomId}/assignments`,
      teacherId,
      payload,
    });
    
    const { data } = await apiClient.post<any>(
      `/classrooms/${classroomId}/assignments`,
      {
        ...payload,
        classroomId: parseInt(classroomId, 10),
      },
      { params: { teacherId } }
    );
    
    console.log('API Response:', data);
    
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
  async getMembers(classroomId: string): Promise<Member[]> {
    const { data } = await apiClient.get<ClassroomMemberResponseDTO[]>(
      `/classrooms/${classroomId}/members`
    );
    return data.map(mapMember);
  },
};
