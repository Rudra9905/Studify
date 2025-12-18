import { apiClient } from './apiClient';

export const fileApi = {
  async upload(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post<{ url: string }>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data.url;
  },
};
