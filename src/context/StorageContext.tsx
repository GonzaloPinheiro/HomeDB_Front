import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import * as statisticsService from '../services/statisticsService';
import * as userSettingsService from '../services/userSettingsService';
import { type StorageStatisticsDto } from '../types/files';

interface StorageContextValue {
  stats: StorageStatisticsDto | null;
  isLoading: boolean;
  storageLimitBytes: number | null;
  refreshStats: () => void;
}

const StorageContext = createContext<StorageContextValue | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<StorageStatisticsDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [storageLimitBytes, setStorageLimitBytes] = useState<number | null>(null);

  const refreshStats = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      statisticsService.getStorageStats(),
      userSettingsService.getMySettingsOverview(),
    ])
      .then(([stats, overview]) => {
        setStats(stats);
        setStorageLimitBytes(overview.limits.storageLimitBytes);
      })
      .catch(() => {
        /* silencioso — el widget simplemente no actualiza */
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <StorageContext.Provider value={{ stats, isLoading, storageLimitBytes, refreshStats }}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage(): StorageContextValue {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorage debe usarse dentro de StorageProvider');
  return ctx;
}
