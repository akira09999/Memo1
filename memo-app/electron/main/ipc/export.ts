import { ipcMain, dialog, app } from 'electron'
import { writeFileSync, createWriteStream } from 'fs'
import { join } from 'path'
import { getDb } from '../../db/client'
import type { Note } from '../../../src/types/note'

export function setupExportHandlers(): void {
  ipcMain.handle('export:toMarkdown', async (_event, noteId: string) => {
    const db = getDb()
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as Note | undefined
    if (!note) throw new Error('메모를 찾을 수 없습니다.')

    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `${note.title || '메모'}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })

    if (filePath) {
      writeFileSync(filePath, note.content, 'utf-8')
      return filePath
    }
    return null
  })

  ipcMain.handle('export:backupAll', async () => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `memo-backup-${Date.now()}.sqlite`,
      filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }]
    })

    if (filePath) {
      const db = getDb()
      // better-sqlite3의 backup API 사용
      await (db as any).backup(filePath)
      return filePath
    }
    return null
  })
}
