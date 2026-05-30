import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ChevronRight,
  Download,
  File as FileIcon,
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  Home,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import * as filesService from '../../services/filesService';
import * as foldersService from '../../services/foldersService';
import { type GetFileItemDto, type GetFolderResponseDto } from '../../types/files';
import { getErrorMessage } from '../../types/errors';
import { colors, layout } from '../../lib/theme';
import { useStorage } from '../../context/StorageContext';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

// ── Utilidades ───────────────────────────────────────────────────────────────

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

/** Clave de caché para el árbol de carpetas */
function nodeKey(id: number | null): string {
  return id === null ? 'root' : String(id);
}

/** Reconstruye el breadcrumb hasta `target` usando los nodos ya cargados en el árbol */
function buildBreadcrumb(
  target: GetFolderResponseDto,
  treeChildren: Record<string, GetFolderResponseDto[]>,
): BreadcrumbItem[] {
  const ancestors: Array<{ id: number; name: string }> = [];
  let currentId: number | null = target.id;

  while (currentId !== null) {
    let found: GetFolderResponseDto | undefined;
    for (const list of Object.values(treeChildren)) {
      found = list.find((f) => f.id === currentId);
      if (found) break;
    }
    if (!found) break;
    ancestors.unshift({ id: found.id, name: found.name });
    currentId = found.parentFolderId;
  }

  return [{ id: null, name: 'Raíz' }, ...ancestors];
}

// ── Tipos locales ────────────────────────────────────────────────────────────

type BreadcrumbItem = { id: number | null; name: string };

type DeleteTarget =
  | { type: 'file'; item: GetFileItemDto }
  | { type: 'folder'; item: GetFolderResponseDto };

// ── Componente principal ─────────────────────────────────────────────────────

