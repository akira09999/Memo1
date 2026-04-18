import { app } from 'electron'

export type AppLanguage = 'en' | 'ko' | 'ja'

const messages: Record<AppLanguage, Record<string, string>> = {
  en: {
    'main.untitledNote': 'Untitled',
    'main.noteNotFound': 'Note not found.',
    'main.defaultNoteName': 'Note',
    'tray.newNote': 'New Note',
    'tray.quit': 'Quit'
  },
  ko: {
    'main.untitledNote': '제목 없음',
    'main.noteNotFound': '메모를 찾을 수 없습니다.',
    'main.defaultNoteName': '메모',
    'tray.newNote': '새 메모',
    'tray.quit': '종료'
  },
  ja: {
    'main.untitledNote': '無題',
    'main.noteNotFound': 'メモが見つかりません。',
    'main.defaultNoteName': 'メモ',
    'tray.newNote': '新しいメモ',
    'tray.quit': '終了'
  }
}

function normalizeLanguage(language: string | null | undefined): AppLanguage {
  const source = (language ?? app.getLocale() ?? 'en').toLowerCase()
  if (source.startsWith('ko')) return 'ko'
  if (source.startsWith('ja')) return 'ja'
  return 'en'
}

let currentLanguage: AppLanguage = normalizeLanguage(app.getLocale())

export function setAppLanguage(language: string): void {
  currentLanguage = normalizeLanguage(language)
}

export function tMain(key: string): string {
  return messages[currentLanguage][key] ?? messages.en[key] ?? key
}
