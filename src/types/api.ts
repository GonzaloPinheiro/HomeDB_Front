export interface ApiResponse<T> {
  result: boolean;
  data: T | null;
  errorCode: number | null;
  errorMessage: string | null;
}
