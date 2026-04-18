import { app, ipcMain, shell } from 'electron'
import { createWindow } from './window'
import { createTray } from './tray'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts'
import { setupIpcHandlers } from './ipc/notes'
import { setupTagHandlers } from './ipc/tags'
import { setupSearchHandlers } from './ipc/search'
import { setupFolderHandlers } from './ipc/folders'
import { setupExportHandlers } from './ipc/export'
import { initDb } from '../db/client'

app.whenReady().then(() => {
  initDb()

  // IPC 핸들러 등록
  setupIpcHandlers()
  setupTagHandlers()
  setupSearchHandlers()
  setupFolderHandlers()
  setupExportHandlers()

  // 앱 공통 IPC
  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('app:openExternal', (_event, url: string) => shell.openExternal(url))
  ipcMain.handle('app:getLoginItem', () => app.getLoginItemSettings().openAtLogin)
  ipcMain.handle('app:setLoginItem', (_event, enable: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enable, openAsHidden: true })
  })

  const win = createWindow()
  createTray(win)
  registerGlobalShortcuts(win)
})

app.on('will-quit', () => {
  unregisterGlobalShortcuts()
})

// 창 닫기 → 트레이로 최소화 (앱 종료 안 함)
app.on('before-quit', () => {
  // app.quit() 호출 시에만 실제 종료
})

app.on('window-all-closed', () => {
  // macOS는 Dock에서 앱을 명시적으로 종료해야 함
  if (process.platform !== 'darwin') {
    // Windows: 트레이에 남아있어야 하므로 quit 안 함
    // (트레이 메뉴의 '종료'로만 종료)
  }
})
