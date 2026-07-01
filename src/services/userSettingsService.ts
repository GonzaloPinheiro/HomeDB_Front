import { apiClient } from '../lib/apiClient';
import { type ApiResponse } from '../types/api';
import {
  type UserSettingsDto,
  type UpdateUserSettingsDto,
  type UpdateProfileDto,
  type UpdateProfileResponseDto,
  type UserProfileOverviewDto,
} from '../types/userSettings';

export async function getMySettings(): Promise<UserSettingsDto> {
  const res = await apiClient.get<ApiResponse<UserSettingsDto>>('/api/users/me/settings');
  if (!res.data.result || res.data.data === null) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}

export async function updateMySettings(dto: UpdateUserSettingsDto): Promise<UserSettingsDto> {
  const res = await apiClient.patch<ApiResponse<UserSettingsDto>>('/api/users/me/settings', dto);
  if (!res.data.result || res.data.data === null) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}

export async function updateMyProfile(dto: UpdateProfileDto): Promise<UpdateProfileResponseDto> {
  const res = await apiClient.patch<ApiResponse<UpdateProfileResponseDto>>('/api/users/me', dto);
  if (!res.data.result || res.data.data === null) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}

export async function getMySettingsOverview(): Promise<UserProfileOverviewDto> {
  const res = await apiClient.get<ApiResponse<UserProfileOverviewDto>>('/api/users/me/settings-overview');
  if (!res.data.result || res.data.data === null) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}
