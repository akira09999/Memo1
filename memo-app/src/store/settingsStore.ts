import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LanguagePreference } from '../i18n'

export interface Settings {
  theme: 'light' | 'dark' | 'sepia' | 'midnight' | 'forest' | 'rose'
  language: LanguagePreference
  startMinimized: boolean
  closeToTray: boolean
  fontSize: number
  autosaveDelay: number
  showLineNumbers: boolean
  spellCheck: boolean
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
      theme: 'light',
      language: 'system',
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
