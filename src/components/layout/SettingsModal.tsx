import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';
import { colors } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../types/errors';
import * as userSettingsService from '../../services/userSettingsService';
import type { UpdateProfileDto, UpdateUserSettingsDto } from '../../types/userSettings';

interface SettingsModalProps {
  onClose: () => void;
}

function parseErrorCode(err: unknown): number {
  if (err instanceof Error) {
    const n = parseInt(err.message, 10);
    return isNaN(n) ? 9999 : n;
  }
  return 9999;
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: colors.textSecondary,
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 14,
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  color: colors.textPrimary,
  backgroundColor: colors.bgMain,
  outline: 'none',
  boxSizing: 'border-box',
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: colors.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 12,
};

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { user, refreshToken } = useAuth();
  const overlayRef = useRef<HTMLDivElement>(null);

  // ── Estado del formulario ──────────────────────────────────────────────────
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState('');
  const [timezone, setTimezone] = useState('');

  // Valores originales para detectar cambios
  const [originalUsername] = useState(user?.username ?? '');
  const [originalLanguage, setOriginalLanguage] = useState('');
  const [originalTimezone, setOriginalTimezone] = useState('');

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Carga inicial de settings ──────────────────────────────────────────────
  useEffect(() => {
    userSettingsService
      .getMySettings()
      .then((data) => {
        setLanguage(data.language);
        setTimezone(data.timezone);
        setOriginalLanguage(data.language);
        setOriginalTimezone(data.timezone);
      })
      .catch(() => toast.error('No se pudo cargar la configuración.'))
      .finally(() => setLoadingSettings(false));
  }, []);

  // ── Detección de cambios ───────────────────────────────────────────────────
  const profileChanged = username.trim() !== originalUsername || email.trim() !== '';
  const settingsChanged = language !== originalLanguage || timezone !== originalTimezone;
  const hasChanges = profileChanged || settingsChanged;

  // ── Cerrar al hacer click fuera ────────────────────────────────────────────
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  // ── Guardado ───────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      if (profileChanged) {
        const dto: UpdateProfileDto = {};
        if (username.trim() !== originalUsername) dto.username = username.trim();
        if (email.trim() !== '') dto.email = email.trim();
        await userSettingsService.updateMyProfile(dto);
        // Refresca el token para que el nuevo username se refleje en el avatar
        if (username.trim() !== originalUsername) await refreshToken();
      }
      if (settingsChanged) {
        const dto: UpdateUserSettingsDto = {};
        if (language !== originalLanguage) dto.language = language;
        if (timezone !== originalTimezone) dto.timezone = timezone;
        await userSettingsService.updateMySettings(dto);
      }
      toast.success('Configuración guardada correctamente.');
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(parseErrorCode(err)));
    } finally {
      setSaving(false);
    }
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
          maxWidth: 460,
          width: '90%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
      >
        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: colors.accentSoft,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Settings size={20} color={colors.accent} />
          </div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.textPrimary }}>
            Ajustes
          </h2>
        </div>

        {/* Sección: Perfil */}
        <div style={{ marginBottom: 24 }}>
          <div style={sectionTitleStyle}>Perfil</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nombre de usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={saving}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                placeholder="Ingresá tu nuevo email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Separador */}
        <div style={{ height: 1, backgroundColor: colors.border, marginBottom: 24 }} />

        {/* Sección: Preferencias */}
        <div style={{ marginBottom: 28 }}>
          <div style={sectionTitleStyle}>Preferencias</div>
          {loadingSettings ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[0, 1].map((i) => (
                <div key={i} className="hdb-skeleton" style={{ height: 36, borderRadius: 6 }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Idioma</label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={saving}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Zona horaria</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={saving}
                  style={inputStyle}
                />
              </div>
            </div>
          )}
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              color: colors.textPrimary,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={!hasChanges || saving || loadingSettings}
            style={{
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              backgroundColor: !hasChanges || saving || loadingSettings ? colors.textSecondary : colors.accent,
              border: 'none',
              borderRadius: 6,
              cursor: !hasChanges || saving || loadingSettings ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
