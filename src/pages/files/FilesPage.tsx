import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Download,
  File as FileIcon,
  FolderOpen,
  FolderPlus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import * as filesService from '../../services/filesService';
import { type FileDto } from '../../types/files';
import { getErrorMessage } from '../../types/errors';
import { colors } from '../../lib/theme';
import { showComingSoon } from '../../components/ui/ComingSoonToast';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

// ── Utilidades ──────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const HH = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${HH}:${min}`;
}

function parseErrorCode(err: unknown): number {
  if (err instanceof Error) {
    const n = parseInt(err.message, 10);
    return isNaN(n) ? 9999 : n;
  }
  return 9999;
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function FilesPage() {
  const [files, setFiles] = useState<FileDto[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FileDto | null>(null);

  useEffect(() => {
    // TODO: Llamar a GET /api/files cuando el endpoint esté implementado en la API.
    // El endpoint de listado de archivos no existe todavía en FilesController.
  }, []);

  // isLoading siempre false por ahora; cambiar a useState(true) cuando exista GET /api/files
  const isLoading = false;

  function handleUploadSuccess(file: FileDto): void {
    setFiles((prev) => [file, ...prev]);
    setUploadOpen(false);
    toast.success('Archivo subido correctamente');
  }

  async function handleDeleteConfirm(): Promise<void> {
    if (!deleteTarget) return;
    try {
      await filesService.deleteFile(deleteTarget.id);
      setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      toast.success(`"${deleteTarget.fileName}" eliminado`);
    } catch (err) {
      toast.error(getErrorMessage(parseErrorCode(err)));
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      {/* Cabecera */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, color: colors.textPrimary }}>
          Mis archivos
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <OutlineButton onClick={showComingSoon} icon={<FolderPlus size={15} />}>
            Nueva carpeta
          </OutlineButton>
          <PrimaryButton onClick={() => setUploadOpen(true)} icon={<Upload size={15} />}>
            Subir archivo
          </PrimaryButton>
        </div>
      </div>

      {/* Contenido */}
      {isLoading && <SkeletonTable />}
      {!isLoading && files.length === 0 && (
        <EmptyState onUpload={() => setUploadOpen(true)} />
      )}
      {!isLoading && files.length > 0 && (
        <FileTable
          files={files}
          onDownload={(f) => { void filesService.downloadFile(f.id, f.fileName); }}
          onDelete={(f) => setDeleteTarget(f)}
        />
      )}

      {/* Modales */}
      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          filename={deleteTarget.fileName}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

// ── Botones de cabecera ─────────────────────────────────────────────────────

interface BtnProps {
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}

function PrimaryButton({ onClick, icon, children }: BtnProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 36,
        padding: '0 14px',
        backgroundColor: colors.accent,
        color: '#ffffff',
        border: 'none',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function OutlineButton({ onClick, icon, children }: BtnProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 36,
        padding: '0 14px',
        backgroundColor: colors.bgSidebar,
        color: colors.textSecondary,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      {icon}
      {children}
    </button>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonTable() {
  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 100px 150px 80px',
          padding: '10px 16px',
          backgroundColor: colors.bgSidebar,
          borderBottom: `1px solid ${colors.border}`,
          gap: 16,
        }}
      >
        {['60%', '50px', '90px', '40px'].map((w, i) => (
          <div key={i} className="hdb-skeleton" style={{ height: 13, width: w }} />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 150px 80px',
            padding: '14px 16px',
            gap: 16,
            borderBottom: i < 2 ? `1px solid ${colors.border}` : 'none',
          }}
        >
          {['75%', '55px', '100px', '52px'].map((w, j) => (
            <div key={j} className="hdb-skeleton" style={{ height: 14, width: w }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Estado vacío ─────────────────────────────────────────────────────────────

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '72px 0' }}>
      <FolderOpen size={56} color={colors.border} />
      <p
        style={{ marginTop: 16, fontSize: 15, color: colors.textSecondary }}
      >
        No hay archivos todavía
      </p>
      <button
        onClick={onUpload}
        style={{
          marginTop: 20,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 36,
          padding: '0 16px',
          backgroundColor: colors.accent,
          color: '#ffffff',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <Upload size={15} />
        Subir archivo
      </button>
    </div>
  );
}

// ── Tabla de archivos ─────────────────────────────────────────────────────────

interface FileTableProps {
  files: FileDto[];
  onDownload: (file: FileDto) => void;
  onDelete: (file: FileDto) => void;
}

function FileTable({ files, onDownload, onDelete }: FileTableProps) {
  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: colors.textSecondary,
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: colors.bgSidebar }}>
          <tr>
            <th style={thStyle}>Nombre</th>
            <th style={{ ...thStyle, width: 100 }}>Tamaño</th>
            <th style={{ ...thStyle, width: 160 }}>Fecha de subida</th>
            <th style={{ ...thStyle, width: 90 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file, i) => (
            <FileRow
              key={file.id}
              file={file}
              isLast={i === files.length - 1}
              onDownload={() => onDownload(file)}
              onDelete={() => onDelete(file)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface FileRowProps {
  file: FileDto;
  isLast: boolean;
  onDownload: () => void;
  onDelete: () => void;
}

function FileRow({ file, isLast, onDownload, onDelete }: FileRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? '#f9f9fb' : colors.bgMain,
        borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
      }}
    >
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileIcon size={15} color={colors.textSecondary} />
          <span style={{ fontSize: 14, color: colors.textPrimary }}>
            {file.fileName}
          </span>
        </div>
      </td>
      <td
        style={{
          padding: '12px 16px',
          fontSize: 14,
          color: colors.textSecondary,
          whiteSpace: 'nowrap',
        }}
      >
        {formatSize(file.sizeBytes)}
      </td>
      <td
        style={{
          padding: '12px 16px',
          fontSize: 14,
          color: colors.textSecondary,
          whiteSpace: 'nowrap',
        }}
      >
        {formatDate(file.uploadedAt)}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          <IconButton
            title="Descargar"
            onClick={onDownload}
            iconColor={colors.accent}
            hoverBg={colors.accentSoft}
          >
            <Download size={16} />
          </IconButton>
          <IconButton
            title="Eliminar"
            onClick={onDelete}
            iconColor={colors.error}
            hoverBg="#fee2e2"
          >
            <Trash2 size={16} />
          </IconButton>
        </div>
      </td>
    </tr>
  );
}

interface IconButtonProps {
  title: string;
  onClick: () => void;
  iconColor: string;
  hoverBg: string;
  children: ReactNode;
}

function IconButton({ title, onClick, iconColor, hoverBg, children }: IconButtonProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 30,
        height: 30,
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        backgroundColor: hovered ? hoverBg : 'transparent',
        color: iconColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.1s',
      }}
    >
      {children}
    </button>
  );
}

// ── Modal base ────────────────────────────────────────────────────────────────

function Overlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 16,
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

interface ModalCardProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

function ModalCard({ title, onClose, children }: ModalCardProps) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 460,
        backgroundColor: colors.bgMain,
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>
          {title}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.textSecondary,
            display: 'flex',
            padding: 4,
          }}
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </div>
  );
}

