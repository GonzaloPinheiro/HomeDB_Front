import { Link, useLocation } from 'react-router-dom';
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
      <nav style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
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

        {comingSoonItems.map((item) => (
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
        ))}
      </nav>
    </aside>
  );
}
