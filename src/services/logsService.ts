import { apiClient } from '../lib/apiClient';
import { type ApiResponse } from '../types/api';
import {
  type GetLogsResponseDto,
  type GetLogsParamsDto,
  type LogHealthDto,
  type LogErrorSummaryItemDto,
  type LogSlowOperationDto,
} from '../types/logs';

export async function getLogs(params: GetLogsParamsDto): Promise<GetLogsResponseDto> {
  const res = await apiClient.get<ApiResponse<GetLogsResponseDto>>('/api/admin/logs', { params });
  if (!res.data.result || res.data.data === null) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}

export async function getLogsHealth(): Promise<LogHealthDto> {
  const res = await apiClient.get<ApiResponse<LogHealthDto>>('/api/admin/logs/health');
  if (!res.data.result || res.data.data === null) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}

export async function getErrorSummary(hours: number): Promise<LogErrorSummaryItemDto[]> {
  const res = await apiClient.get<ApiResponse<LogErrorSummaryItemDto[]>>('/api/admin/logs/errorSummary', {
    params: { hours },
  });
  if (!res.data.result || res.data.data === null) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}

export async function getSlowOperations(thresholdMs: number): Promise<LogSlowOperationDto[]> {
  const res = await apiClient.get<ApiResponse<LogSlowOperationDto[]>>('/api/admin/logs/slow-operations', {
    params: { thresholdMs },
  });
  if (!res.data.result || res.data.data === null) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}
