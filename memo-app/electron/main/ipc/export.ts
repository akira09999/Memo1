import { ipcMain, dialog } from 'electron'
import { writeFileSync } from 'fs'
import { getDb } from '../../db/client'
import type { Note } from '../../../src/types/note'
import { tMain } from '../i18n'

export function setupExportHandlers(): void {
  ipcMain.handle('export:toMarkdown', async (_event, noteId: string) => {
    const db = getDb()
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as Note | undefined
    if (!note) throw new Error(tMain('main.noteNotFound'))

    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `${note.title || tMain('main.defaultNoteName')}.md`,
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
      await (db as { backup: (path: string) => Promise<void> }).backup(filePath)
      return filePath
    }

    return null
  })
}
