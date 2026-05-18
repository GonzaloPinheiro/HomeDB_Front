export interface FileDto {
  id: number;
  fileName: string;
  sizeBytes: number;
  contentType: string;
  folderId: number | null;
  ownerId: number;
  uploadedAt: string;
}
