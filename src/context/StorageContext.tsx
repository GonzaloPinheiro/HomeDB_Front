import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import * as statisticsService from '../services/statisticsService';
import { type StorageStatisticsDto } from '../types/files';

interface StorageContextValue {
  stats: StorageStatisticsDto | null;
  isLoading: boolean;
  refreshStats: () => void;
}

const StorageContext = createContext<StorageContextValue | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<StorageStatisticsDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshStats = useCallback(() => {
    setIsLoading(true);
    statisticsService
      .getStorageStats()
      .then((data) => setStats(data))
      .catch(() => {
        /* silencioso — el widget simplemente no actualiza */
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <StorageContext.Provider value={{ stats, isLoading, refreshStats }}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage(): StorageContextValue {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorage debe usarse dentro de StorageProvider');
  return ctx;
}
