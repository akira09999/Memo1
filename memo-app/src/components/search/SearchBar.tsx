import { useUiStore } from '../../store/uiStore'
import { useRef, useEffect } from 'react'
import { useShortcuts } from '../../hooks/useShortcuts'

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useUiStore()
  const inputRef = useRef<HTMLInputElement>(null)

  // Ctrl+F로 검색 포커스
  useShortcuts([
    {
      key: 'f',
      ctrl: true,
      handler: () => inputRef.current?.focus()
    }
  ])

  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="검색 (Ctrl+F)"
        className="w-full pl-7 pr-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
        >
          ✕
        </button>
      )}
    </div>
  )
}
