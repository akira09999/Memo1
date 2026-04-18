import { useEffect } from 'react'
import { api } from '../lib/api'
import { languageToLocale, resolveLanguage, translate } from '../i18n'
import { useSettingsStore } from '../store/settingsStore'

export function useI18n() {
  const languagePreference = useSettingsStore((state) => state.language)
  const language = resolveLanguage(languagePreference)
  const locale = languageToLocale(language)

  return {
    language,
    locale,
    t: (key: string, params?: Record<string, string | number>) => translate(language, key, params)
  }
}

export function useLanguageSync() {
  const languagePreference = useSettingsStore((state) => state.language)
  const resolvedLanguage = resolveLanguage(languagePreference)

  useEffect(() => {
    document.documentElement.lang = resolvedLanguage
    api.app.setLanguage(resolvedLanguage)
  }, [resolvedLanguage])
}
