import { useState, useEffect, useCallback, useId } from 'react';
import { Navigate } from 'react-router-dom';
import { Cpu, HardDrive, Thermometer, RefreshCw, Server, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import * as metricsService from '../../services/systemMetricsService';
import { type SystemMetricsDto } from '../../types/systemMetrics';
import { getErrorMessage } from '../../types/errors';
import { colors } from '../../lib/theme';

// ── Constantes ────────────────────────────────────────────────────────────────

type Period = '1h' | '6h' | '24h' | '7d';

const PERIODS: Record<Period, { label: string; minutes: number }> = {
  '1h':  { label: '1 h',  minutes: 60 },
  '6h':  { label: '6 h',  minutes: 360 },
  '24h': { label: '24 h', minutes: 1440 },
  '7d':  { label: '7 d',  minutes: 10080 },
};

const METRIC_COLORS = {
  cpu:  '#3b82f6',
  mem:  '#8b5cf6',
  disk: '#22c55e',
  temp: '#ef4444',
} as const;

// Dimensiones del viewBox SVG
const VBW = 400;
const VBH = 160;
const PL = 30; // padding izquierdo (etiquetas eje Y)
const PR = 6;
const PT = 6;
const PB = 18; // padding inferior (etiquetas eje X)
const CW = VBW - PL - PR;
const CH = VBH - PT - PB;

// ── Utilidades ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9)  return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6)  return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${bytes} B`;
}

function formatHHMM(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatDDMM(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

function parseErrCode(err: unknown): number {
  if (err instanceof Error) {
    const n = parseInt(err.message, 10);
    return isNaN(n) ? 9999 : n;
  }
  return 9999;
}

function calcStats(values: (number | null)[]): { min: number; max: number; avg: number } | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  return { min, max, avg };
}

// ── Gráfico SVG de área ───────────────────────────────────────────────────────

interface AreaChartProps {
  data: (number | null)[];
  timestamps: string[];
  color: string;
  showDates: boolean;
}

function AreaChart({ data, timestamps, color, showDates }: AreaChartProps) {
  const uid = useId().replace(/:/g, '');
  const gradId = `g${uid}`;
  const clipId = `c${uid}`;
  const chartBottom = PT + CH;
  const n = data.length;

  const pts: { x: number; y: number }[] = [];
  data.forEach((v, i) => {
    if (v === null) return;
    const x = n <= 1 ? PL + CW / 2 : PL + (i / (n - 1)) * CW;
    const clamped = Math.max(0, Math.min(v, 100));
    const y = PT + (1 - clamped / 100) * CH;
    pts.push({ x, y });
  });

  const linePath = pts.length >= 2
    ? 'M ' + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')
    : '';

  const areaPath = pts.length >= 2
    ? `M ${pts[0].x.toFixed(1)},${chartBottom} ` +
      `L ${pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')} ` +
      `L ${pts[pts.length - 1].x.toFixed(1)},${chartBottom} Z`
    : '';

  const lastPt = pts[pts.length - 1];
  const gridLevels = [0, 25, 50, 75, 100];

  const fmt = showDates ? formatDDMM : formatHHMM;
  const firstLabel = timestamps[0] ? fmt(timestamps[0]) : '';
  const midLabel   = timestamps[Math.floor(n / 2)] ? fmt(timestamps[Math.floor(n / 2)]) : '';
  const lastLabel  = timestamps[n - 1] && timestamps[n - 1] !== timestamps[0]
    ? fmt(timestamps[n - 1])
    : '';

  return (
    <svg
      viewBox={`0 0 ${VBW} ${VBH}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x={PL} y={PT} width={CW} height={CH} />
        </clipPath>
      </defs>

      {/* Fondo del área de gráfico */}
      <rect x={PL} y={PT} width={CW} height={CH} fill={colors.bgMain} rx="2" />

      {/* Líneas de cuadrícula */}
      {gridLevels.map(level => {
        const y = PT + (1 - level / 100) * CH;
        return (
          <g key={level}>
            <line
              x1={PL} y1={y} x2={PL + CW} y2={y}
              stroke={colors.border}
              strokeWidth={level === 0 ? 0.8 : 0.5}
              strokeDasharray={level === 0 ? undefined : '3,4'}
            />
            <text
              x={PL - 4}
              y={y + 3.5}
              textAnchor="end"
              fontSize="8"
              fill={colors.textSecondary}
              fontFamily="system-ui,sans-serif"
            >
              {level}
            </text>
          </g>
        );
      })}

      {/* Área rellena */}
      {areaPath && (
        <path d={areaPath} fill={`url(#${gradId})`} clipPath={`url(#${clipId})`} />
      )}

      {/* Línea */}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          clipPath={`url(#${clipId})`}
        />
      )}

      {/* Punto en el valor actual */}
      {lastPt && (
        <>
          <circle cx={lastPt.x} cy={lastPt.y} r="3.5" fill={colors.bgMain} />
          <circle cx={lastPt.x} cy={lastPt.y} r="2.2" fill={color} />
        </>
      )}

      {/* Sin datos */}
      {pts.length < 2 && (
        <text
          x={PL + CW / 2}
          y={PT + CH / 2 + 4}
          textAnchor="middle"
          fontSize="11"
          fill={colors.textSecondary}
          fontFamily="system-ui,sans-serif"
        >
          Sin datos en este período
        </text>
      )}

      {/* Etiquetas eje X */}
      {firstLabel && (
        <text x={PL} y={VBH - 2} fontSize="7.5" fill={colors.textSecondary} fontFamily="system-ui,sans-serif">
          {firstLabel}
        </text>
      )}
      {midLabel && n > 4 && (
        <text x={PL + CW / 2} y={VBH - 2} textAnchor="middle" fontSize="7.5" fill={colors.textSecondary} fontFamily="system-ui,sans-serif">
          {midLabel}
        </text>
      )}
      {lastLabel && (
        <text x={PL + CW} y={VBH - 2} textAnchor="end" fontSize="7.5" fill={colors.textSecondary} fontFamily="system-ui,sans-serif">
          {lastLabel}
        </text>
      )}
    </svg>
  );
}

