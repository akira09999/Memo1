import { BrowserWindow, shell, app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

type WindowState = {
  width: number
  height: number
  x?: number
  y?: number
}

const DEFAULT_WINDOW_STATE: WindowState = {
  width: 1200,
  height: 800
}

function getWindowStatePath(): string {
  return join(app.getPath('userData'), 'window-state.json')
}

function loadWindowState(): WindowState {
  try {
    const statePath = getWindowStatePath()
    if (!existsSync(statePath)) {
      return DEFAULT_WINDOW_STATE
    }

    const raw = JSON.parse(readFileSync(statePath, 'utf8')) as Partial<WindowState>
    return {
      width: raw.width && raw.width >= 800 ? raw.width : DEFAULT_WINDOW_STATE.width,
      height: raw.height && raw.height >= 600 ? raw.height : DEFAULT_WINDOW_STATE.height,
      x: typeof raw.x === 'number' ? raw.x : undefined,
      y: typeof raw.y === 'number' ? raw.y : undefined
    }
  } catch {
    return DEFAULT_WINDOW_STATE
  }
}

function saveWindowState(win: BrowserWindow): void {
  if (win.isMinimized() || win.isMaximized()) {
    return
  }

  const bounds = win.getBounds()
  const state: WindowState = {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y
  }

  writeFileSync(getWindowStatePath(), JSON.stringify(state))
}

export function createWindow(): BrowserWindow {
  const restoredState = loadWindowState()

  const win = new BrowserWindow({
    width: restoredState.width,
    height: restoredState.height,
    x: restoredState.x,
    y: restoredState.y,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win.show())
  win.on('resize', () => saveWindowState(win))
  win.on('move', () => saveWindowState(win))

  win.on('close', (e) => {
    saveWindowState(win)

    if (!app.isQuitting) {
      e.preventDefault()
      win.hide()
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const isDev = !app.isPackaged
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

declare module 'electron' {
  interface App {
    isQuitting?: boolean
  }
}
