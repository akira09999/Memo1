import { useRef } from 'react'
import { useUiStore } from '../../store/uiStore'
import { useShortcuts } from '../../hooks/useShortcuts'
import { useI18n } from '../../hooks/useI18n'

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useUiStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useI18n()

  useShortcuts([
    {
      key: 'f',
      ctrl: true,
      handler: () => inputRef.current?.focus()
    }
  ])

  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">⌕</span>
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={t('search.placeholder')}
        className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-7 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      )}
    </div>
  )
}
