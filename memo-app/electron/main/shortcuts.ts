import { globalShortcut, BrowserWindow } from 'electron'

export function registerGlobalShortcuts(mainWin: BrowserWindow): void {
  // Ctrl+Shift+M: 앱 창 show/hide 토글
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    if (mainWin.isVisible()) {
      mainWin.hide()
    } else {
      mainWin.show()
      mainWin.focus()
    }
  })

  // Ctrl+Shift+N: 빠른 메모 (창을 열고 새 메모 생성)
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    mainWin.show()
    mainWin.focus()
    mainWin.webContents.executeJavaScript(
      'window.dispatchEvent(new KeyboardEvent("keydown", { key: "n", ctrlKey: true }))'
    )
  })
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll()
}
