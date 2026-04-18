import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../../db/client'
import type { Folder, CreateFolderInput } from '../../../src/types/note'

export function setupFolderHandlers(): void {
  ipcMain.handle('folders:list', () => {
    return getDb().prepare('SELECT * FROM folders ORDER BY sort_order, name').all() as Folder[]
  })

  ipcMain.handle('folders:create', (_event, input: CreateFolderInput) => {
    const db = getDb()
    const id = uuidv4()
    db.prepare('INSERT INTO folders (id, name, parent_id, sort_order) VALUES (?, ?, ?, ?)')
      .run(id, input.name, input.parent_id ?? null, input.sort_order ?? 0)
    return db.prepare('SELECT * FROM folders WHERE id = ?').get(id) as Folder
  })

  ipcMain.handle('folders:rename', (_event, id: string, name: string) => {
    getDb().prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, id)
  })

  ipcMain.handle('folders:delete', (_event, id: string) => {
    // 폴더 삭제 시 하위 메모의 folder_id는 NULL로 (schema의 ON DELETE SET NULL)
    getDb().prepare('DELETE FROM folders WHERE id = ?').run(id)
  })
}
