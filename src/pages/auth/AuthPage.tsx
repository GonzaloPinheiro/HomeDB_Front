import {
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  useState,
} from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Database, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import * as authService from '../../services/authService';
import { getErrorMessage } from '../../types/errors';
import { colors } from '../../lib/theme';
import EnvSelector from '../../components/ui/EnvSelector';

type Tab = 'login' | 'register' | 'change-password';

export default function AuthPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  const [cpUsername, setCpUsername] = useState('');
  const [cpOldPassword, setCpOldPassword] = useState('');
  const [cpNewPassword, setCpNewPassword] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/files" replace />;

  function switchTab(next: Tab): void {
    setTab(next);
    setError(null);
  }

  function parseErrorCode(err: unknown): number {
    if (err instanceof Error) {
      const n = parseInt(err.message, 10);
      return isNaN(n) ? 9999 : n;
    }
    return 9999;
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ username: loginUsername, password: loginPassword });
      navigate('/files');
    } catch (err) {
      setError(getErrorMessage(parseErrorCode(err)));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (regPassword !== regConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authService.register({ username: regUsername, password: regPassword });
      toast.success('Cuenta creada correctamente. Ahora inicia sesión.');
      switchTab('login');
    } catch (err) {
      setError(getErrorMessage(parseErrorCode(err)));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChangePassword(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (cpNewPassword !== cpConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authService.login({ username: cpUsername, password: cpOldPassword });
      try {
        await authService.changePassword({ oldPassword: cpOldPassword, newPassword: cpNewPassword });
      } finally {
        try { await authService.logout(); } catch { /* ignorar error de logout */ }
      }
      toast.success('Contraseña cambiada correctamente. Ahora inicia sesión.');
      switchTab('login');
    } catch (err) {
      setError(getErrorMessage(parseErrorCode(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bgMain,
        padding: '24px 16px',
      }}
    >
      {/* Logo encima de la card */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Database size={32} color={colors.accent} />
        <p
          style={{
            marginTop: 8,
            fontSize: 22,
            fontWeight: 500,
            color: colors.textPrimary,
          }}
        >
          HomeDB
        </p>
      </div>

      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          backgroundColor: colors.bgSidebar,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: 32,
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            backgroundColor: colors.surface,
            borderRadius: 8,
            padding: 4,
            marginBottom: 28,
          }}
        >
          {(['login', 'register', 'change-password'] as const).map((t) => {
            const labels: Record<Tab, string> = {
              login: 'Iniciar sesión',
              register: 'Registrarse',
              'change-password': 'Cambiar clave',
            };
            return (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                style={{
                  padding: '7px 0',
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: tab === t ? colors.accent : 'transparent',
                  color: tab === t ? '#ffffff' : colors.textSecondary,
                  transition: 'background-color 0.15s, color 0.15s',
                }}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>

        {/* ── Login ── */}
        {tab === 'login' && (
          <form
            onSubmit={(e) => { void handleLogin(e); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <Field label="Usuario">
              <StyledInput
                type="text"
                autoComplete="username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
              />
            </Field>
            <PasswordField
              label="Contraseña"
              autoComplete="current-password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            {error && <ErrorMsg>{error}</ErrorMsg>}
            <SubmitButton loading={submitting} loadingText="Iniciando sesión...">
              Iniciar sesión
            </SubmitButton>
          </form>
        )}

        {/* ── Registro ── */}
        {tab === 'register' && (
          <form
            onSubmit={(e) => { void handleRegister(e); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <Field label="Usuario">
              <StyledInput
                type="text"
                autoComplete="username"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                required
              />
            </Field>
            <PasswordField
              label="Contraseña"
              autoComplete="new-password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
            />
            <PasswordField
              label="Repetir contraseña"
              autoComplete="new-password"
              value={regConfirm}
              onChange={(e) => setRegConfirm(e.target.value)}
            />
            {error && <ErrorMsg>{error}</ErrorMsg>}
            <SubmitButton loading={submitting} loadingText="Registrando...">
              Registrarse
            </SubmitButton>
          </form>
        )}

        {/* ── Cambiar clave ── */}
        {tab === 'change-password' && (
          <form
            onSubmit={(e) => { void handleChangePassword(e); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <Field label="Usuario">
              <StyledInput
                type="text"
                autoComplete="username"
                value={cpUsername}
                onChange={(e) => setCpUsername(e.target.value)}
                required
              />
            </Field>
            <PasswordField
              label="Contraseña actual"
              autoComplete="current-password"
              value={cpOldPassword}
              onChange={(e) => setCpOldPassword(e.target.value)}
            />
            <PasswordField
              label="Nueva contraseña"
              autoComplete="new-password"
              value={cpNewPassword}
              onChange={(e) => setCpNewPassword(e.target.value)}
            />
            <PasswordField
              label="Repetir nueva contraseña"
              autoComplete="new-password"
              value={cpConfirm}
              onChange={(e) => setCpConfirm(e.target.value)}
            />
            {error && <ErrorMsg>{error}</ErrorMsg>}
            <SubmitButton loading={submitting} loadingText="Cambiando contraseña...">
              Cambiar contraseña
            </SubmitButton>
          </form>
        )}
      </div>

      {/* Selector de entorno */}
      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: colors.textSecondary }}>Entorno</span>
        <EnvSelector />
      </div>
    </div>
  );
}

// ── Sub-componentes ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 13,
          color: colors.textSecondary,
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function StyledInput({
  onFocus,
  onBlur,
  style,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={{
        height: 36,
        width: '100%',
        border: `1px solid ${focused ? colors.accent : colors.border}`,
        borderRadius: 8,
        padding: '0 12px',
        fontSize: 14,
        color: colors.textPrimary,
        backgroundColor: colors.bgMain,
        outline: 'none',
        ...(style ?? {}),
      }}
    />
  );
}

interface SubmitButtonProps {
  loading: boolean;
  loadingText: string;
  children: ReactNode;
}

function SubmitButton({ loading, loadingText, children }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        marginTop: 4,
        width: '100%',
        height: 40,
        backgroundColor: colors.accent,
        color: '#ffffff',
        border: 'none',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 500,
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: loading ? 0.8 : 1,
      }}
    >
      {loading ? (
        <>
          <div className="hdb-spinner" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

function ErrorMsg({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: 13, color: colors.error, textAlign: 'center' }}>
      {children}
    </p>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label}>
      <div style={{ position: 'relative' }}>
        <StyledInput
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
          style={{ paddingRight: 36 }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.textSecondary,
            display: 'flex',
            alignItems: 'center',
            padding: 0,
          }}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </Field>
  );
}
