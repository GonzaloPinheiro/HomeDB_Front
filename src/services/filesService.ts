import { apiClient } from '../lib/apiClient';
import { type ApiResponse } from '../types/api';
import { type FileDto, type GetFileItemDto } from '../types/files';

export async function listFiles(folderId?: number): Promise<GetFileItemDto[]> {
  const params: Record<string, number> = {};
  if (folderId !== undefined) params.folderId = folderId;

  const { data } = await apiClient.get<ApiResponse<GetFileItemDto[]>>('/api/files/listFiles', {
    params,
  });
  if (!data.result || !data.data) throw new Error(String(data.errorCode ?? 9999));
  return data.data;
}

export async function uploadFile(
  file: File,
  folderId?: number,
  onProgress?: (percent: number) => void,
): Promise<GetFileItemDto> {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId !== undefined) formData.append('folderId', String(folderId));

  // FileDto incluye ownerId en la respuesta; lo ignoramos al devolver GetFileItemDto
  const { data } = await apiClient.post<ApiResponse<FileDto>>('/api/files/uploadFile', formData, {
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });

  if (!data.result || !data.data) throw new Error(String(data.errorCode ?? 9999));
  // FileDto es estructuralmente un superconjunto de GetFileItemDto
  return data.data;
}

export async function downloadFile(id: number, filename: string): Promise<void> {
  const response = await apiClient.get<Blob>(`/api/files/${id}/downloadFile`, {
    responseType: 'blob',
  });

  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function deleteFile(id: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<unknown>>(`/api/files/${id}/deleteFile`);
  if (!data.result) throw new Error(String(data.errorCode ?? 9999));
}
