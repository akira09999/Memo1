import { Tray, Menu, app, nativeImage } from 'electron'
import { join } from 'path'
import type { BrowserWindow } from 'electron'
import { tMain } from './i18n'

let tray: Tray | null = null
let trayWindow: BrowserWindow | null = null

function buildContextMenu(win: BrowserWindow) {
  return Menu.buildFromTemplate([
    {
      label: tMain('tray.newNote'),
      click: () => {
        win.show()
        win.webContents.executeJavaScript('window.dispatchEvent(new KeyboardEvent("keydown", { key: "n", ctrlKey: true }))')
      }
    },
    { type: 'separator' },
    {
      label: tMain('tray.quit'),
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])
}

export function createTray(win: BrowserWindow): void {
  let icon: Electron.NativeImage
  try {
    const iconPath = app.isPackaged
      ? join(process.resourcesPath, 'resources/icon.ico')
      : join(__dirname, '../../resources/icon.ico')
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) icon = nativeImage.createEmpty()
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  trayWindow = win
  tray.setToolTip('MemoApp')
  tray.setContextMenu(buildContextMenu(win))

  tray.on('click', () => {
    if (win.isVisible()) {
      win.hide()
    } else {
      win.show()
      win.focus()
    }
  })
}

export function refreshTrayMenu(): void {
  if (!tray || !trayWindow) return
  tray.setContextMenu(buildContextMenu(trayWindow))
}
