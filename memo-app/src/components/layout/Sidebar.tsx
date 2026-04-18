import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { api } from '../../lib/api'
import { useI18n } from '../../hooks/useI18n'
import { useUiStore } from '../../store/uiStore'
import { useDragStore } from '../../store/dragStore'
import type { Folder, Tag } from '../../types/note'

export default function Sidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const qc = useQueryClient()
  const { t } = useI18n()
  const { selectedFolderId, selectedTagId, setSelectedFolderId, setSelectedTagId } = useUiStore()
  const { draggingNote } = useDragStore()

  const { data: folders = [] } = useQuery({ queryKey: ['folders'], queryFn: () => api.folders.list() })
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => api.tags.list() })

  const createFolder = useMutation({
    mutationFn: () => api.folders.create({ name: t('sidebar.newFolder') }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] })
  })

  const renameFolder = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.folders.rename(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] })
  })

  const deleteFolder = useMutation({
    mutationFn: (id: string) => api.folders.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] })
      qc.invalidateQueries({ queryKey: ['notes'] })
    }
  })

  const deleteTag = useMutation({
    mutationFn: (id: string) => api.tags.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] })
  })

  const handleRenameFolder = (folder: Folder, newName: string) => {
    if (newName.trim() && newName.trim() !== folder.name) {
      renameFolder.mutate({ id: folder.id, name: newName.trim() })
    }
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
          active={selectedFolderId === null && selectedTagId === null}
          onClick={() => setSelectedFolderId(null)}
        />

        <div className="mt-3 flex items-center justify-between px-2 py-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('sidebar.folders')}</span>
          <button
            onClick={() => createFolder.mutate()}
            className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-200"
            title={t('sidebar.createFolder')}
          >
            +
          </button>
        </div>

        {folders.map((folder) => (
          <SidebarItem
            key={folder.id}
            label={folder.name}
            active={selectedFolderId === folder.id}
            isDragTarget={Boolean(draggingNote && draggingNote.folder_id !== folder.id)}
            folderId={folder.id}
            onClick={() => setSelectedFolderId(folder.id)}
            onRename={(newName) => handleRenameFolder(folder, newName)}
            onDelete={() => {
              deleteFolder.mutate(folder.id)
              if (selectedFolderId === folder.id) setSelectedFolderId(null)
            }}
          />
        ))}

        {tags.length > 0 && (
          <>
            <div className="mt-3 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {t('sidebar.tags')}
            </div>
            {tags.map((tag) => (
              <SidebarItem
                key={tag.id}
                label={`# ${tag.name}`}
                active={selectedTagId === tag.id}
                onClick={() => setSelectedTagId(tag.id)}
                color={tag.color ?? undefined}
                onDelete={() => deleteTag.mutate(tag.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function SidebarItem({
  label,
  active,
  isDragTarget,
  folderId,
  onClick,
  onRename,
  onDelete,
  color
}: {
  label: string
  active: boolean
  isDragTarget?: boolean
  folderId?: string
  onClick: () => void
  onRename?: (newName: string) => void
  onDelete?: () => void
  color?: string
}) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setEditValue(label)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commitEdit = () => {
    setEditing(false)
    onRename?.(editValue)
  }

  if (editing) {
    return (
      <div className="px-2 py-1">
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-full rounded border border-blue-400 bg-white px-1.5 py-1 text-xs text-gray-900 outline-none dark:bg-gray-700 dark:text-gray-100"
          autoFocus
        />
      </div>
    )
  }

  return (
    <div
      data-folder-id={folderId}
      className={`group flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm transition-colors ${
        isDragTarget
          ? 'border border-dashed border-green-400 bg-green-100 dark:border-green-500 dark:bg-green-900/40'
          : active
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
      }`}
      onClick={onClick}
      onDoubleClick={onRename ? (event) => { event.stopPropagation(); startEdit() } : undefined}
    >
      <span className="truncate text-xs" style={color ? { color } : undefined}>
        {folderId ? `📁 ${label}` : label}
      </span>
      <div className="ml-1 hidden items-center gap-0.5 group-hover:flex">
        {onDelete && (
          <button
            className="flex h-4 w-4 items-center justify-center text-xs text-gray-400 hover:text-red-500"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            title={t('sidebar.delete')}
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