// ── Panel de métrica ──────────────────────────────────────────────────────────

interface MetricPanelProps {
  title: string;
  icon: LucideIcon;
  color: string;
  currentValue: number | null;
  unit: string;
  subtitle?: string;
  stats: { min: number; max: number; avg: number } | null;
  chartData: (number | null)[];
  timestamps: string[];
  showDates: boolean;
}

function MetricPanel({
  title, icon: Icon, color, currentValue, unit,
  subtitle, stats, chartData, timestamps, showDates,
}: MetricPanelProps) {
  const display = currentValue !== null ? `${currentValue.toFixed(1)}${unit}` : '—';

  return (
    <div
      style={{
        backgroundColor: colors.bgSidebar,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Cabecera */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '14px 16px 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon size={14} color={color} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: colors.textSecondary,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </span>
        </div>
        <span style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1 }}>
          {display}
        </span>
      </div>

      {/* Gráfico */}
      <div style={{ padding: '6px 8px 0' }}>
        <AreaChart
          data={chartData}
          timestamps={timestamps}
          color={color}
          showDates={showDates}
        />
      </div>

      {/* Pie */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 4,
          padding: '8px 16px 12px',
          borderTop: `1px solid ${colors.border}`,
          marginTop: 4,
        }}
      >
        {subtitle && (
          <span style={{ fontSize: 11, color: colors.textSecondary }}>{subtitle}</span>
        )}
        {stats ? (
          <span style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 'auto' }}>
            Mín {stats.min.toFixed(0)}{unit}&nbsp;&nbsp;·&nbsp;&nbsp;
            Máx {stats.max.toFixed(0)}{unit}&nbsp;&nbsp;·&nbsp;&nbsp;
            Prom {stats.avg.toFixed(0)}{unit}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 'auto' }}>
            Sin historial
          </span>
        )}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PanelSkeleton() {
  return (
    <div
      style={{
        backgroundColor: colors.bgSidebar,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: '14px 16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="hdb-skeleton" style={{ height: 13, width: 90, borderRadius: 4 }} />
        <div className="hdb-skeleton" style={{ height: 30, width: 80, borderRadius: 4 }} />
      </div>
      <div className="hdb-skeleton" style={{ height: 140, borderRadius: 4 }} />
      <div className="hdb-skeleton" style={{ height: 11, width: '65%', borderRadius: 4 }} />
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function SystemMonitorPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<SystemMetricsDto[]>([]);
  const [period, setPeriod] = useState<Period>('1h');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (silent: boolean) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const to = new Date();
      const from = new Date(to.getTime() - PERIODS[period].minutes * 60_000);
      const data = await metricsService.getHistory(from, to);
      setHistory(data);
      setLastUpdated(new Date());
    } catch (err) {
      toast.error(getErrorMessage(parseErrCode(err)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => { void fetchData(false); }, [fetchData]);

  // Refresco automático cada 5 minutos (coincide con el intervalo de captura del backend)
  useEffect(() => {
    const id = window.setInterval(() => void fetchData(true), 5 * 60_000);
    return () => window.clearInterval(id);
  }, [fetchData]);

  if (user?.role !== 'Admin') return <Navigate to="/files" replace />;

  const timestamps = history.map(h => h.timestamp);
  const last = history.length > 0 ? history[history.length - 1] : null;
  const showDates = period === '7d';

  const cpuData  = history.map(h => h.cpuUsagePercent);
  const memData  = history.map(h => h.memoryUsagePercent);
  const diskData = history.map(h => h.diskUsagePercent);
  const tempData = history.map(h => h.temperatureCelsius);

  const memSubtitle = last?.memoryUsedBytes != null && last?.memoryTotalBytes != null
    ? `${formatBytes(last.memoryUsedBytes)} / ${formatBytes(last.memoryTotalBytes)}`
    : undefined;

  const diskSubtitle = last?.diskUsedBytes != null && last?.diskTotalBytes != null
    ? `${formatBytes(last.diskUsedBytes)} / ${formatBytes(last.diskTotalBytes)}`
    : undefined;

  const lastUpdatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Barra de controles */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 12, color: colors.textSecondary }}>
          {lastUpdatedStr ? `Actualizado: ${lastUpdatedStr}` : ' '}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Selector de período */}
          <div
            style={{
              display: 'flex',
              backgroundColor: colors.surface,
              borderRadius: 6,
              padding: 3,
              gap: 2,
            }}
          >
            {(Object.keys(PERIODS) as Period[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: period === p ? colors.accent : 'transparent',
                  color: period === p ? '#fff' : colors.textSecondary,
                  transition: 'background-color 0.15s',
                }}
              >
                {PERIODS[p].label}
              </button>
            ))}
          </div>

          {/* Botón de actualizar */}
          <button
            type="button"
            onClick={() => void fetchData(true)}
            disabled={refreshing || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 6,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.bgMain,
              color: colors.textPrimary,
              cursor: refreshing || loading ? 'not-allowed' : 'pointer',
              opacity: refreshing || loading ? 0.6 : 1,
            }}
          >
            <RefreshCw
              size={13}
              style={{ animation: refreshing ? 'hdb-spin 1s linear infinite' : 'none' }}
            />
            Actualizar
          </button>
        </div>
      </div>

      {/* Grid 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {loading ? (
          <>
            <PanelSkeleton />
            <PanelSkeleton />
            <PanelSkeleton />
            <PanelSkeleton />
          </>
        ) : (
          <>
            <MetricPanel
              title="CPU"
              icon={Cpu}
              color={METRIC_COLORS.cpu}
              currentValue={last?.cpuUsagePercent ?? null}
              unit="%"
              stats={calcStats(cpuData)}
              chartData={cpuData}
              timestamps={timestamps}
              showDates={showDates}
            />
            <MetricPanel
              title="Memoria"
              icon={Server}
              color={METRIC_COLORS.mem}
              currentValue={last?.memoryUsagePercent ?? null}
              unit="%"
              subtitle={memSubtitle}
              stats={calcStats(memData)}
              chartData={memData}
              timestamps={timestamps}
              showDates={showDates}
            />
            <MetricPanel
              title="Disco"
              icon={HardDrive}
              color={METRIC_COLORS.disk}
              currentValue={last?.diskUsagePercent ?? null}
              unit="%"
              subtitle={diskSubtitle}
              stats={calcStats(diskData)}
              chartData={diskData}
              timestamps={timestamps}
              showDates={showDates}
            />
            <MetricPanel
              title="Temperatura"
              icon={Thermometer}
              color={METRIC_COLORS.temp}
              currentValue={last?.temperatureCelsius ?? null}
              unit="°C"
              stats={calcStats(tempData)}
              chartData={tempData}
              timestamps={timestamps}
              showDates={showDates}
            />
          </>
        )}
      </div>
    </div>
  );
}
