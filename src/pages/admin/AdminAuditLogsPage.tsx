import { type CSSProperties, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { colors } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../types/errors';
import * as auditLogsService from '../../services/auditLogsService';
import type { AuditLogEntryDto, GetAuditLogsResponseDto } from '../../types/auditLogs';

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
  verticalAlign: 'top',
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

// ── AdminAuditLogsPage ────────────────────────────────────────────────────────

export default function AdminAuditLogsPage() {
  const { user } = useAuth();

  const [logsData, setLogsData] = useState<GetAuditLogsResponseDto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userNameFilter, setUserNameFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('');
  const [fromFilter, setFromFilter] = useState<string>('');
  const [toFilter, setToFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const PAGE_SIZE = 50;

  useEffect(() => {
    void fetchLogs(1, '', '', '', '', '');
  }, []);

  if (user?.role !== 'Admin') return <Navigate to="/files" replace />;

  async function fetchLogs(
    page: number,
    userName: string,
    action: string,
    resourceType: string,
    from: string,
    to: string,
  ): Promise<void> {
    setLoading(true);
    setExpandedId(null);
    try {
      const data: GetAuditLogsResponseDto = await auditLogsService.getAuditLogs({
        userName: userName || undefined,
        action: action || undefined,
        resourceType: resourceType || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setLogsData(data);
    } catch (err: unknown) {
      toast.error(getErrorMessage(parseErrorCode(err)));
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(): void {
    setCurrentPage(1);
    void fetchLogs(1, userNameFilter, actionFilter, resourceTypeFilter, fromFilter, toFilter);
  }

  function handlePageChange(page: number): void {
    setCurrentPage(page);
    void fetchLogs(page, userNameFilter, actionFilter, resourceTypeFilter, fromFilter, toFilter);
  }

  return (
    <div style={{ maxWidth: 1200 }}>

      {/* Título */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
          Audit logs
        </h1>
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
          placeholder="Acción"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          style={{ ...inputStyle, minWidth: 140 }}
        />
        <input
          type="text"
          placeholder="Tipo de recurso"
          value={resourceTypeFilter}
          onChange={(e) => setResourceTypeFilter(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          style={{ ...inputStyle, minWidth: 150 }}
        />
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
              minWidth: 860,
            }}
          >
            <colgroup>
              <col style={{ width: 158 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 130 }} />
              <col />
              <col style={{ width: 70 }} />
              <col style={{ width: 130 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={tableThStyle}>Fecha</th>
                <th style={tableThStyle}>Usuario</th>
                <th style={tableThStyle}>Acción</th>
                <th style={tableThStyle}>Tipo de recurso</th>
                <th style={tableThStyle}>Nombre del recurso</th>
                <th style={tableThStyle}>ID rec.</th>
                <th style={tableThStyle}>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} style={tableTdStyle}>
                        <div className="hdb-skeleton" style={{ height: 14, borderRadius: 3 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !logsData || logsData.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      ...tableTdStyle,
                      textAlign: 'center',
                      color: colors.textSecondary,
                      padding: 40,
                    }}
                  >
                    No hay registros
                  </td>
                </tr>
              ) : (
                logsData.items.map((entry: AuditLogEntryDto) => (
                  <tr
                    key={entry.id}
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor:
                        expandedId === entry.id ? colors.accentSoft : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (expandedId !== entry.id) {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                          colors.surface;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (expandedId !== entry.id) {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                          'transparent';
                      }
                    }}
                  >
                    <td
                      style={{
                        ...tableTdStyle,
                        fontSize: 12,
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDateTime(entry.timeStamp)}
                    </td>
                    <td style={{ ...tableTdStyle, fontWeight: 500 }}>
                      {entry.username}
                    </td>
                    <td style={{ ...tableTdStyle, fontSize: 12 }} title={entry.action}>
                      {entry.action.length > 28
                        ? entry.action.slice(0, 28) + '…'
                        : entry.action}
                    </td>
                    <td style={{ ...tableTdStyle, color: colors.textSecondary }}>
                      {entry.resourceType ?? '—'}
                    </td>
                    <td style={tableTdStyle} title={entry.resourceName ?? ''}>
                      {entry.resourceName
                        ? entry.resourceName.length > 40
                          ? entry.resourceName.slice(0, 40) + '…'
                          : entry.resourceName
                        : '—'}
                    </td>
                    <td style={{ ...tableTdStyle, color: colors.textSecondary }}>
                      {entry.resourceId ?? '—'}
                    </td>
                    <td
                      style={{
                        ...tableTdStyle,
                        fontSize: 12,
                        fontFamily: 'monospace',
                        color: colors.textSecondary,
                      }}
                    >
                      {entry.ipAddress ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {logsData && logsData.totalCount > 0 && (
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
            {logsData.totalCount} registros — Página {currentPage} de {logsData.totalPages}
          </span>
          {logsData.totalPages > 1 && (
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
                disabled={currentPage >= logsData.totalPages}
                style={{
                  ...btnPrimaryStyle,
                  backgroundColor:
                    currentPage >= logsData.totalPages ? colors.surface : colors.accent,
                  color:
                    currentPage >= logsData.totalPages ? colors.textSecondary : '#fff',
                  cursor: currentPage >= logsData.totalPages ? 'not-allowed' : 'pointer',
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
  );
}
