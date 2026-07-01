import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient, setAccessToken } from '../lib/apiClient';
import { type ApiResponse } from '../types/api';
import { type LoginRequest, type TokenResponseDto } from '../types/auth';
import { type UserModulePermissionsDto } from '../types/modulePermissions';
import * as modulePermissionsService from '../services/modulePermissionsService';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface AuthUser {
  userId: number;
  username: string;
  role: 'Admin' | 'User';
}

interface AuthContextValue {
  user: AuthUser | null;
  permissions: UserModulePermissionsDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

// ── Decodificación del JWT sin librería externa ─────────────────────────────

interface JwtPayload {
  userId: string;
  username: string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': string;
  exp: number;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64Payload = token.split('.')[1];
    const base64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function userFromPayload(payload: JwtPayload): AuthUser {
  const rawRole =
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
  const role: 'Admin' | 'User' = rawRole === 'Admin' ? 'Admin' : 'User';
  return {
    userId: parseInt(payload.userId, 10),
    username: payload.username,
    role,
  };
}

// ── Contexto ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<UserModulePermissionsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Aplica el token: guarda el access token, decodifica el usuario y carga sus permisos.
  async function applyToken(token: string): Promise<void> {
    setAccessToken(token);
    const payload = decodeJwt(token);
    if (!payload) return;
    setUser(userFromPayload(payload));
    try {
      const perms = await modulePermissionsService.getMyPermissions();
      setPermissions(perms);
    } catch {
      // Si falla la carga de permisos, el sidebar mostrará todo (el backend sigue aplicando restricciones)
      setPermissions(null);
    }
  }

  // Al montar, intenta restaurar la sesión usando la cookie de refresh token.
  // El navegador la envía automáticamente gracias a withCredentials: true.
  useEffect(() => {
    void (async () => {
      try {
        const { data } = await apiClient.post<ApiResponse<TokenResponseDto>>(
          '/api/auth/refreshToken',
          { refreshToken: '' },
        );
        if (data.result && data.data) {
          await applyToken(data.data.accessToken);
        }
      } catch {
        // Sin sesión previa: el usuario deberá iniciar sesión
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(credentials: LoginRequest): Promise<void> {
    const { data } = await apiClient.post<ApiResponse<TokenResponseDto>>(
      '/api/auth/login',
      credentials,
    );
    if (!data.result || !data.data) {
      throw new Error(String(data.errorCode ?? 9999));
    }
    await applyToken(data.data.accessToken);
  }

  async function logout(): Promise<void> {
    setAccessToken(null);
    try {
      await apiClient.post('/api/auth/logout', { refreshToken: '' });
    } catch {
      // Si falla el logout en el servidor, se limpia igualmente el estado local
    }
    setUser(null);
    setPermissions(null);
  }

  async function refreshToken(): Promise<boolean> {
    try {
      const { data } = await apiClient.post<ApiResponse<TokenResponseDto>>(
        '/api/auth/refreshToken',
        { refreshToken: '' },
      );
      if (!data.result || !data.data) return false;
      await applyToken(data.data.accessToken);
      return true;
    } catch {
      return false;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
