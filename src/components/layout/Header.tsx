import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { colors, layout } from '../../lib/theme';
import { showComingSoon } from '../ui/ComingSoonToast';

interface HeaderProps {
  pageTitle: string;
}

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

export default function Header({ pageTitle }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate('/auth');
  }

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: layout.sidebarWidth,
        right: 0,
        height: layout.headerHeight,
        backgroundColor: colors.bgMain,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 10,
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>
        {pageTitle}
      </span>

      <div ref={dropdownRef} style={{ position: 'relative' }}>
        {/* Avatar */}
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: colors.accent,
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 13,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            letterSpacing: '0.02em',
          }}
        >
          {user ? getInitials(user.username) : '?'}
        </button>

        {/* Dropdown */}
        {open && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 44,
              width: 188,
              backgroundColor: colors.bgMain,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              zIndex: 30,
            }}
          >
            {user?.role === 'Admin' && (
              <DropdownItem
                label="Panel de admin"
                onClick={() => {
                  setOpen(false);
                  showComingSoon();
                }}
              />
            )}
            <DropdownItem
              label="Ajustes"
              onClick={() => {
                setOpen(false);
                showComingSoon();
              }}
            />
            <div
              style={{ height: 1, backgroundColor: colors.border, margin: '4px 0' }}
            />
            <DropdownItem label="Cerrar sesión" onClick={handleLogout} danger />
          </div>
        )}
      </div>
    </header>
  );
}

interface DropdownItemProps {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

function DropdownItem({ label, onClick, danger = false }: DropdownItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '8px 14px',
        fontSize: 14,
        color: danger ? colors.error : colors.textPrimary,
        backgroundColor: hovered ? colors.surface : 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'block',
        transition: 'background-color 0.1s',
      }}
    >
      {label}
    </button>
  );
}
