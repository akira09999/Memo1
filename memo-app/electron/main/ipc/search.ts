import { ipcMain } from 'electron'
import { getDb } from '../../db/client'
import type { SearchResult, SearchOptions } from '../../../src/types/note'

export function setupSearchHandlers(): void {
  ipcMain.handle('search:query', (_event, keyword: string, options?: SearchOptions) => {
    if (!keyword.trim()) return []
    const db = getDb()
    const limit = options?.limit ?? 50

    // FTS5 검색 쿼리 - snippet으로 미리보기 생성
    const rows = db.prepare(`
      SELECT
        n.*,
        snippet(notes_fts, 1, '<mark>', '</mark>', '...', 20) as snippet,
        instr(lower(coalesce(n.title, '')), lower(?)) - 1 as title_match_index,
        instr(lower(coalesce(n.content, '')), lower(?)) - 1 as content_match_index
      FROM notes_fts
      JOIN notes n ON n.rowid = notes_fts.rowid
      WHERE notes_fts MATCH ? AND n.is_archived = 0
      ORDER BY rank
      LIMIT ?
    `).all(keyword, keyword, `"${keyword.replace(/"/g, '""')}"*`, limit) as Record<string, unknown>[]

    return rows.map((row): SearchResult => ({
      id: row.id as string,
      title: row.title as string,
      content: row.content as string,
      content_html: row.content_html as string | null,
      folder_id: row.folder_id as string | null,
      is_pinned: Boolean(row.is_pinned),
      is_archived: Boolean(row.is_archived),
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
      snippet: row.snippet as string,
      title_match_index: row.title_match_index as number,
      content_match_index: row.content_match_index as number
    }))
  })
}
