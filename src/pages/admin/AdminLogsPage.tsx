import { Fragment, type CSSProperties, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { colors } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../types/errors';
import * as logsService from '../../services/logsService';
import type {
  GetLogsResponseDto,
  LogEntryDto,
  LogErrorSummaryItemDto,
  LogHealthDto,
  LogSlowOperationDto,
} from '../../types/logs';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatMs(ms: number): string {
  if (ms === 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function parseErrorCode(err: unknown): number {
  if (err instanceof Error) {
    const n = parseInt(err.message, 10);
    return isNaN(n) ? 9999 : n;
  }
  return 9999;
}

function levelColor(level: string): string {
  if (level === 'Error') return colors.error;
  if (level === 'Warning') return colors.warning;
  if (level === 'Critical') return '#b91c1c';
  return colors.accent;
}

// ── LevelBadge ───────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        color: '#fff',
        backgroundColor: levelColor(level),
        whiteSpace: 'nowrap',
      }}
    >
      {level}
    </span>
  );
}

// ── Constantes de estilo (module-level, no se recrean en cada render) ────────

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

// ── AdminLogsPage ─────────────────────────────────────────────────────────────

export default function AdminLogsPage() {
  const { user } = useAuth();

  // ── Estado ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);

  // Salud
  const [health, setHealth] = useState<LogHealthDto | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);

  // Tab 0 – Todos los logs
  const [logsData, setLogsData] = useState<GetLogsResponseDto | null>(null);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [operationFilter, setOperationFilter] = useState<string>('');
  const [fromFilter, setFromFilter] = useState<string>('');
  const [toFilter, setToFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const PAGE_SIZE = 50;

  // Tab 1 – Resumen de errores
  const [errorSummary, setErrorSummary] = useState<LogErrorSummaryItemDto[] | null>(null);
  const [errorSummaryLoading, setErrorSummaryLoading] = useState<boolean>(false);
  const [hoursInput, setHoursInput] = useState<number>(24);

  // Tab 2 – Operaciones lentas
  const [slowOps, setSlowOps] = useState<LogSlowOperationDto[] | null>(null);
  const [slowOpsLoading, setSlowOpsLoading] = useState<boolean>(false);
  const [thresholdInput, setThresholdInput] = useState<number>(2000);

  // ── Carga inicial ─────────────────────────────────────────────────────────────
  useEffect(() => {
    void loadHealth();
    void fetchLogs(1, '', '', '', '');
  }, []);

  // ── Guard de admin (después de todos los hooks) ────────────────────────────────
  if (user?.role !== 'Admin') return <Navigate to="/files" replace />;

  // ── Funciones de carga ────────────────────────────────────────────────────────

  async function loadHealth(): Promise<void> {
    setHealthLoading(true);
    try {
      const data: LogHealthDto = await logsService.getLogsHealth();
      setHealth(data);
    } catch (err: unknown) {
      toast.error(getErrorMessage(parseErrorCode(err)));
    } finally {
      setHealthLoading(false);
    }
  }

  async function fetchLogs(
    page: number,
    level: string,
    operation: string,
    from: string,
    to: string,
  ): Promise<void> {
    setLogsLoading(true);
    setExpandedId(null);
    try {
      const data: GetLogsResponseDto = await logsService.getLogs({
        level: level || undefined,
        operation: operation || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setLogsData(data);
    } catch (err: unknown) {
      toast.error(getErrorMessage(parseErrorCode(err)));
    } finally {
      setLogsLoading(false);
    }
  }

  function handleSearch(): void {
    setCurrentPage(1);
    void fetchLogs(1, levelFilter, operationFilter, fromFilter, toFilter);
  }

  function handlePageChange(page: number): void {
    setCurrentPage(page);
    void fetchLogs(page, levelFilter, operationFilter, fromFilter, toFilter);
  }

  async function fetchErrorSummary(hours: number): Promise<void> {
    setErrorSummaryLoading(true);
    try {
      const data: LogErrorSummaryItemDto[] = await logsService.getErrorSummary(hours);
      setErrorSummary(data);
    } catch (err: unknown) {
      toast.error(getErrorMessage(parseErrorCode(err)));
    } finally {
      setErrorSummaryLoading(false);
    }
  }

  async function fetchSlowOps(threshold: number): Promise<void> {
    setSlowOpsLoading(true);
    try {
      const data: LogSlowOperationDto[] = await logsService.getSlowOperations(threshold);
      setSlowOps(data);
    } catch (err: unknown) {
      toast.error(getErrorMessage(parseErrorCode(err)));
    } finally {
      setSlowOpsLoading(false);
    }
  }

  function handleTabChange(tab: 0 | 1 | 2): void {
    setActiveTab(tab);
    if (tab === 1 && errorSummary === null) void fetchErrorSummary(hoursInput);
    if (tab === 2 && slowOps === null) void fetchSlowOps(thresholdInput);
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1200 }}>

      {/* Título */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
          Logs del sistema
        </h1>
      </div>

      {/* Tarjetas de salud */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            padding: 20,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            backgroundColor: colors.bgMain,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertCircle size={16} color={colors.error} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Errores — última hora
            </span>
          </div>
          {healthLoading ? (
            <div className="hdb-skeleton" style={{ height: 30, width: 56, borderRadius: 4 }} />
          ) : (
            <span
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: health?.errorsLastHour ? colors.error : colors.textPrimary,
              }}
            >
              {health?.errorsLastHour ?? 0}
            </span>
          )}
        </div>

        <div
          style={{
            padding: 20,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            backgroundColor: colors.bgMain,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertCircle size={16} color={colors.error} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Errores — últimas 24 h
            </span>
          </div>
          {healthLoading ? (
            <div className="hdb-skeleton" style={{ height: 30, width: 56, borderRadius: 4 }} />
          ) : (
            <span
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: health?.errorsLast24h ? colors.error : colors.textPrimary,
              }}
            >
              {health?.errorsLast24h ?? 0}
            </span>
          )}
        </div>

        <div
          style={{
            padding: 20,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            backgroundColor: colors.bgMain,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={16} color={colors.warning} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Warnings — últimas 24 h
            </span>
          </div>
          {healthLoading ? (
            <div className="hdb-skeleton" style={{ height: 30, width: 56, borderRadius: 4 }} />
          ) : (
            <span
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: health?.warningsLast24h ? colors.warning : colors.textPrimary,
              }}
            >
              {health?.warningsLast24h ?? 0}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 20,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {(['Todos los logs', 'Resumen de errores', 'Operaciones lentas'] as const).map(
          (label, i) => (
            <button
              key={label}
              onClick={() => handleTabChange(i as 0 | 1 | 2)}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: activeTab === i ? 600 : 400,
                color: activeTab === i ? colors.accent : colors.textSecondary,
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === i ? `2px solid ${colors.accent}` : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {/* ── Tab 0: Todos los logs ─────────────────────────────────────────────── */}
      {activeTab === 0 && (
        <div>
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
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              style={{ ...inputStyle, minWidth: 150 }}
            >
              <option value="">Todos los niveles</option>
              <option value="Information">Information</option>
              <option value="Warning">Warning</option>
              <option value="Critical">Critical</option>
            </select>
            <input
              type="text"
              placeholder="Operación"
              value={operationFilter}
              onChange={(e) => setOperationFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              style={{ ...inputStyle, minWidth: 160 }}
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
            <button onClick={handleSearch} style={btnPrimaryStyle} disabled={logsLoading}>
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
                  minWidth: 820,
                }}
              >
                <colgroup>
                  <col style={{ width: 158 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 200 }} />
                  <col />
                  <col style={{ width: 80 }} />
                  <col style={{ width: 90 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={tableThStyle}>Fecha</th>
                    <th style={tableThStyle}>Nivel</th>
                    <th style={tableThStyle}>Operación</th>
                    <th style={tableThStyle}>Mensaje</th>
                    <th style={tableThStyle}>Usuario</th>
                    <th style={tableThStyle}>Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} style={tableTdStyle}>
                            <div className="hdb-skeleton" style={{ height: 14, borderRadius: 3 }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : !logsData || logsData.items.length === 0 ? (
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
                        No hay registros
                      </td>
                    </tr>
                  ) : (
                    logsData.items.map((log: LogEntryDto) => (
                      <Fragment key={log.id}>
                        <tr
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          style={{
                            cursor: 'pointer',
                            backgroundColor:
                              expandedId === log.id ? colors.accentSoft : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (expandedId !== log.id) {
                              (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                                colors.surface;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (expandedId !== log.id) {
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
                            {formatDateTime(log.timeStamp)}
                          </td>
                          <td style={tableTdStyle}>
                            <LevelBadge level={log.level} />
                          </td>
                          <td
                            style={{ ...tableTdStyle, fontSize: 12 }}
                            title={log.operation}
                          >
                            {log.operation.length > 32
                              ? log.operation.slice(0, 32) + '…'
                              : log.operation}
                          </td>
                          <td style={tableTdStyle} title={log.message}>
                            {log.message.length > 80
                              ? log.message.slice(0, 80) + '…'
                              : log.message}
                          </td>
                          <td style={{ ...tableTdStyle, color: colors.textSecondary }}>
                            {log.userId || '—'}
                          </td>
                          <td style={{ ...tableTdStyle, color: colors.textSecondary }}>
                            {formatMs(log.durationMs)}
                          </td>
                        </tr>

                        {expandedId === log.id && (
                          <tr>
                            <td
                              colSpan={6}
                              style={{
                                padding: 16,
                                backgroundColor: colors.accentSoft,
                                borderBottom: `1px solid ${colors.border}`,
                              }}
                            >
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: '6px 24px',
                                  fontSize: 12,
                                  marginBottom: 12,
                                }}
                              >
                                <div>
                                  <span style={{ fontWeight: 600, color: colors.textSecondary }}>
                                    ID:{' '}
                                  </span>
                                  <span>{log.id}</span>
                                </div>
                                <div>
                                  <span style={{ fontWeight: 600, color: colors.textSecondary }}>
                                    Correlation ID:{' '}
                                  </span>
                                  <span style={{ fontFamily: 'monospace' }}>
                                    {log.correlationId || '—'}
                                  </span>
                                </div>
                                <div>
                                  <span style={{ fontWeight: 600, color: colors.textSecondary }}>
                                    Fuente:{' '}
                                  </span>
                                  <span>{log.source}</span>
                                </div>
                                <div>
                                  <span style={{ fontWeight: 600, color: colors.textSecondary }}>
                                    Usuario ID:{' '}
                                  </span>
                                  <span>{log.userId || '—'}</span>
                                </div>
                              </div>

                              <div style={{ marginBottom: log.exception ? 12 : 0 }}>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: colors.textSecondary,
                                    marginBottom: 4,
                                  }}
                                >
                                  Mensaje completo:
                                </div>
                                <div
                                  style={{
                                    fontSize: 13,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {log.message}
                                </div>
                              </div>

                              {log.exception && (
                                <div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: colors.error,
                                      marginBottom: 4,
                                    }}
                                  >
                                    Excepción:
                                  </div>
                                  <pre
                                    style={{
                                      fontSize: 11,
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word',
                                      margin: 0,
                                      fontFamily: 'monospace',
                                      color: colors.error,
                                    }}
                                  >
                                    {log.exception}
                                  </pre>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
      )}

      {/* ── Tab 1: Resumen de errores ─────────────────────────────────────────── */}
      {activeTab === 1 && (
        <div>
          <div
            style={{
              display: 'flex',
              gap: 10,
              marginBottom: 16,
              padding: 16,
              backgroundColor: colors.bgSidebar,
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 13, color: colors.textSecondary }}>Últimas</span>
            <input
              type="number"
              min={1}
              max={720}
              value={hoursInput}
              onChange={(e) =>
                setHoursInput(Math.max(1, parseInt(e.target.value, 10) || 1))
              }
              style={{ ...inputStyle, width: 80, textAlign: 'center' }}
            />
            <span style={{ fontSize: 13, color: colors.textSecondary }}>horas</span>
            <button
              onClick={() => void fetchErrorSummary(hoursInput)}
              style={btnPrimaryStyle}
              disabled={errorSummaryLoading}
            >
              <RefreshCw size={14} />
              Actualizar
            </button>
          </div>

          <div
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...tableThStyle, width: 56 }}>#</th>
                  <th style={tableThStyle}>Operación</th>
                  <th style={{ ...tableThStyle, width: 120, textAlign: 'right' }}>Errores</th>
                </tr>
              </thead>
              <tbody>
                {errorSummaryLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td style={tableTdStyle}>
                        <div className="hdb-skeleton" style={{ height: 14, borderRadius: 3 }} />
                      </td>
                      <td style={tableTdStyle}>
                        <div className="hdb-skeleton" style={{ height: 14, borderRadius: 3 }} />
                      </td>
                      <td style={tableTdStyle}>
                        <div className="hdb-skeleton" style={{ height: 14, borderRadius: 3 }} />
                      </td>
                    </tr>
                  ))
                ) : !errorSummary || errorSummary.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        ...tableTdStyle,
                        textAlign: 'center',
                        color: colors.textSecondary,
                        padding: 40,
                      }}
                    >
                      No hay errores en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  errorSummary.map((item: LogErrorSummaryItemDto, idx: number) => (
                    <tr key={item.operation}>
                      <td style={{ ...tableTdStyle, color: colors.textSecondary }}>
                        {idx + 1}
                      </td>
                      <td style={tableTdStyle}>{item.operation}</td>
                      <td
                        style={{
                          ...tableTdStyle,
                          textAlign: 'right',
                          fontWeight: 600,
                          color: item.count > 10 ? colors.error : colors.textPrimary,
                        }}
                      >
                        {item.count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab 2: Operaciones lentas ─────────────────────────────────────────── */}
      {activeTab === 2 && (
        <div>
          <div
            style={{
              display: 'flex',
              gap: 10,
              marginBottom: 16,
              padding: 16,
              backgroundColor: colors.bgSidebar,
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 13, color: colors.textSecondary }}>Umbral de</span>
            <input
              type="number"
              min={100}
              max={60000}
              step={100}
              value={thresholdInput}
              onChange={(e) =>
                setThresholdInput(Math.max(100, parseInt(e.target.value, 10) || 1000))
              }
              style={{ ...inputStyle, width: 90, textAlign: 'center' }}
            />
            <span style={{ fontSize: 13, color: colors.textSecondary }}>ms</span>
            <button
              onClick={() => void fetchSlowOps(thresholdInput)}
              style={btnPrimaryStyle}
              disabled={slowOpsLoading}
            >
              <RefreshCw size={14} />
              Actualizar
            </button>
          </div>

          <div
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={tableThStyle}>Operación</th>
                  <th style={{ ...tableThStyle, width: 130 }}>Duración</th>
                  <th style={{ ...tableThStyle, width: 175 }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {slowOpsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td style={tableTdStyle}>
                        <div className="hdb-skeleton" style={{ height: 14, borderRadius: 3 }} />
                      </td>
                      <td style={tableTdStyle}>
                        <div className="hdb-skeleton" style={{ height: 14, borderRadius: 3 }} />
                      </td>
                      <td style={tableTdStyle}>
                        <div className="hdb-skeleton" style={{ height: 14, borderRadius: 3 }} />
                      </td>
                    </tr>
                  ))
                ) : !slowOps || slowOps.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        ...tableTdStyle,
                        textAlign: 'center',
                        color: colors.textSecondary,
                        padding: 40,
                      }}
                    >
                      No hay operaciones lentas con el umbral seleccionado
                    </td>
                  </tr>
                ) : (
                  slowOps.map((op: LogSlowOperationDto, idx: number) => (
                    <tr key={`${op.operation}_${idx}`}>
                      <td style={tableTdStyle}>{op.operation}</td>
                      <td
                        style={{
                          ...tableTdStyle,
                          fontWeight: 600,
                          color:
                            op.durationMs > 5000
                              ? colors.error
                              : op.durationMs > 2000
                                ? colors.warning
                                : colors.textPrimary,
                        }}
                      >
                        {formatMs(op.durationMs)}
                      </td>
                      <td
                        style={{
                          ...tableTdStyle,
                          fontSize: 12,
                          fontFamily: 'monospace',
                          color: colors.textSecondary,
                        }}
                      >
                        {formatDateTime(op.timeStamp)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
