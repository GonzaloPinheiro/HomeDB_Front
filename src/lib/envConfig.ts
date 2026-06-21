export const ENVIRONMENTS = {
  local: {
    label: 'Local',
    url: import.meta.env.VITE_API_URL as string,
  },
  raspberry: {
    label: 'Raspberry',
    url: 'http://192.168.0.19:8080',
  },
  homedb: {
    label: 'HomeDB',
    url: 'https://homedb.gonzalopinheiro.dev',
  },
} as const;

export type EnvKey = keyof typeof ENVIRONMENTS;

const COOKIE_NAME = 'selectedEnv';
const PRODUCTION_HOST = 'homedb.gonzalopinheiro.dev';

export function isProductionDomain(): boolean {
  return typeof window !== 'undefined' && window.location.hostname === PRODUCTION_HOST;
}

function readEnvCookie(): EnvKey | null {
  const match = document.cookie.match(/(?:^|;\s*)selectedEnv=([^;]*)/);
  const val = match ? decodeURIComponent(match[1]) : null;
  return val && val in ENVIRONMENTS ? (val as EnvKey) : null;
}

export function getActiveEnv(): EnvKey {
  if (isProductionDomain()) return 'homedb';
  return readEnvCookie() ?? 'local';
}

export function setActiveEnv(key: EnvKey): void {
  const maxAge = 30 * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(key)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

export function getActiveUrl(): string {
  return ENVIRONMENTS[getActiveEnv()].url;
}
