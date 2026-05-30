export interface FileDto {
  id: number;
  fileName: string;
  sizeBytes: number;
  contentType: string;
  folderId: number | null;
  ownerId: number;
  uploadedAt: string;
}

// Devuelto por GET /api/files/listFiles — sin ownerId (no necesario en cliente)
export interface GetFileItemDto {
  id: number;
  fileName: string;
  sizeBytes: number;
  contentType: string;
  folderId: number | null;
  uploadedAt: string;
}

export interface GetFolderResponseDto {
  id: number;
  name: string;
  parentFolderId: number | null;
  ownerId: number;
  createdAt: string;
}

export interface CreateFolderResponseDto {
  id: number;
  name: string;
  parentFolderId: number | null;
  ownerId: number;
  createdAt: string;
}

export interface DeleteFolderResponseDto {
  folderId: number;
  name: string;
}

export interface DeleteFileResponseDto {
  fileId: number;
  fileName: string;
}

export interface StorageStatisticsDto {
  totalFiles: number;
  totalFolders: number;
  totalSizeBytes: number;
  totalSizeMb: number;
}
