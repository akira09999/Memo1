import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { api } from '../../lib/api'
import { useUiStore } from '../../store/uiStore'
import { useDragStore } from '../../store/dragStore'
import type { Folder, Tag } from '../../types/note'

export default function Sidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const qc = useQueryClient()
  const { selectedFolderId, selectedTagId, setSelectedFolderId, setSelectedTagId } = useUiStore()
  const { draggingNote } = useDragStore()

  const { data: folders = [] } = useQuery({ queryKey: ['folders'], queryFn: () => api.folders.list() })
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => api.tags.list() })

  const createFolder = useMutation({
    mutationFn: () => api.folders.create({ name: '새 폴더' }),
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
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800 p-2">
      {/* 상단: 앱 제목 + 설정 버튼 */}
      <div className="flex items-center justify-between px-2 py-2 mb-1">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-widest uppercase">MemoApp</span>
        <button
          onClick={onOpenSettings}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
          title="설정 (Ctrl+,)"
        >
          ⚙
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-1 mt-1">
        메모
      </div>

      <SidebarItem
        label="모든 메모"
        active={selectedFolderId === null && selectedTagId === null}
        onClick={() => setSelectedFolderId(null)}
      />

      {/* 폴더 */}
      <div className="flex items-center justify-between px-2 py-1 mt-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">폴더</span>
        <button
          onClick={() => createFolder.mutate()}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          title="새 폴더"
        >
          +
        </button>
      </div>

      {folders.map((folder: Folder) => (
        <SidebarItem
          key={folder.id}
          label={folder.name}
          active={selectedFolderId === folder.id}
          isDragTarget={!!draggingNote && draggingNote.folder_id !== folder.id}
          folderId={folder.id}
          onClick={() => setSelectedFolderId(folder.id)}
          onRename={(newName) => handleRenameFolder(folder, newName)}
          onDelete={() => {
            deleteFolder.mutate(folder.id)
            if (selectedFolderId === folder.id) setSelectedFolderId(null)
          }}
        />
      ))}

      {/* 태그 */}
      {tags.length > 0 && (
        <>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-1 mt-3">
            태그
          </div>
          {tags.map((tag: Tag) => (
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
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setEditValue(label)
    setEditing(true)
    setTimeout(() => { inputRef.current?.select() }, 0)
  }

  const commitEdit = () => {
    setEditing(false)
    if (onRename) onRename(editValue)
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
          className="w-full text-xs px-1.5 py-1 rounded border border-blue-400 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          autoFocus
        />
      </div>
    )
  }

  return (
    <div
      data-folder-id={folderId}
      className={`group flex items-center justify-between rounded px-2 py-1.5 cursor-pointer text-sm transition-colors ${
        isDragTarget
          ? 'bg-green-100 dark:bg-green-900/40 border border-dashed border-green-400 dark:border-green-500'
          : active
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
      onClick={onClick}
      onDoubleClick={onRename ? (e) => { e.stopPropagation(); startEdit() } : undefined}
    >
      <span className="truncate text-xs" style={color ? { color } : undefined}>
        {folderId ? `📁 ${label}` : label}
      </span>
      <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
        {onDelete && (
          <button
            className="text-gray-400 hover:text-red-500 text-xs w-4 h-4 flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            title="삭제"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
