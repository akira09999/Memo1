export interface Note {
  id: string
  title: string
  content: string
  content_html?: string | null
  folder_id?: string | null
  is_pinned: boolean
  is_archived: boolean
  created_at: number
  updated_at: number
  tags?: Tag[]
}

export interface Folder {
  id: string
  name: string
  parent_id?: string | null
  sort_order: number
}

export interface Tag {
  id: string
  name: string
  color?: string | null
}

export interface NoteFilter {
  folder_id?: string | null
  tag_id?: string
  is_archived?: boolean
  is_pinned?: boolean
  sort?: 'updated_at' | 'created_at' | 'title' | 'manual'
}

export interface CreateNoteInput {
  title?: string
  content?: string
  folder_id?: string | null
}

export interface UpdateNoteInput {
  title?: string
  content?: string
  content_html?: string | null
  folder_id?: string | null
  is_pinned?: boolean
  is_archived?: boolean
}

export interface CreateFolderInput {
  name: string
  parent_id?: string | null
  sort_order?: number
}

export interface SearchResult extends Note {
  snippet?: string
  rank?: number
  title_match_index?: number
  content_match_index?: number
}

export interface SearchOptions {
  folder_id?: string
  limit?: number
}
