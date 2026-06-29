import { apiClient } from '../lib/apiClient';
import { ApiResponse } from '../types/api';
import { SystemMetricsDto } from '../types/systemMetrics';

export async function getHistory(from: Date, to: Date): Promise<SystemMetricsDto[]> {
  const { data } = await apiClient.get<ApiResponse<SystemMetricsDto[]>>(
    '/api/system-metrics/history',
    { params: { from: from.toISOString(), to: to.toISOString() } },
  );
  if (!data.result || !data.data) throw new Error(String(data.errorCode ?? 9999));
  return data.data;
}

export async function getLastMetric(): Promise<SystemMetricsDto> {
  const { data } = await apiClient.get<ApiResponse<SystemMetricsDto>>(
    '/api/system-metrics/last-metric',
  );
  if (!data.result || !data.data) throw new Error(String(data.errorCode ?? 9999));
  return data.data;
}
