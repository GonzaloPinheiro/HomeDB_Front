import { apiClient } from '../lib/apiClient';
import { type ApiResponse } from '../types/api';
import { type UserModulePermissionsDto, type UpdateModulePermissionsDto } from '../types/modulePermissions';

export async function getUserPermissions(userId: number): Promise<UserModulePermissionsDto> {
  const res = await apiClient.get<ApiResponse<UserModulePermissionsDto>>(`/api/admin/users/${userId}/permissions`);
  if (!res.data.result || res.data.data === null) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}

export async function updateUserPermissions(userId: number, dto: UpdateModulePermissionsDto): Promise<UserModulePermissionsDto> {
  const res = await apiClient.patch<ApiResponse<UserModulePermissionsDto>>(`/api/admin/users/${userId}/permissions`, dto);
  if (!res.data.result || res.data.data === null) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}
