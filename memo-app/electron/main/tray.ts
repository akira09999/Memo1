import { Tray, Menu, app, nativeImage } from 'electron'
import { join } from 'path'
import type { BrowserWindow } from 'electron'

let tray: Tray | null = null

export function createTray(win: BrowserWindow): void {
  // 아이콘 파일이 없으면 빈 이미지 사용
  let icon: Electron.NativeImage
  try {
    // 패키징 여부에 따라 경로 분기
    const iconPath = app.isPackaged
      ? join(process.resourcesPath, 'resources/icon.ico')
      : join(__dirname, '../../resources/icon.ico')
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) icon = nativeImage.createEmpty()
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip('MemoApp')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '새 메모',
      click: () => {
        win.show()
        win.webContents.executeJavaScript('window.dispatchEvent(new KeyboardEvent("keydown", { key: "n", ctrlKey: true }))')
      }
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  // 좌클릭: 창 토글
  tray.on('click', () => {
    if (win.isVisible()) {
      win.hide()
    } else {
      win.show()
      win.focus()
    }
  })
}
