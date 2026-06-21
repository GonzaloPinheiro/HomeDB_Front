import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Database,
  FolderOpen,
  Activity,
  Receipt,
  TrendingUp,
  ScrollText,
  Terminal,
  type LucideIcon,
} from 'lucide-react';
import { colors, layout } from '../../lib/theme';
import { showComingSoon } from '../ui/ComingSoonToast';
import { useStorage } from '../../context/StorageContext';
import { type StorageStatisticsDto } from '../../types/files';

// ── Widget de almacenamiento ──────────────────────────────────────────────────

const STORAGE_LIMIT_MB = 10 * 1024; // 10 GB en MB

function formatStorageSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(mb * 1024).toFixed(0)} KB`;
}

interface StorageWidgetProps {
  stats: StorageStatisticsDto | null;
  isLoading: boolean;
}

function StorageWidget({ stats, isLoading }: StorageWidgetProps) {
  if (isLoading || stats === null) {
    return (
      <div
        style={{
          padding: '12px 14px',
          borderTop: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}
      >
        <div className="hdb-skeleton" style={{ height: 11, width: '55%', borderRadius: 4, marginBottom: 10 }} />
        <div className="hdb-skeleton" style={{ height: 5, borderRadius: 3, marginBottom: 8 }} />
        <div className="hdb-skeleton" style={{ height: 11, width: '70%', borderRadius: 4 }} />
      </div>
    );
  }

  const pct = Math.min((stats.totalSizeMb / STORAGE_LIMIT_MB) * 100, 100);
  const usedText = formatStorageSize(stats.totalSizeMb);

  return (
    <div
      style={{
        padding: '12px 14px',
        borderTop: `1px solid ${colors.border}`,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary, letterSpacing: '0.02em' }}>
          ALMACENAMIENTO
        </span>
        <span style={{ fontSize: 11, color: colors.textSecondary }}>
          {stats.totalFiles} {stats.totalFiles === 1 ? 'archivo' : 'archivos'}
        </span>
      </div>

      {/* Barra de progreso */}
      <div
        style={{
          height: 5,
          backgroundColor: colors.surface,
          borderRadius: 3,
          overflow: 'hidden',
          marginBottom: 6,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: colors.accent,
            borderRadius: 3,
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      <span style={{ fontSize: 11, color: colors.textSecondary }}>
        {usedText} / 10 GB
      </span>
    </div>
  );
}

// ── Tipos de navegación ────────────────────────────────────────────────────────

interface ActiveItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

interface ComingSoonItem {
  label: string;
  icon: LucideIcon;
}

const activeItems: ActiveItem[] = [
  { label: 'Mis archivos', icon: FolderOpen, path: '/files' },
];

const comingSoonItems: ComingSoonItem[] = [
  { label: 'Monitor del sistema', icon: Activity },
  { label: 'Registro de gastos', icon: Receipt },
  { label: 'Inversiones', icon: TrendingUp },
  { label: 'Logs del sistema', icon: ScrollText },
  { label: 'Scripts remotos', icon: Terminal },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { stats, isLoading, refreshStats } = useStorage();

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: layout.sidebarWidth,
        height: '100vh',
        backgroundColor: colors.bgSidebar,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: layout.headerHeight,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 16px',
          borderBottom: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}
      >
        <Database size={20} color={colors.accent} />
        <span style={{ fontWeight: 700, fontSize: 15, color: colors.textPrimary }}>
          HomeDB
        </span>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 8px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {activeItems.map((item) => {
          const active =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 6,
                marginBottom: 2,
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? colors.accent : colors.textPrimary,
                backgroundColor: active ? colors.accentSoft : 'transparent',
              }}
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          );
        })}

        <div
          style={{
            height: 1,
            backgroundColor: colors.border,
            margin: '12px 4px',
          }}
        />

        {comingSoonItems.map((item) => {
          if (user?.role === 'Admin') {
            const adminRoutes: Partial<Record<string, string>> = {
              'Logs del sistema':    '/admin/logs',
              'Monitor del sistema': '/admin/monitor',
            };
            const route = adminRoutes[item.label];
            if (route) {
              const isActive = location.pathname.startsWith(route);
              return (
                <Link
                  key={item.label}
                  to={route}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 6,
                    marginBottom: 2,
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? colors.accent : colors.textPrimary,
                    backgroundColor: isActive ? colors.accentSoft : 'transparent',
                  }}
                >
                  <item.icon size={17} />
                  {item.label}
                </Link>
              );
            }
          }

          return (
            <button
              key={item.label}
              onClick={showComingSoon}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 6,
                marginBottom: 2,
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: 'left',
              }}
            >
              <item.icon size={17} />
              <span style={{ flex: 1 }}>{item.label}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: colors.accentSoftText,
                  backgroundColor: colors.accentSoft,
                  padding: '2px 5px',
                  borderRadius: 4,
                  flexShrink: 0,
                }}
              >
                Próx.
              </span>
            </button>
          );
        })}
      </nav>

      {/* Widget de almacenamiento */}
      <StorageWidget stats={stats} isLoading={isLoading} />
    </aside>
  );
}
