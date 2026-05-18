import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '../lib/apiClient';
import { ApiResponse } from '../types/api';
import { LoginRequest, TokenResponseDto } from '../types/auth';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// ── Tipos ───────────────────────────────────────────────────────────────────

interface AuthUser {
  userId: number;
  username: string;
  role: 'Admin' | 'User';
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  updateUserState: () => void;
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
    // base64url → base64 estándar
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

function isTokenExpired(payload: JwtPayload): boolean {
  return Date.now() / 1000 >= payload.exp;
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
  const [isLoading, setIsLoading] = useState(true);

  // Al montar, intenta restaurar la sesión desde localStorage
  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      const payload = decodeJwt(token);
      if (payload && !isTokenExpired(payload)) {
        setUser(userFromPayload(payload));
      } else {
        // Token expirado: limpia para forzar re-login
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  async function login(credentials: LoginRequest): Promise<void> {
    const { data } = await apiClient.post<ApiResponse<TokenResponseDto>>(
      '/api/auth/login',
      credentials,
    );

    if (!data.result || !data.data) {
      throw new Error(String(data.errorCode ?? 9999));
    }

    const { accessToken, refreshToken } = data.data;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

    const payload = decodeJwt(accessToken);
    if (payload) setUser(userFromPayload(payload));
  }

  async function logout(): Promise<void> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await apiClient.post('/api/auth/logout', { refreshToken });
      } catch {
        // Si falla el logout en el servidor, se limpia igualmente en el cliente
      }
    }
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
  }

  function updateUserState(): void {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;
    const payload = decodeJwt(token);
    if (payload && !isTokenExpired(payload)) {
      setUser(userFromPayload(payload));
    }
  }

  async function refreshToken(): Promise<boolean> {
    const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!storedRefresh) return false;

    try {
      const { data } = await apiClient.post<ApiResponse<TokenResponseDto>>(
        '/api/auth/refreshToken',
        { refreshToken: storedRefresh },
      );

      if (!data.result || !data.data) return false;

      const { accessToken, refreshToken: newRefresh } = data.data;
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);

      const payload = decodeJwt(accessToken);
      if (payload) setUser(userFromPayload(payload));
      return true;
    } catch {
      return false;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout,
        refreshToken,
        updateUserState,
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
