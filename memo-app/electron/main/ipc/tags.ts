import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../../db/client'
import type { Tag } from '../../../src/types/note'

export function setupTagHandlers(): void {
  ipcMain.handle('tags:list', () => {
    return getDb().prepare('SELECT * FROM tags ORDER BY name').all() as Tag[]
  })

  ipcMain.handle('tags:create', (_event, name: string, color?: string) => {
    const db = getDb()
    const id = uuidv4()
    db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)').run(id, name, color ?? null)
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag
  })

  ipcMain.handle('tags:delete', (_event, id: string) => {
    getDb().prepare('DELETE FROM tags WHERE id = ?').run(id)
  })

  ipcMain.handle('tags:assignToNote', (_event, noteId: string, tagIds: string[]) => {
    const db = getDb()
    const deleteStmt = db.prepare('DELETE FROM note_tags WHERE note_id = ?')
    const insertStmt = db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)')

    const transaction = db.transaction((nId: string, ids: string[]) => {
      deleteStmt.run(nId)
      for (const tagId of ids) {
        insertStmt.run(nId, tagId)
      }
    })
    transaction(noteId, tagIds)
  })
}
