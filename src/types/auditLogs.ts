export interface AuditLogEntryDto {
  id: number;
  timeStamp: string;
  userId: number;
  username: string;
  ipAddress: string | null;
  action: string;
  resourceType: string | null;
  resourceId: number | null;
  resourceName: string | null;
}

export interface GetAuditLogsResponseDto {
  items: AuditLogEntryDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GetAuditLogsParamsDto {
  userId?: number;
  userName?: string;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