export default function FilesPage() {
  const { refreshStats } = useStorage();

  // Navegación
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: null, name: 'Raíz' }]);

  // Panel derecho
  const [panelFolders, setPanelFolders] = useState<GetFolderResponseDto[]>([]);
  const [panelFiles, setPanelFiles] = useState<GetFileItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Árbol izquierdo
  const [treeChildren, setTreeChildren] = useState<Record<string, GetFolderResponseDto[]>>({});
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Modales
  const [uploadOpen, setUploadOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // ── Carga de contenido ───────────────────────────────────────────────────

  const loadContent = useCallback(async (folderId: number | null) => {
    setIsLoading(true);
    try {
      const param = folderId === null ? undefined : folderId;
      const [folders, files] = await Promise.all([
        foldersService.getFolders(param),
        filesService.listFiles(param),
      ]);
      setPanelFolders(folders);
      setPanelFiles(files);
      setTreeChildren((prev) => ({ ...prev, [nodeKey(folderId)]: folders }));
    } catch (err) {
      toast.error(getErrorMessage(parseErrorCode(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContent(currentFolderId);
  }, [currentFolderId, loadContent]);

  // ── Navegación ───────────────────────────────────────────────────────────

  /** Desde el árbol izquierdo: reconstruye el breadcrumb completo */
  function navigateFromTree(folder: GetFolderResponseDto) {
    setBreadcrumb(buildBreadcrumb(folder, treeChildren));
    setExpandedNodes((prev) => new Set([...prev, String(folder.id)]));
    setCurrentFolderId(folder.id);
  }

  /** Desde la tabla derecha (doble clic): siempre baja un nivel */
  function navigateDeeper(folder: GetFolderResponseDto) {
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setExpandedNodes((prev) => new Set([...prev, String(folder.id)]));
    setCurrentFolderId(folder.id);
  }

  /** Desde el breadcrumb: sube/trunca al punto clicado */
  function navigateToBreadcrumb(item: BreadcrumbItem) {
    if (item.id === currentFolderId) return;
    const idx = breadcrumb.findIndex((b) => b.id === item.id);
    if (idx >= 0) setBreadcrumb((prev) => prev.slice(0, idx + 1));
    setCurrentFolderId(item.id);
  }

  /** Raíz desde el árbol */
  function navigateToRoot() {
    if (currentFolderId === null) return;
    setBreadcrumb([{ id: null, name: 'Raíz' }]);
    setCurrentFolderId(null);
  }

  // ── Toggle del árbol ──────────────────────────────────────────────────────

  async function handleTreeToggle(folder: GetFolderResponseDto): Promise<void> {
    const key = String(folder.id);
    const isExpanded = expandedNodes.has(key);

    if (!isExpanded && treeChildren[key] === undefined) {
      try {
        const children = await foldersService.getFolders(folder.id);
        setTreeChildren((prev) => ({ ...prev, [key]: children }));
      } catch {
        // Fallo silencioso en la expansión del árbol
      }
    }

    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (isExpanded) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ── Crear carpeta ─────────────────────────────────────────────────────────

  async function handleCreateFolder(name: string): Promise<void> {
    const param = currentFolderId === null ? undefined : currentFolderId;
    const created = await foldersService.createFolder(name, param);
    // CreateFolderResponseDto y GetFolderResponseDto tienen la misma estructura
    setPanelFolders((prev) => [...prev, created]);
    const key = nodeKey(currentFolderId);
    setTreeChildren((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), created] }));
    toast.success('Carpeta creada correctamente');
    setCreateFolderOpen(false);
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────

  async function handleDeleteConfirm(): Promise<void> {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'file') {
      const file = deleteTarget.item;
      try {
        await filesService.deleteFile(file.id);
        setPanelFiles((prev) => prev.filter((f) => f.id !== file.id));
        toast.success(`"${file.fileName}" eliminado`);
        refreshStats();
      } catch (err) {
        toast.error(getErrorMessage(parseErrorCode(err)));
      }
    } else {
      const folder = deleteTarget.item;
      try {
        await foldersService.deleteFolder(folder.id);
        setPanelFolders((prev) => prev.filter((f) => f.id !== folder.id));
        setTreeChildren((prev) => {
          const parentKey = nodeKey(folder.parentFolderId);
          const next = { ...prev };
          next[parentKey] = (prev[parentKey] ?? []).filter((f) => f.id !== folder.id);
          delete next[String(folder.id)];
          return next;
        });
        setExpandedNodes((prev) => {
          const next = new Set(prev);
          next.delete(String(folder.id));
          return next;
        });
        toast.success(`"${folder.name}" eliminada`);
      } catch (err) {
        toast.error(getErrorMessage(parseErrorCode(err)));
      }
    }

    setDeleteTarget(null);
  }

  // ── Subida exitosa ────────────────────────────────────────────────────────

  function handleUploadSuccess(file: GetFileItemDto): void {
    // Solo agregar si se subió a la carpeta que estamos viendo ahora
    if ((file.folderId ?? null) === currentFolderId) {
      setPanelFiles((prev) => [file, ...prev]);
    }
    setUploadOpen(false);
    toast.success('Archivo subido correctamente');
    refreshStats();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isEmpty = !isLoading && panelFolders.length === 0 && panelFiles.length === 0;

  return (
    <div
      style={{
        display: 'flex',
        margin: -24,
        minHeight: `calc(100vh - ${layout.headerHeight}px)`,
      }}
    >
      {/* ── Panel izquierdo: árbol de carpetas ── */}
      <FolderTreePanel
        treeChildren={treeChildren}
        expandedNodes={expandedNodes}
        currentFolderId={currentFolderId}
        onNavigateToRoot={navigateToRoot}
        onNavigateToFolder={navigateFromTree}
        onToggle={(folder) => {
          void handleTreeToggle(folder);
        }}
        onDelete={(folder) => setDeleteTarget({ type: 'folder', item: folder })}
        onCreateFolder={() => setCreateFolderOpen(true)}
      />

      {/* ── Panel derecho: contenido ── */}
      <div style={{ flex: 1, minWidth: 0, padding: 24, display: 'flex', flexDirection: 'column' }}>
        {/* Breadcrumb */}
        <BreadcrumbBar items={breadcrumb} onNavigate={navigateToBreadcrumb} />

        {/* Cabecera */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 12,
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 600, color: colors.textPrimary }}>
            {breadcrumb[breadcrumb.length - 1]?.name ?? 'Mis archivos'}
          </h2>
          <PrimaryButton onClick={() => setUploadOpen(true)} icon={<Upload size={15} />}>
            Subir archivo
          </PrimaryButton>
        </div>

        {/* Contenido */}
        {isLoading && <SkeletonTable />}
        {isEmpty && (
          <EmptyState isRoot={currentFolderId === null} onUpload={() => setUploadOpen(true)} />
        )}
        {!isLoading && !isEmpty && (
          <CombinedTable
            folders={panelFolders}
            files={panelFiles}
            onNavigateFolder={navigateDeeper}
            onDeleteFolder={(folder) => setDeleteTarget({ type: 'folder', item: folder })}
            onDownloadFile={(file) => {
              void filesService.downloadFile(file.id, file.fileName);
            }}
            onDeleteFile={(file) => setDeleteTarget({ type: 'file', item: file })}
          />
        )}
      </div>

      {/* ── Modales ── */}
      {uploadOpen && (
        <UploadModal
          currentFolderId={currentFolderId}
          onClose={() => setUploadOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
      {createFolderOpen && (
        <CreateFolderModal
          onClose={() => setCreateFolderOpen(false)}
          onConfirm={handleCreateFolder}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.type === 'file' ? deleteTarget.item.fileName : deleteTarget.item.name}
          type={deleteTarget.type}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

// ── Panel izquierdo ───────────────────────────────────────────────────────────

interface FolderTreePanelProps {
  treeChildren: Record<string, GetFolderResponseDto[]>;
  expandedNodes: Set<string>;
  currentFolderId: number | null;
  onNavigateToRoot: () => void;
  onNavigateToFolder: (folder: GetFolderResponseDto) => void;
  onToggle: (folder: GetFolderResponseDto) => void;
  onDelete: (folder: GetFolderResponseDto) => void;
  onCreateFolder: () => void;
}

function FolderTreePanel({
  treeChildren,
  expandedNodes,
  currentFolderId,
  onNavigateToRoot,
  onNavigateToFolder,
  onToggle,
  onDelete,
  onCreateFolder,
}: FolderTreePanelProps) {
  const rootChildren = treeChildren['root'] ?? [];
  const rootActive = currentFolderId === null;

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        alignSelf: 'stretch',
        backgroundColor: colors.bgSidebar,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        padding: 8,
        overflowY: 'auto',
      }}
    >
      {/* Entrada Raíz */}
      <div
        onClick={onNavigateToRoot}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 34,
          padding: '0 8px',
          borderRadius: 6,
          cursor: 'pointer',
          backgroundColor: rootActive ? colors.accentSoft : 'transparent',
          color: rootActive ? colors.accentSoftText : colors.textPrimary,
          fontSize: 13,
          fontWeight: rootActive ? 600 : 400,
          userSelect: 'none',
          marginBottom: 2,
        }}
      >
        <Home size={14} />
        <span>Raíz</span>
      </div>

      {/* Hijos de raíz */}
      <div style={{ flex: 1 }}>
        {rootChildren.map((folder) => (
          <FolderTreeItem
            key={folder.id}
            folder={folder}
            depth={0}
            treeChildren={treeChildren}
            expandedNodes={expandedNodes}
            currentFolderId={currentFolderId}
            onNavigate={onNavigateToFolder}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Botón nueva carpeta */}
      <button
        onClick={onCreateFolder}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 32,
          padding: '0 10px',
          marginTop: 8,
          width: '100%',
          backgroundColor: 'transparent',
          color: colors.textSecondary,
          border: `1px dashed ${colors.border}`,
          borderRadius: 6,
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        <FolderPlus size={13} />
        Nueva carpeta
      </button>
    </div>
  );
}

// ── Nodo del árbol (recursivo) ────────────────────────────────────────────────

interface FolderTreeItemProps {
  folder: GetFolderResponseDto;
  depth: number;
  treeChildren: Record<string, GetFolderResponseDto[]>;
  expandedNodes: Set<string>;
  currentFolderId: number | null;
  onNavigate: (folder: GetFolderResponseDto) => void;
  onToggle: (folder: GetFolderResponseDto) => void;
  onDelete: (folder: GetFolderResponseDto) => void;
}

function FolderTreeItem({
  folder,
  depth,
  treeChildren,
  expandedNodes,
  currentFolderId,
  onNavigate,
  onToggle,
  onDelete,
}: FolderTreeItemProps) {
  const [hovered, setHovered] = useState(false);
  const key = String(folder.id);
  const isExpanded = expandedNodes.has(key);
  const isActive = currentFolderId === folder.id;
  const children = treeChildren[key];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          paddingLeft: 4 + depth * 14,
          paddingRight: 4,
          height: 32,
          borderRadius: 6,
          cursor: 'pointer',
          backgroundColor: isActive ? colors.accentSoft : hovered ? colors.surface : 'transparent',
          color: isActive ? colors.accentSoftText : colors.textPrimary,
          fontSize: 13,
          fontWeight: isActive ? 500 : 400,
          userSelect: 'none',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onNavigate(folder)}
      >
        {/* ChevronRight / ChevronDown */}
        <button
          title={isExpanded ? 'Colapsar' : 'Expandir'}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(folder);
          }}
          style={{
            width: 16,
            height: 16,
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textSecondary,
          }}
        >
          <ChevronRight
            size={12}
            style={{
              transform: isExpanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        </button>

        <FolderIcon size={14} color={colors.accent} style={{ flexShrink: 0 }} />

        <span
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {folder.name}
        </span>

        {/* Botón eliminar (solo en hover) */}
        {hovered && (
          <button
            title="Eliminar carpeta"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(folder);
            }}
            style={{
              width: 20,
              height: 20,
              flexShrink: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.error,
              borderRadius: 4,
            }}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Hijos recursivos */}
      {isExpanded && children && children.length > 0 &&
        children.map((child) => (
          <FolderTreeItem
            key={child.id}
            folder={child}
            depth={depth + 1}
            treeChildren={treeChildren}
            expandedNodes={expandedNodes}
            currentFolderId={currentFolderId}
            onNavigate={onNavigate}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

interface BreadcrumbBarProps {
  items: BreadcrumbItem[];
  onNavigate: (item: BreadcrumbItem) => void;
}

function BreadcrumbBar({ items, onNavigate }: BreadcrumbBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        fontSize: 13,
        color: colors.textSecondary,
      }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span
            key={`${String(item.id)}-${i}`}
            style={{ display: 'flex', alignItems: 'center', gap: 2 }}
          >
            {i > 0 && <ChevronRight size={12} color={colors.border} />}
            <button
              onClick={() => {
                if (!isLast) onNavigate(item);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '0 2px',
                cursor: isLast ? 'default' : 'pointer',
                fontSize: 13,
                color: isLast ? colors.textPrimary : colors.textSecondary,
                fontWeight: isLast ? 500 : 400,
              }}
            >
              {item.name}
            </button>
          </span>
        );
      })}
    </div>
  );
}

// ── Tabla combinada (carpetas + archivos) ─────────────────────────────────────

interface CombinedTableProps {
  folders: GetFolderResponseDto[];
  files: GetFileItemDto[];
  onNavigateFolder: (folder: GetFolderResponseDto) => void;
  onDeleteFolder: (folder: GetFolderResponseDto) => void;
  onDownloadFile: (file: GetFileItemDto) => void;
  onDeleteFile: (file: GetFileItemDto) => void;
}

function CombinedTable({
  folders,
  files,
  onNavigateFolder,
  onDeleteFolder,
  onDownloadFile,
  onDeleteFile,
}: CombinedTableProps) {
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
            <th style={{ ...thStyle, width: 160 }}>Fecha</th>
            <th style={{ ...thStyle, width: 90 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {folders.map((folder, fi) => (
            <FolderRow
              key={`folder-${folder.id}`}
              folder={folder}
              isLast={fi === folders.length - 1 && files.length === 0}
              onNavigate={() => onNavigateFolder(folder)}
              onDelete={() => onDeleteFolder(folder)}
            />
          ))}
          {files.map((file, fi) => (
            <FileRow
              key={`file-${file.id}`}
              file={file}
              isLast={fi === files.length - 1}
              onDownload={() => onDownloadFile(file)}
              onDelete={() => onDeleteFile(file)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Fila de carpeta ───────────────────────────────────────────────────────────

interface FolderRowProps {
  folder: GetFolderResponseDto;
  isLast: boolean;
  onNavigate: () => void;
  onDelete: () => void;
}

function FolderRow({ folder, isLast, onNavigate, onDelete }: FolderRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={onNavigate}
      title="Doble clic para abrir"
      style={{
        backgroundColor: hovered ? '#f9f9fb' : colors.bgMain,
        borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
        cursor: 'default',
      }}
    >
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FolderIcon size={15} color={colors.accent} />
          <span style={{ fontSize: 14, color: colors.textPrimary }}>{folder.name}</span>
        </div>
      </td>
      <td style={{ padding: '12px 16px', fontSize: 14, color: colors.textSecondary }}>—</td>
      <td
        style={{
          padding: '12px 16px',
          fontSize: 14,
          color: colors.textSecondary,
          whiteSpace: 'nowrap',
        }}
      >
        {formatDate(folder.createdAt)}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <IconButton
          title="Eliminar carpeta"
          onClick={onDelete}
          iconColor={colors.error}
          hoverBg="#fee2e2"
        >
          <Trash2 size={16} />
        </IconButton>
      </td>
    </tr>
  );
}

// ── Fila de archivo ───────────────────────────────────────────────────────────

interface FileRowProps {
  file: GetFileItemDto;
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
          <span style={{ fontSize: 14, color: colors.textPrimary }}>{file.fileName}</span>
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

// ── Botones ───────────────────────────────────────────────────────────────────

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

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonTable() {
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' }}>
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

// ── Estado vacío ──────────────────────────────────────────────────────────────

function EmptyState({ isRoot, onUpload }: { isRoot: boolean; onUpload: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '72px 0' }}>
      <FolderOpen size={56} color={colors.border} />
      <p style={{ marginTop: 16, fontSize: 15, color: colors.textSecondary }}>
        {isRoot ? 'No hay archivos todavía' : 'Esta carpeta está vacía'}
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
        <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>{title}</h3>
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
  currentFolderId: number | null;
  onClose: () => void;
  onSuccess: (file: GetFileItemDto) => void;
}

function UploadModal({ currentFolderId, onClose, onSuccess }: UploadModalProps) {
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
      const fParam = currentFolderId === null ? undefined : currentFolderId;
      const dto = await filesService.uploadFile(selectedFile, fParam, (pct) => setProgress(pct));
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
          <Upload size={32} color={isDragOver ? colors.accent : colors.textSecondary} />
          {selectedFile ? (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: colors.textPrimary }}>
                {selectedFile.name}
              </p>
              <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                {formatSize(selectedFile.size)}
              </p>
            </div>
          ) : (
            <p style={{ marginTop: 12, fontSize: 14, color: colors.textSecondary, lineHeight: 1.5 }}>
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
          <p style={{ fontSize: 13, color: colors.error, marginTop: 12 }}>{error}</p>
        )}

        {/* Botones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
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
            onClick={() => {
              void handleUpload();
            }}
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

// ── Modal de nueva carpeta ────────────────────────────────────────────────────

interface CreateFolderModalProps {
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
}

function CreateFolderModal({ onClose, onConfirm }: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      await onConfirm(trimmed);
      // Si llega aquí sin error el modal se cierra desde el padre
    } catch (err) {
      setError(getErrorMessage(parseErrorCode(err)));
      setLoading(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="Nueva carpeta" onClose={onClose}>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la carpeta"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSubmit();
          }}
          style={{
            width: '100%',
            height: 38,
            padding: '0 12px',
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            fontSize: 14,
            color: colors.textPrimary,
            backgroundColor: colors.bgMain,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {error && (
          <p style={{ fontSize: 13, color: colors.error, marginTop: 8 }}>{error}</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              height: 36,
              padding: '0 16px',
              backgroundColor: colors.bgMain,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              void handleSubmit();
            }}
            disabled={!name.trim() || loading}
            style={{
              height: 36,
              padding: '0 16px',
              backgroundColor: colors.accent,
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: !name.trim() || loading ? 'not-allowed' : 'pointer',
              opacity: !name.trim() ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {loading ? (
              <>
                <div className="hdb-spinner" />
                Creando...
              </>
            ) : (
              'Crear'
            )}
          </button>
        </div>
      </ModalCard>
    </Overlay>
  );
}

// ── Modal de confirmación de eliminación ──────────────────────────────────────

interface DeleteModalProps {
  name: string;
  type: 'file' | 'folder';
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

function DeleteModal({ name, type, onCancel, onConfirm }: DeleteModalProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm(): Promise<void> {
    setDeleting(true);
    await onConfirm();
    // El padre llama a setDeleteTarget(null) tras onConfirm → modal desmontado
  }

  const title = type === 'file' ? '¿Eliminar archivo?' : '¿Eliminar carpeta?';

  return (
    <Overlay onClose={onCancel}>
      <ModalCard title={title} onClose={onCancel}>
        <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.6 }}>
          Esta acción no se puede deshacer. ¿Seguro que quieres eliminar{' '}
          <strong style={{ color: colors.textPrimary }}>{name}</strong>?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
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
            onClick={() => {
              void handleConfirm();
            }}
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
