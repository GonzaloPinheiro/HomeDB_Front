import { apiClient, setAccessToken } from '../lib/apiClient';
import { ApiResponse } from '../types/api';
import { ChangePasswordRequest, LoginRequest, RegisterRequest, TokenResponseDto, UserDto } from '../types/auth';

export async function login(credentials: LoginRequest): Promise<TokenResponseDto> {
  const { data } = await apiClient.post<ApiResponse<TokenResponseDto>>(
    '/api/auth/login',
    credentials,
  );
  if (!data.result || !data.data) throw new Error(String(data.errorCode ?? 9999));
  setAccessToken(data.data.accessToken);
  return data.data;
}

export async function register(credentials: RegisterRequest): Promise<UserDto> {
  const { data } = await apiClient.post<ApiResponse<UserDto>>(
    '/api/auth/register',
    credentials,
  );
  if (!data.result || !data.data) throw new Error(String(data.errorCode ?? 9999));
  return data.data;
}

export async function changePassword(request: ChangePasswordRequest): Promise<void> {
  const { data } = await apiClient.put<ApiResponse<unknown>>(
    '/api/auth/changePassword',
    request,
  );
  if (!data.result) throw new Error(String(data.errorCode ?? 9999));
}

export async function logout(): Promise<void> {
  setAccessToken(null);
  await apiClient.post('/api/auth/logout', { refreshToken: '' });
}
