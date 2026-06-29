import { apiClient } from '../lib/apiClient';
import { type ApiResponse } from '../types/api';
import { type RoleResponseDto } from '../types/roles';

export async function getRoles(): Promise<RoleResponseDto[]> {
  const res = await apiClient.get<ApiResponse<RoleResponseDto[]>>('/api/admin/roles');
  if (!res.data.result || res.data.data === null) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}

export async function getRoleById(roleId: number): Promise<RoleResponseDto> {
  const res = await apiClient.get<ApiResponse<RoleResponseDto>>(`/api/admin/roles/${roleId}`);
  if (!res.data.result || res.data.data === null) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}

export async function updateRoleDescription(roleId: number, newDescription: string): Promise<RoleResponseDto> {
  const res = await apiClient.patch<ApiResponse<RoleResponseDto>>(
    `/api/admin/roles/${roleId}/description`,
    null,
    { params: { newDescription } },
  );
  if (!res.data.result || res.data.data === null) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}
