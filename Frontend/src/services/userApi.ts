import { apiClient } from './apiClient';
import type { User } from '../context/AuthContext';

const mapUser = (u: any): User => ({
  id: String(u.id),
  name: u.name,
  email: u.email,
  role: u.role,
  phoneNumber: u.phoneNumber,
  dateOfBirth: u.dateOfBirth,
  profileImageUrl: u.profileImageUrl,
});

export interface UpdateProfilePayload {
  name?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  profileImageUrl?: string;
}

export const userApi = {
  async getById(id: string | number): Promise<User> {
    const { data } = await apiClient.get<User>(`/users/${id}`);
    return mapUser(data);
  },

  async updateProfile(id: string | number, payload: UpdateProfilePayload): Promise<User> {
    const { data } = await apiClient.put<User>(`/users/${id}`, payload);
    return mapUser(data);
  },
};

