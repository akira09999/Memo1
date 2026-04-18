import { useEffect } from 'react'
import { useSettingsStore } from '../store/settingsStore'

const DARK_THEMES = new Set(['dark', 'midnight', 'forest'])

export function useTheme(): void {
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', DARK_THEMES.has(theme))
    root.setAttribute('data-theme', theme)
  }, [theme])
}
