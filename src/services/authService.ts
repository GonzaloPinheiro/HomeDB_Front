import { apiClient } from '../lib/apiClient';
import { ApiResponse } from '../types/api';
import { LoginRequest, RegisterRequest, TokenResponseDto, UserDto } from '../types/auth';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export async function login(credentials: LoginRequest): Promise<TokenResponseDto> {
  const { data } = await apiClient.post<ApiResponse<TokenResponseDto>>(
    '/api/auth/login',
    credentials,
  );
  if (!data.result || !data.data) throw new Error(String(data.errorCode ?? 9999));
  localStorage.setItem(ACCESS_TOKEN_KEY, data.data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.data.refreshToken);
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
