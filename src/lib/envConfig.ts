export const ENVIRONMENTS = {
  local: {
    label: 'Local',
    url: import.meta.env.VITE_API_URL as string,
  },
  raspberry: {
    label: 'Raspberry',
    url: 'http://192.168.0.17:8080',
  },
} as const;

export type EnvKey = keyof typeof ENVIRONMENTS;

const STORAGE_KEY = 'selectedEnv';

export function getActiveEnv(): EnvKey {
  const stored = localStorage.getItem(STORAGE_KEY) as EnvKey | null;
  return stored && stored in ENVIRONMENTS ? stored : 'local';
}

export function setActiveEnv(key: EnvKey): void {
  localStorage.setItem(STORAGE_KEY, key);
}

export function getActiveUrl(): string {
  return ENVIRONMENTS[getActiveEnv()].url;
}
