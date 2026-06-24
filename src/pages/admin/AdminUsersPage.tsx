import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { colors } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../types/errors';
import * as usersService from '../../services/usersService';
import type { UserSummaryDto, GetUsersResponseDto } from '../../types/users';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function parseErrorCode(err: unknown): number {
  if (err instanceof Error) {
    const n = parseInt(err.message, 10);
    return isNaN(n) ? 9999 : n;
  }
  return 9999;
}

// ── RoleBadge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'Admin';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        color: '#fff',
        backgroundColor: isAdmin ? colors.accent : colors.textSecondary,
        whiteSpace: 'nowrap',
        marginRight: 4,
      }}
    >
      {role}
    </span>
  );
}

// ── ConfirmDeleteModal ────────────────────────────────────────────────────────

interface ConfirmDeleteModalProps {
  user: UserSummaryDto;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function ConfirmDeleteModal({ user, onConfirm, onCancel, loading }: ConfirmDeleteModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onCancel();
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          backgroundColor: colors.bgMain,
          borderRadius: 12,
          padding: 28,
          maxWidth: 420,
          width: '90%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={20} color={colors.error} />
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            Eliminar usuario
          </h2>
        </div>

        <p style={{ margin: '0 0 8px', fontSize: 14, color: colors.textPrimary }}>
          ¿Estás seguro de que deseas eliminar al usuario{' '}
          <strong style={{ color: colors.error }}>{user.username}</strong>?
        </p>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: colors.textSecondary }}>
          Esta acción eliminará permanentemente su cuenta y todos sus datos asociados. No se puede deshacer.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              color: colors.textPrimary,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              backgroundColor: loading ? '#fca5a5' : colors.error,
              border: 'none',
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {loading ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
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

const inputStyle: CSSProperties = {
  padding: '7px 10px',
  fontSize: 13,
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  color: colors.textPrimary,
  backgroundColor: colors.bgMain,
  outline: 'none',
  height: 34,
  boxSizing: 'border-box',
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

// ── AdminUsersPage ────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user } = useAuth();

  const [usersData, setUsersData] = useState<GetUsersResponseDto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userNameFilter, setUserNameFilter] = useState<string>('');
  const [emailFilter, setEmailFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [fromFilter, setFromFilter] = useState<string>('');
  const [toFilter, setToFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [userToDelete, setUserToDelete] = useState<UserSummaryDto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const PAGE_SIZE = 50;

  useEffect(() => {
    void fetchUsers(1, '', '', '', '', '');
  }, []);

  if (user?.role !== 'Admin') return <Navigate to="/files" replace />;

  async function fetchUsers(
    page: number,
    userName: string,
    email: string,
    roleName: string,
    from: string,
    to: string,
  ): Promise<void> {
    setLoading(true);
    setExpandedId(null);
    try {
      const data = await usersService.getUsers({
        userName: userName || undefined,
        email: email || undefined,
        roleName: roleName || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setUsersData(data);
    } catch (err: unknown) {
      toast.error(getErrorMessage(parseErrorCode(err)));
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(): void {
    setCurrentPage(1);
    void fetchUsers(1, userNameFilter, emailFilter, roleFilter, fromFilter, toFilter);
  }

  function handlePageChange(page: number): void {
    setCurrentPage(page);
    void fetchUsers(page, userNameFilter, emailFilter, roleFilter, fromFilter, toFilter);
  }

  async function handleDeleteConfirm(): Promise<void> {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      await usersService.deleteUser(userToDelete.id);
      toast.success(`Usuario "${userToDelete.username}" eliminado correctamente.`);
      setUserToDelete(null);
      // Recargar la página actual; si quedó vacía, retroceder una
      const newData = await usersService.getUsers({
        userName: userNameFilter || undefined,
        email: emailFilter || undefined,
        roleName: roleFilter || undefined,
        from: fromFilter || undefined,
        to: toFilter || undefined,
        page: currentPage,
        pageSize: PAGE_SIZE,
      });
      if (newData.users.length === 0 && currentPage > 1) {
        const prevPage = currentPage - 1;
        setCurrentPage(prevPage);
        void fetchUsers(prevPage, userNameFilter, emailFilter, roleFilter, fromFilter, toFilter);
      } else {
        setUsersData(newData);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(parseErrorCode(err)));
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      {userToDelete && (
        <ConfirmDeleteModal
          user={userToDelete}
          onConfirm={() => void handleDeleteConfirm()}
          onCancel={() => setUserToDelete(null)}
          loading={deleteLoading}
        />
      )}

      <div style={{ maxWidth: 1200 }}>

        {/* Título + contador */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
            Gestión de usuarios
          </h1>
          {usersData && !loading && (
            <span style={{ fontSize: 13, color: colors.textSecondary }}>
              {usersData.totalCount} {usersData.totalCount === 1 ? 'usuario' : 'usuarios'}
            </span>
          )}
        </div>

        {/* Filtros */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 16,
            padding: 16,
            backgroundColor: colors.bgSidebar,
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="Usuario"
            value={userNameFilter}
            onChange={(e) => setUserNameFilter(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            style={{ ...inputStyle, minWidth: 140 }}
          />
          <input
            type="text"
            placeholder="Email"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            style={{ ...inputStyle, minWidth: 180 }}
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ ...inputStyle, minWidth: 140 }}
          >
            <option value="">Todos los roles</option>
            <option value="Admin">Admin</option>
            <option value="User">User</option>
          </select>
          <input
            type="datetime-local"
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
            style={{ ...inputStyle, minWidth: 180 }}
          />
          <input
            type="datetime-local"
            value={toFilter}
            onChange={(e) => setToFilter(e.target.value)}
            style={{ ...inputStyle, minWidth: 180 }}
          />
          <button onClick={handleSearch} style={btnPrimaryStyle} disabled={loading}>
            <RefreshCw size={14} />
            Buscar
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
                minWidth: 700,
              }}
            >
              <colgroup>
                <col style={{ width: 56 }} />
                <col style={{ width: 160 }} />
                <col />
                <col style={{ width: 140 }} />
                <col style={{ width: 170 }} />
                <col style={{ width: 80 }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={tableThStyle}>ID</th>
                  <th style={tableThStyle}>Usuario</th>
                  <th style={tableThStyle}>Email</th>
                  <th style={tableThStyle}>Roles</th>
                  <th style={tableThStyle}>Creado</th>
                  <th style={{ ...tableThStyle, textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} style={tableTdStyle}>
                          <div className="hdb-skeleton" style={{ height: 14, borderRadius: 3 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !usersData || usersData.users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        ...tableTdStyle,
                        textAlign: 'center',
                        color: colors.textSecondary,
                        padding: 40,
                      }}
                    >
                      No hay usuarios
                    </td>
                  </tr>
                ) : (
                  usersData.users.map((u: UserSummaryDto) => {
                    const isExpanded = expandedId === u.id;
                    const isSelf = user?.userId === u.id;
                    return (
                      <>
                        <tr
                          key={u.id}
                          onClick={() => setExpandedId(isExpanded ? null : u.id)}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isExpanded ? colors.accentSoft : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (!isExpanded)
                              (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                                colors.surface;
                          }}
                          onMouseLeave={(e) => {
                            if (!isExpanded)
                              (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                                'transparent';
                          }}
                        >
                          <td
                            style={{
                              ...tableTdStyle,
                              color: colors.textSecondary,
                              fontFamily: 'monospace',
                            }}
                          >
                            {u.id}
                          </td>
                          <td style={{ ...tableTdStyle, fontWeight: 500 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {u.username}
                              {isSelf && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: colors.accentSoftText,
                                    backgroundColor: colors.accentSoft,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                  }}
                                >
                                  tú
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            style={{ ...tableTdStyle, color: colors.textSecondary }}
                            title={u.email}
                          >
                            {u.email}
                          </td>
                          <td style={tableTdStyle}>
                            {u.roles.map((r) => (
                              <RoleBadge key={r} role={r} />
                            ))}
                          </td>
                          <td
                            style={{
                              ...tableTdStyle,
                              fontSize: 12,
                              fontFamily: 'monospace',
                              color: colors.textSecondary,
                            }}
                          >
                            {formatDateTime(u.createdAt)}
                          </td>
                          <td
                            style={{ ...tableTdStyle, textAlign: 'center' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                              }}
                            >
                              <button
                                title={
                                  isSelf
                                    ? 'No puedes eliminar tu propia cuenta'
                                    : `Eliminar ${u.username}`
                                }
                                disabled={isSelf}
                                onClick={() => setUserToDelete(u)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 30,
                                  height: 30,
                                  borderRadius: 6,
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  cursor: isSelf ? 'not-allowed' : 'pointer',
                                  color: isSelf ? colors.border : colors.error,
                                  opacity: isSelf ? 0.4 : 1,
                                  transition: 'background-color 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelf)
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                                      '#fee2e2';
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                                    'transparent';
                                }}
                              >
                                <Trash2 size={15} />
                              </button>
                              <button
                                title={isExpanded ? 'Contraer' : 'Ver detalle'}
                                onClick={() => setExpandedId(isExpanded ? null : u.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 30,
                                  height: 30,
                                  borderRadius: 6,
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  cursor: 'pointer',
                                  color: colors.textSecondary,
                                  transition: 'background-color 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                                    colors.surface;
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                                    'transparent';
                                }}
                              >
                                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr key={`${u.id}-detail`}>
                            <td
                              colSpan={6}
                              style={{
                                padding: '14px 20px',
                                backgroundColor: colors.accentSoft,
                                borderBottom: `1px solid ${colors.border}`,
                              }}
                            >
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                  gap: '8px 32px',
                                  fontSize: 13,
                                }}
                              >
                                <div>
                                  <span
                                    style={{ fontWeight: 600, color: colors.textSecondary, fontSize: 12 }}
                                  >
                                    ID
                                  </span>
                                  <div style={{ fontFamily: 'monospace', marginTop: 2 }}>{u.id}</div>
                                </div>
                                <div>
                                  <span
                                    style={{ fontWeight: 600, color: colors.textSecondary, fontSize: 12 }}
                                  >
                                    Usuario
                                  </span>
                                  <div style={{ marginTop: 2 }}>{u.username}</div>
                                </div>
                                <div>
                                  <span
                                    style={{ fontWeight: 600, color: colors.textSecondary, fontSize: 12 }}
                                  >
                                    Email
                                  </span>
                                  <div style={{ marginTop: 2, wordBreak: 'break-all' }}>{u.email}</div>
                                </div>
                                <div>
                                  <span
                                    style={{ fontWeight: 600, color: colors.textSecondary, fontSize: 12 }}
                                  >
                                    Roles
                                  </span>
                                  <div style={{ marginTop: 4 }}>
                                    {u.roles.map((r) => (
                                      <RoleBadge key={r} role={r} />
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <span
                                    style={{ fontWeight: 600, color: colors.textSecondary, fontSize: 12 }}
                                  >
                                    Fecha de creación
                                  </span>
                                  <div
                                    style={{
                                      fontFamily: 'monospace',
                                      fontSize: 12,
                                      marginTop: 2,
                                    }}
                                  >
                                    {formatDateTime(u.createdAt)}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        {usersData && usersData.totalCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 16,
              padding: '0 4px',
            }}
          >
            <span style={{ fontSize: 13, color: colors.textSecondary }}>
              {usersData.totalCount} usuarios — Página {currentPage} de {usersData.totalPages}
            </span>
            {usersData.totalPages > 1 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  style={{
                    ...btnPrimaryStyle,
                    backgroundColor: currentPage <= 1 ? colors.surface : colors.accent,
                    color: currentPage <= 1 ? colors.textSecondary : '#fff',
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={16} />
                  Anterior
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= usersData.totalPages}
                  style={{
                    ...btnPrimaryStyle,
                    backgroundColor:
                      currentPage >= usersData.totalPages ? colors.surface : colors.accent,
                    color:
                      currentPage >= usersData.totalPages ? colors.textSecondary : '#fff',
                    cursor: currentPage >= usersData.totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Siguiente
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
