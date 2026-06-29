import { apiClient } from '../lib/apiClient';
import { type ApiResponse } from '../types/api';
import {
  type GetAuditLogsResponseDto,
  type GetAuditLogsParamsDto,
} from '../types/auditLogs';

export async function getAuditLogs(params: GetAuditLogsParamsDto): Promise<GetAuditLogsResponseDto> {
  const res = await apiClient.get<ApiResponse<GetAuditLogsResponseDto>>('/api/admin/audit-logs', { params });
  if (!res.data.result || res.data.data === null) throw new Error(String(res.data.errorCode ?? 9999));
  return res.data.data;
}
