// Tipos das entidades de "Links" — extraídos do God component Index.tsx.

export interface Link {
  id: string;
  title: string;
  url: string;
  created_at: string;
  updated_at: string;
  category_id: string | null;
  folder_id: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  is_pinned: boolean;
  deleted_at: string | null;
  description: string | null;
  user_id: string;
  tagIds: string[];
  pin_position?: number | null;
}

export interface UploadLink {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  categoryId?: string;
  tagIds?: string[];
  folderName?: string;
  description?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
}

/** Extrai domínio limpo. Retorna a URL crua em caso de parsing inválido. */
export function getLinkDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}