// ── Modal de subida ───────────────────────────────────────────────────────────

interface UploadModalProps {
  onClose: () => void;
  onSuccess: (file: FileDto) => void;
}

function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File): void {
    if (file.size > MAX_FILE_SIZE) {
      setError(getErrorMessage(1004));
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
    setProgress(0);
  }

  async function handleUpload(): Promise<void> {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const dto = await filesService.uploadFile(selectedFile, undefined, (pct) =>
        setProgress(pct),
      );
      onSuccess(dto);
    } catch (err) {
      setError(getErrorMessage(parseErrorCode(err)));
      setUploading(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="Subir archivo" onClose={onClose}>
        {/* Zona drag & drop */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragOver ? colors.accent : colors.border}`,
            borderRadius: 8,
            padding: '32px 16px',
            textAlign: 'center',
            cursor: uploading ? 'default' : 'pointer',
            backgroundColor: isDragOver ? colors.accentSoft : colors.bgSidebar,
            transition: 'background-color 0.15s, border-color 0.15s',
          }}
        >
          <Upload
            size={32}
            color={isDragOver ? colors.accent : colors.textSecondary}
          />
          {selectedFile ? (
            <div style={{ marginTop: 12 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: colors.textPrimary,
                }}
              >
                {selectedFile.name}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginTop: 4,
                }}
              >
                {formatSize(selectedFile.size)}
              </p>
            </div>
          ) : (
            <p
              style={{
                marginTop: 12,
                fontSize: 14,
                color: colors.textSecondary,
                lineHeight: 1.5,
              }}
            >
              Arrastra un archivo aquí o haz clic para seleccionar
            </p>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />

        {/* Barra de progreso */}
        {uploading && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                height: 6,
                backgroundColor: colors.accentSoft,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  backgroundColor: colors.accent,
                  transition: 'width 0.2s',
                }}
              />
            </div>
            <p
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                marginTop: 4,
                textAlign: 'right',
              }}
            >
              {progress}%
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p style={{ fontSize: 13, color: colors.error, marginTop: 12 }}>
            {error}
          </p>
        )}

        {/* Botones */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 24,
          }}
        >
          <button
            onClick={onClose}
            disabled={uploading}
            style={{
              height: 36,
              padding: '0 16px',
              backgroundColor: colors.bgMain,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              fontSize: 14,
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => { void handleUpload(); }}
            disabled={!selectedFile || uploading}
            style={{
              height: 36,
              padding: '0 16px',
              backgroundColor: colors.accent,
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: !selectedFile || uploading ? 'not-allowed' : 'pointer',
              opacity: !selectedFile ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {uploading ? (
              <>
                <div className="hdb-spinner" />
                Subiendo...
              </>
            ) : (
              'Subir'
            )}
          </button>
        </div>
      </ModalCard>
    </Overlay>
  );
}

// ── Modal de confirmación de eliminación ──────────────────────────────────────

interface DeleteModalProps {
  filename: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

function DeleteModal({ filename, onCancel, onConfirm }: DeleteModalProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm(): Promise<void> {
    setDeleting(true);
    await onConfirm();
  }

  return (
    <Overlay onClose={onCancel}>
      <ModalCard title="¿Eliminar archivo?" onClose={onCancel}>
        <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.6 }}>
          Esta acción no se puede deshacer. ¿Seguro que quieres eliminar{' '}
          <strong style={{ color: colors.textPrimary }}>{filename}</strong>?
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 24,
          }}
        >
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{
              height: 36,
              padding: '0 16px',
              backgroundColor: colors.bgMain,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              fontSize: 14,
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.6 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => { void handleConfirm(); }}
            disabled={deleting}
            style={{
              height: 36,
              padding: '0 16px',
              backgroundColor: colors.error,
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: deleting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: deleting ? 0.8 : 1,
            }}
          >
            {deleting ? (
              <>
                <div className="hdb-spinner" />
                Eliminando...
              </>
            ) : (
              'Eliminar'
            )}
          </button>
        </div>
      </ModalCard>
    </Overlay>
  );
}
