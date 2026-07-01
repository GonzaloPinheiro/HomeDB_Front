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
  ClipboardList,
  Users,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { colors, layout } from '../../lib/theme';
import { useStorage } from '../../context/StorageContext';
import { type StorageStatisticsDto } from '../../types/files';
import { type UserModulePermissionsDto } from '../../types/modulePermissions';

// ── Widget de almacenamiento ──────────────────────────────────────────────────

const STORAGE_LIMIT_BYTES_DEFAULT = 10 * 1024 * 1024 * 1024; // 10 GB — fallback si la API no responde

function formatStorageSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  const mb = bytes / (1024 * 1024);
  const kb = bytes / 1024;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${kb.toFixed(0)} KB`;
}

interface StorageWidgetProps {
  stats: StorageStatisticsDto | null;
  isLoading: boolean;
  storageLimitBytes: number | null;
}

function StorageWidget({ stats, isLoading, storageLimitBytes }: StorageWidgetProps) {
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

  const limitBytes = storageLimitBytes ?? STORAGE_LIMIT_BYTES_DEFAULT;
  const usedBytes = stats.totalSizeBytes;
  const pct = Math.min((usedBytes / limitBytes) * 100, 100);
  const usedText = formatStorageSize(usedBytes);

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
        {usedText} / {formatStorageSize(limitBytes)}
      </span>
    </div>
  );
}

// ── Items de navegación ────────────────────────────────────────────────────────

interface NavItemDef {
  label: string;
  icon: LucideIcon;
  permissionKey: keyof UserModulePermissionsDto;
  path?: string;       // ruta real disponible para el usuario actual
  adminPath?: string;  // ruta real solo para Admin; si no es admin se muestra como "próximamente"
}

const NAV_ITEMS: NavItemDef[] = [
  { label: 'Mis archivos',         icon: FolderOpen,   permissionKey: 'filesEnabled',          path: '/files' },
  { label: 'Registro de gastos',   icon: Receipt,       permissionKey: 'expensesEnabled' },
  { label: 'Inversiones',          icon: TrendingUp,    permissionKey: 'investmentsEnabled' },
  { label: 'Monitor del sistema',  icon: Activity,      permissionKey: 'systemMonitorEnabled',  adminPath: '/admin/monitor' },
  { label: 'Gestión de usuarios',  icon: Users,         permissionKey: 'userManagementEnabled', adminPath: '/admin/users' },
  { label: 'Gestión de roles',     icon: ShieldCheck,   permissionKey: 'roleManagementEnabled', adminPath: '/admin/roles' },
  { label: 'Logs del sistema',     icon: ScrollText,    permissionKey: 'systemLogsEnabled',     adminPath: '/admin/logs' },
  { label: 'Audit logs',           icon: ClipboardList, permissionKey: 'auditLogsEnabled',      adminPath: '/admin/auditlogs' },
  { label: 'Scripts remotos',      icon: Terminal,      permissionKey: 'remoteScriptsEnabled' },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { stats, isLoading, storageLimitBytes, refreshStats } = useStorage();
  const { permissions } = useAuth();

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
        {(() => {
          // Filtra los items por permisos del usuario.
          // Si permissions es null (cargando o error), se muestran todos.
          const visible = NAV_ITEMS.filter((item) => {
            if (permissions !== null && !permissions[item.permissionKey]) return false;
            // Items solo-admin se ocultan completamente para usuarios no-admin
            if (item.adminPath && !item.path && user?.role !== 'Admin') return false;
            return true;
          });

          const userItems  = visible.filter((i) => !i.adminPath || i.path);
          const adminItems = visible.filter((i) => i.adminPath && !i.path);

          const linkStyle = (active: boolean) => ({
            display: 'flex' as const,
            alignItems: 'center' as const,
            gap: 10,
            padding: '8px 10px',
            borderRadius: 6,
            marginBottom: 2,
            fontSize: 14,
            fontWeight: active ? 600 : 400,
            color: active ? colors.accent : colors.textPrimary,
            backgroundColor: active ? colors.accentSoft : 'transparent',
          });

          return (
            <>
              {userItems.map((item) => {
                const routePath = item.path!;
                const active = location.pathname === routePath || location.pathname.startsWith(routePath + '/');
                return (
                  <Link key={routePath} to={routePath} style={linkStyle(active)}>
                    <item.icon size={17} />
                    {item.label}
                  </Link>
                );
              })}

              {adminItems.length > 0 && (
                <div style={{ height: 1, backgroundColor: colors.border, margin: '12px 4px' }} />
              )}

              {adminItems.map((item) => {
                const routePath = item.adminPath!;
                const active = location.pathname.startsWith(routePath);
                return (
                  <Link key={routePath} to={routePath} style={linkStyle(active)}>
                    <item.icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
            </>
          );
        })()}
      </nav>

      {/* Widget de almacenamiento */}
      <StorageWidget stats={stats} isLoading={isLoading} storageLimitBytes={storageLimitBytes} />
    </aside>
  );
}
