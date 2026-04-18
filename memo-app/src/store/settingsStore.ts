import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Settings {
  // 일반
  theme: 'light' | 'dark' | 'sepia' | 'midnight' | 'forest' | 'rose'
  language: 'ko' | 'en'
  startMinimized: boolean
  closeToTray: boolean

  // 에디터
  fontSize: number
  autosaveDelay: number
  showLineNumbers: boolean
  spellCheck: boolean

  // 데이터
  autoBackup: boolean
  autoBackupInterval: number
  autoBackupPath: string
}

interface SettingsState extends Settings {
  isOpen: boolean
  openSettings: () => void
  closeSettings: () => void
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // 기본값
      theme: 'light',
      language: 'ko',
      startMinimized: false,
      closeToTray: true,
      fontSize: 14,
      autosaveDelay: 500,
      showLineNumbers: false,
      spellCheck: false,
      autoBackup: false,
      autoBackupInterval: 24,
      autoBackupPath: '',

      isOpen: false,
      openSettings: () => set({ isOpen: true }),
      closeSettings: () => set({ isOpen: false }),
      updateSetting: (key, value) => set({ [key]: value } as Partial<Settings>)
    }),
    { name: 'memo-settings' }
  )
)
