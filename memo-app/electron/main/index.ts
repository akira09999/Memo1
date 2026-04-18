import { app, ipcMain, shell } from 'electron'
import { createWindow } from './window'
import { createTray, refreshTrayMenu } from './tray'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts'
import { setupIpcHandlers } from './ipc/notes'
import { setupTagHandlers } from './ipc/tags'
import { setupSearchHandlers } from './ipc/search'
import { setupFolderHandlers } from './ipc/folders'
import { setupExportHandlers } from './ipc/export'
import { initDb } from '../db/client'
import { setAppLanguage } from './i18n'

app.whenReady().then(() => {
  initDb()

  setupIpcHandlers()
  setupTagHandlers()
  setupSearchHandlers()
  setupFolderHandlers()
  setupExportHandlers()

  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('app:openExternal', (_event, url: string) => shell.openExternal(url))
  ipcMain.handle('app:getLoginItem', () => app.getLoginItemSettings().openAtLogin)
  ipcMain.handle('app:setLoginItem', (_event, enable: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enable, openAsHidden: true })
  })
  ipcMain.handle('app:setLanguage', (_event, language: string) => {
    setAppLanguage(language)
    refreshTrayMenu()
  })

  const win = createWindow()
  createTray(win)
  registerGlobalShortcuts(win)
})

app.on('will-quit', () => {
  unregisterGlobalShortcuts()
})

app.on('before-quit', () => {
  // The app only quits fully when app.quit() is called.
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep the app alive in the tray on Windows.
  }
})
