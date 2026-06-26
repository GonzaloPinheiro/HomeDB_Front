import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { RefreshCw, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { colors } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../types/errors';
import * as rolesService from '../../services/rolesService';
import type { RoleResponseDto } from '../../types/roles';

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseErrorCode(err: unknown): number {
  if (err instanceof Error) {
    const n = parseInt(err.message, 10);
    return isNaN(n) ? 9999 : n;
  }
  return 9999;
}

// ── Constantes de estilo ─────────────────────────────────────────────────────

const tableThStyle: CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: colors.textSecondary,
  backgroundColor: colors.surface,
  borderBottom: `1px solid ${colors.border}`,
  whiteSpace: 'nowrap',
};

const tableTdStyle: CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  color: colors.textPrimary,
  borderBottom: `1px solid ${colors.border}`,
  verticalAlign: 'middle',
};

const btnPrimaryStyle: CSSProperties = {
  padding: '7px 14px',
  fontSize: 13,
  fontWeight: 600,
  color: '#fff',
  backgroundColor: colors.accent,
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  height: 34,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  flexShrink: 0,
};

const iconBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 6,
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  flexShrink: 0,
};

// ── RoleRow ───────────────────────────────────────────────────────────────────

interface RoleRowProps {
  role: RoleResponseDto;
  onUpdated: (updated: RoleResponseDto) => void;
}

function RoleRow({ role, onUpdated }: RoleRowProps) {
  const [editing, setEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>(role.roleDescription);
  const [saving, setSaving] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(): void {
    setDraft(role.roleDescription);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancelEdit(): void {
    setEditing(false);
    setDraft(role.roleDescription);
  }

  async function saveEdit(): Promise<void> {
    const trimmed = draft.trim();
    if (trimmed === role.roleDescription) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await rolesService.updateRoleDescription(role.roleId, trimmed);
      onUpdated(updated);
      setEditing(false);
      toast.success(`Descripción de "${role.roleName}" actualizada.`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(parseErrorCode(err)));
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') void saveEdit();
    if (e.key === 'Escape') cancelEdit();
  }

  return (
    <tr
      style={{ backgroundColor: editing ? colors.accentSoft : 'transparent' }}
      onMouseEnter={(e) => {
        if (!editing)
          (e.currentTarget as HTMLTableRowElement).style.backgroundColor = colors.surface;
      }}
      onMouseLeave={(e) => {
        if (!editing)
          (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent';
      }}
    >
      {/* ID */}
      <td style={{ ...tableTdStyle, color: colors.textSecondary, fontFamily: 'monospace' }}>
        {role.roleId}
      </td>

      {/* Nombre */}
      <td style={{ ...tableTdStyle, fontWeight: 500 }}>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            color: '#fff',
            backgroundColor: colors.accent,
          }}
        >
          {role.roleName}
        </span>
      </td>

      {/* Descripción */}
      <td style={tableTdStyle}>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
            style={{
              width: '100%',
              padding: '5px 8px',
              fontSize: 13,
              border: `1px solid ${colors.accent}`,
              borderRadius: 6,
              color: colors.textPrimary,
              backgroundColor: colors.bgMain,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <span style={{ color: colors.textSecondary }}>{role.roleDescription}</span>
        )}
      </td>

      {/* Acciones */}
      <td style={{ ...tableTdStyle, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          {editing ? (
            <>
              <button
                title="Guardar"
                onClick={() => void saveEdit()}
                disabled={saving}
                style={{ ...iconBtnStyle, color: colors.success }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#dcfce7';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                <Check size={15} />
              </button>
              <button
                title="Cancelar"
                onClick={cancelEdit}
                disabled={saving}
                style={{ ...iconBtnStyle, color: colors.error }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fee2e2';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                <X size={15} />
              </button>
            </>
          ) : (
            <button
              title="Editar descripción"
              onClick={startEdit}
              style={{ ...iconBtnStyle, color: colors.textSecondary }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.surface;
                (e.currentTarget as HTMLButtonElement).style.color = colors.textPrimary;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = colors.textSecondary;
              }}
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── AdminRolesPage ────────────────────────────────────────────────────────────

export default function AdminRolesPage() {
  const { user } = useAuth();

  const [roles, setRoles] = useState<RoleResponseDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    void fetchRoles();
  }, []);

  if (user?.role !== 'Admin') return <Navigate to="/files" replace />;

  async function fetchRoles(): Promise<void> {
    setLoading(true);
    try {
      const data = await rolesService.getRoles();
      setRoles([...data].sort((a, b) => a.roleId - b.roleId));
    } catch (err: unknown) {
      toast.error(getErrorMessage(parseErrorCode(err)));
    } finally {
      setLoading(false);
    }
  }

  function handleRoleUpdated(updated: RoleResponseDto): void {
    setRoles((prev) => prev.map((r) => (r.roleId === updated.roleId ? updated : r)));
  }

  return (
    <div style={{ maxWidth: 900 }}>

      {/* Título + contador + acciones */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
            Gestión de roles
          </h1>
          {!loading && (
            <span style={{ fontSize: 13, color: colors.textSecondary }}>
              {roles.length} {roles.length === 1 ? 'rol' : 'roles'}
            </span>
          )}
        </div>

        <button
          onClick={() => void fetchRoles()}
          disabled={loading}
          style={btnPrimaryStyle}
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {/* Tabla */}
      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              minWidth: 500,
            }}
          >
            <colgroup>
              <col style={{ width: 64 }} />
              <col style={{ width: 160 }} />
              <col />
              <col style={{ width: 80 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={tableThStyle}>ID</th>
                <th style={tableThStyle}>Nombre</th>
                <th style={tableThStyle}>Descripción</th>
                <th style={{ ...tableThStyle, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} style={tableTdStyle}>
                        <div className="hdb-skeleton" style={{ height: 14, borderRadius: 3 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : roles.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      ...tableTdStyle,
                      textAlign: 'center',
                      color: colors.textSecondary,
                      padding: 40,
                    }}
                  >
                    No hay roles
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <RoleRow key={role.roleId} role={role} onUpdated={handleRoleUpdated} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
