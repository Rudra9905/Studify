import { apiClient } from './apiClient';

export interface CreateClassroomMeetingRequest {
  classroomId: number;
  hostUserId: number;
}

export interface CreateNormalMeetingRequest {
  hostUserId: number;
}

export interface JoinMeetingRequest {
  meetingCode: string;
  userId: number;
}

export interface MeetingResponse {
  id: number;
  meetingId: string;
  meetingCode: string;
  title?: string;
  classroomId?: number;
  classroomName?: string;
  host: {
    id: number;
    name: string;
    email: string;
    role: string;
    profileImageUrl?: string;
  };
  active: boolean;
  createdAt: string;
  endedAt?: string;
  signalingToken?: string;
  isClassroomMeeting: boolean;
}

export const meetingApi = {
  /**
   * Create a new classroom meeting
   */
  async createClassroomMeeting(request: CreateClassroomMeetingRequest): Promise<MeetingResponse> {
    const response = await apiClient.post<MeetingResponse>('/meetings/createClassroomMeeting', request);
    return response.data;
  },

  /**
   * Create a new normal meeting
   */
  async createNormalMeeting(request: CreateNormalMeetingRequest): Promise<MeetingResponse> {
    const response = await apiClient.post<MeetingResponse>('/meetings/createNormalMeeting', request);
    return response.data;
  },

  /**
   * Join an existing meeting - validates that meeting exists and user is authorized
   */
  async joinMeeting(request: JoinMeetingRequest): Promise<MeetingResponse> {
    const response = await apiClient.post<MeetingResponse>('/meetings/join', request);
    return response.data;
  },

  /**
   * Get meeting status without joining
   */
  async getMeetingStatus(meetingCode: string): Promise<MeetingResponse> {
    const response = await apiClient.get<MeetingResponse>(`/meetings/status/${meetingCode}`);
    return response.data;
  },

  /**
   * End a meeting (host only)
   */
  async endMeeting(meetingCode: string, userId: number): Promise<void> {
    await apiClient.post('/meetings/end', null, {
      params: { meetingCode, userId }
    });
  },
};
