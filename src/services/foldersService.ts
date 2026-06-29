import { apiClient } from '../lib/apiClient';
import { type ApiResponse } from '../types/api';
import {
  type CreateFolderResponseDto,
  type DeleteFolderResponseDto,
  type GetFolderResponseDto,
} from '../types/files';

export async function getFolders(parentFolderId?: number): Promise<GetFolderResponseDto[]> {
  const params: Record<string, number> = {};
  if (parentFolderId !== undefined) params.folderId = parentFolderId;

  const { data } = await apiClient.get<ApiResponse<GetFolderResponseDto[]>>('/api/folders', {
    params,
  });
  if (!data.result || !data.data) throw new Error(String(data.errorCode ?? 9999));
  return data.data;
}

export async function createFolder(
  name: string,
  parentFolderId?: number,
): Promise<CreateFolderResponseDto> {
  const { data } = await apiClient.post<ApiResponse<CreateFolderResponseDto>>(
    '/api/folders',
    { name, parentFolderId: parentFolderId ?? null },
  );
  if (!data.result || !data.data) throw new Error(String(data.errorCode ?? 9999));
  return data.data;
}

export async function renameFolder(folderId: number, newName: string): Promise<GetFolderResponseDto> {
  const { data } = await apiClient.patch<ApiResponse<GetFolderResponseDto>>(
    `/api/folders/${folderId}`,
    { newFolderName: newName },
  );
  if (!data.result || !data.data) throw new Error(String(data.errorCode ?? 9999));
  return data.data;
}

export async function moveFolder(folderId: number, newParentFolderId: number | null): Promise<GetFolderResponseDto> {
  const { data } = await apiClient.patch<ApiResponse<GetFolderResponseDto>>(
    `/api/folders/${folderId}`,
    { newParentFolderId },
  );
  if (!data.result || !data.data) throw new Error(String(data.errorCode ?? 9999));
  return data.data;
}

export async function deleteFolder(folderId: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<DeleteFolderResponseDto>>(
    `/api/folders/${folderId}`,
  );
  if (!data.result) throw new Error(String(data.errorCode ?? 9999));
}
