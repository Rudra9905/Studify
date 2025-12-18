import { apiClient } from './apiClient';
import type { User, UserRole } from '../context/AuthContext';

const mapUser = (u: any): User => ({
  id: String(u.id),
  name: u.name,
  email: u.email,
  role: u.role,
  phoneNumber: u.phoneNumber,
  dateOfBirth: u.dateOfBirth,
  profileImageUrl: u.profileImageUrl,
});

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  // Backend currently returns `token: null`, so keep this nullable.
  token: string | null;
  user: User;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phoneNumber?: string;
  dateOfBirth?: string;
  profileImageUrl?: string;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
    return { ...data, user: mapUser(data.user) };
  },
  async register(payload: RegisterPayload): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/register', payload);
    return { ...data, user: mapUser(data.user) };
  },
};
