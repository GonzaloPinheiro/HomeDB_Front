import { apiClient } from '../lib/apiClient';
import { type ApiResponse } from '../types/api';
import {
  type GetUsersResponseDto,
  type GetUsersParamsDto,
  type UserSummaryDto,
  type DeleteUserResponseDto,
} from '../types/users';

export async function getUsers(params: GetUsersParamsDto): Promise<GetUsersResponseDto> {
  const res = await apiClient.get<ApiResponse<GetUsersResponseDto>>('/api/admin/users', { params });
  if (!res.data.result || res.data.data === null) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}

export async function getUserById(userId: number): Promise<UserSummaryDto | null> {
  const res = await apiClient.get<ApiResponse<UserSummaryDto | null>>(`/api/admin/users/${userId}`);
  if (!res.data.result) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}

export async function deleteUser(userId: number): Promise<DeleteUserResponseDto> {
  const res = await apiClient.delete<ApiResponse<DeleteUserResponseDto>>(`/api/admin/users/${userId}`);
  if (!res.data.result || res.data.data === null) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}
