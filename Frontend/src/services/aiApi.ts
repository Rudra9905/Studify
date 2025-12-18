import { apiClient } from './apiClient';

export interface PdfSummaryResponse {
  summary: string;
  fileName: string;
}

export const aiApi = {
  async summarizePdf(file: File): Promise<PdfSummaryResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const { data } = await apiClient.post<PdfSummaryResponse>('/ai/pdf-summary', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
};