import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../../db/client'
import type { Note, NoteFilter, CreateNoteInput, UpdateNoteInput } from '../../../src/types/note'

// 본문 첫 줄에서 제목 자동 추출
function extractTitle(content: string): string {
  if (!content.trim()) return '제목 없음'
  const firstLine = content.split('\n')[0].trim()
  // H1 마크다운 헤더 처리
  if (firstLine.startsWith('# ')) return firstLine.slice(2).trim()
  return firstLine || '제목 없음'
}

export function setupIpcHandlers(): void {
  ipcMain.handle('notes:list', (_event, filter?: NoteFilter) => {
    const db = getDb()
    const sort = filter?.sort ?? 'updated_at'
    const isManual = sort === 'manual'
    const sortCol = ['updated_at', 'created_at', 'title'].includes(sort) ? sort : 'updated_at'

    let query = `
      SELECT n.*, GROUP_CONCAT(t.id || ':' || t.name || ':' || COALESCE(t.color,''), ',') as tag_data
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.is_archived = ?
    `
    const params: unknown[] = [filter?.is_archived ? 1 : 0]

    // folder_id가 null이면 전체 메모 표시, string이면 해당 폴더만 표시
    if (filter?.folder_id != null) {
      query += ' AND n.folder_id = ?'
      params.push(filter.folder_id)
    }
    if (filter?.tag_id) {
      query += ' AND nt.tag_id = ?'
      params.push(filter.tag_id)
    }

    query += isManual
      ? ` GROUP BY n.id ORDER BY n.is_pinned DESC, n.sort_order ASC`
      : ` GROUP BY n.id ORDER BY n.is_pinned DESC, n.${sortCol} DESC`

    const rows = db.prepare(query).all(...params) as Record<string, unknown>[]
    return rows.map(rowToNote)
  })

  ipcMain.handle('notes:get', (_event, id: string) => {
    const db = getDb()
    const row = db.prepare(`
      SELECT n.*, GROUP_CONCAT(t.id || ':' || t.name || ':' || COALESCE(t.color,''), ',') as tag_data
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.id = ?
      GROUP BY n.id
    `).get(id) as Record<string, unknown> | undefined
    return row ? rowToNote(row) : null
  })

  ipcMain.handle('notes:create', (_event, input: CreateNoteInput) => {
    const db = getDb()
    const now = Date.now()
    const id = uuidv4()
    const content = input.content ?? ''
    const title = input.title ?? extractTitle(content)

    db.prepare(`
      INSERT INTO notes (id, title, content, folder_id, is_pinned, is_archived, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?)
    `).run(id, title, content, input.folder_id ?? null, now, now, now)

    return db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Note
  })

  ipcMain.handle('notes:update', (_event, id: string, patch: UpdateNoteInput) => {
    const db = getDb()
    const now = Date.now()

    const current = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Note | undefined
    if (!current) throw new Error(`메모를 찾을 수 없습니다: ${id}`)

    const title = patch.title !== undefined
      ? patch.title
      : (patch.content !== undefined ? extractTitle(patch.content) : current.title)

    db.prepare(`
      UPDATE notes SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        content_html = COALESCE(?, content_html),
        folder_id = CASE WHEN ? THEN ? ELSE folder_id END,
        is_pinned = COALESCE(?, is_pinned),
        is_archived = COALESCE(?, is_archived),
        updated_at = ?
      WHERE id = ?
    `).run(
      title,
      patch.content ?? null,
      patch.content_html ?? null,
      'folder_id' in patch ? 1 : 0,
      patch.folder_id ?? null,
      patch.is_pinned !== undefined ? (patch.is_pinned ? 1 : 0) : null,
      patch.is_archived !== undefined ? (patch.is_archived ? 1 : 0) : null,
      now,
      id
    )

    return db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Note
  })

  ipcMain.handle('notes:delete', (_event, id: string) => {
    getDb().prepare('DELETE FROM notes WHERE id = ?').run(id)
  })

  ipcMain.handle('notes:pin', (_event, id: string, pinned: boolean) => {
    getDb().prepare('UPDATE notes SET is_pinned = ?, updated_at = ? WHERE id = ?')
      .run(pinned ? 1 : 0, Date.now(), id)
  })

  // 순서 일괄 업데이트: ids 배열 순서대로 sort_order를 0,1,2... 로 재설정
  ipcMain.handle('notes:reorder', (_event, ids: string[]) => {
    const db = getDb()
    const stmt = db.prepare('UPDATE notes SET sort_order = ? WHERE id = ?')
    const transaction = db.transaction((list: string[]) => {
      list.forEach((id, index) => stmt.run(index, id))
    })
    transaction(ids)
  })
}

function rowToNote(row: Record<string, unknown>): Note {
  const tags = row.tag_data
    ? String(row.tag_data).split(',').filter(Boolean).map((s) => {
        const [tagId, name, color] = s.split(':')
        return { id: tagId, name, color: color || null }
      })
    : []

  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    content_html: row.content_html as string | null,
    folder_id: row.folder_id as string | null,
    is_pinned: Boolean(row.is_pinned),
    is_archived: Boolean(row.is_archived),
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
    tags
  }
}
