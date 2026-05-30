import { apiClient } from '../lib/apiClient';
import { type ApiResponse } from '../types/api';
import { type StorageStatisticsDto } from '../types/files';

export async function getStorageStats(): Promise<StorageStatisticsDto> {
  const res = await apiClient.get<ApiResponse<StorageStatisticsDto>>('/api/statistics/storage');
  if (!res.data.result || res.data.data === null) {
    throw new Error(String(res.data.errorCode ?? 9999));
  }
  return res.data.data;
}
