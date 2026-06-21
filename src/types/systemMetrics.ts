export interface SystemMetricsDto {
  timestamp: string;
  cpuUsagePercent: number | null;
  memoryTotalBytes: number | null;
  memoryUsedBytes: number | null;
  memoryUsagePercent: number | null;
  diskTotalBytes: number | null;
  diskUsedBytes: number | null;
  diskUsagePercent: number | null;
  temperatureCelsius: number | null;
}
