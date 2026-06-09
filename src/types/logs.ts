export interface LogEntryDto {
  id: number;
  timeStamp: string;
  level: string;
  source: string;
  operation: string;
  message: string;
  exception: string | null;
  userId: string;
  correlationId: string;
  durationMs: number;
}

export interface GetLogsResponseDto {
  items: LogEntryDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LogHealthDto {
  errorsLastHour: number;
  errorsLast24h: number;
  warningsLast24h: number;
}

export interface LogErrorSummaryItemDto {
  operation: string;
  count: number;
}

export interface LogSlowOperationDto {
  operation: string;
  durationMs: number;
  timeStamp: string;
}

export interface GetLogsParamsDto {
  level?: string;
  operation?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
