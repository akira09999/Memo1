import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { api } from '../../lib/api'
import { useI18n } from '../../hooks/useI18n'
import { useUiStore } from '../../store/uiStore'

export default function Sidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const qc = useQueryClient()
  const { t } = useI18n()
  const { selectedTagId, setSelectedFolderId, setSelectedTagId } = useUiStore()
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const newTagInputRef = useRef<HTMLInputElement>(null)

  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => api.tags.list() })

  const createTag = useMutation({
    mutationFn: (name: string) => api.tags.create(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      setNewTagName('')
      setShowNewTag(false)
    }
  })

  const deleteTag = useMutation({
    mutationFn: (id: string) => api.tags.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      qc.invalidateQueries({ queryKey: ['notes'] })
    }
  })

  const handleCreateTag = () => {
    const name = newTagName.trim()
    if (name) createTag.mutate(name)
  }

  const handleShowNewTag = () => {
    setShowNewTag(true)
    setTimeout(() => newTagInputRef.current?.focus(), 0)
  }

  return (
    <div className="flex h-full flex-col bg-gray-50 p-2 dark:bg-gray-800">
      <div className="mb-1 flex items-center justify-between px-2 py-2">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">MemoApp</span>
        <button
          onClick={onOpenSettings}
          className="flex h-6 w-6 items-center justify-center rounded text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-200"
          title={t('sidebar.openSettings')}
        >
          ⚙
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mt-1 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t('sidebar.notes')}
        </div>

        <SidebarItem
          label={t('sidebar.allNotes')}
          active={selectedTagId === null}
          onClick={() => { setSelectedFolderId(null); setSelectedTagId(null) }}
        />

        <div className="mt-3 flex items-center justify-between px-2 py-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('sidebar.tags')}</span>
          <button
            onClick={handleShowNewTag}
            className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-200"
            title={t('sidebar.createTag')}
          >
            +
          </button>
        </div>

        {showNewTag && (
          <div className="px-2 py-1">
            <input
              ref={newTagInputRef}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onBlur={() => { setShowNewTag(false); setNewTagName('') }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateTag()
                if (e.key === 'Escape') { setShowNewTag(false); setNewTagName('') }
              }}
              placeholder={t('sidebar.tagNamePlaceholder')}
              className="w-full rounded border border-blue-400 bg-white px-1.5 py-1 text-xs text-gray-900 outline-none dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        )}

        {tags.length === 0 && !showNewTag && (
          <p className="px-2 py-2 text-xs text-gray-400 dark:text-gray-600">{t('sidebar.noTags')}</p>
        )}

        {tags.map((tag) => (
          <SidebarItem
            key={tag.id}
            label={`# ${tag.name}`}
            active={selectedTagId === tag.id}
            onClick={() => setSelectedTagId(tag.id)}
            color={tag.color ?? undefined}
            onDelete={() => {
              deleteTag.mutate(tag.id)
              if (selectedTagId === tag.id) setSelectedTagId(null)
            }}
          />
        ))}
      </div>
    </div>
  )
}

function SidebarItem({
  label,
  active,
  onClick,
  onDelete,
  color
}: {
  label: string
  active: boolean
  onClick: () => void
  onDelete?: () => void
  color?: string
}) {
  const { t } = useI18n()

  return (
    <div
      className={`group flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm transition-colors ${
        active
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
      }`}
      onClick={onClick}
    >
      <span className="truncate text-xs" style={color ? { color } : undefined}>
        {label}
      </span>
      {onDelete && (
        <button
          className="ml-1 hidden h-4 w-4 items-center justify-center text-xs text-gray-400 hover:text-red-500 group-hover:flex"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          title={t('sidebar.delete')}
        >
          ×
        </button>
      )}
    </div>
  )
}
