import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '../../lib/api'
import { useUiStore } from '../../store/uiStore'
import { useEditorStore } from '../../store/editorStore'
import { useDragStore } from '../../store/dragStore'
import type { Note, Folder } from '../../types/note'
import SearchBar from '../search/SearchBar'

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }
  const diff = now.getTime() - d.getTime()
  if (diff < 1000 * 60 * 60 * 24 * 7) {
    return d.toLocaleDateString('ko-KR', { weekday: 'short' })
  }
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

type SortKey = 'updated_at' | 'created_at' | 'title' | 'manual'

function getPreviewMarkup(note: Note): string {
  if ('snippet' in note && typeof note.snippet === 'string' && note.snippet.trim()) {
    return note.snippet
  }

  if (note.content_html) {
    return note.content_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
  }

  return note.content.split('\n').slice(1).join(' ').trim().slice(0, 100)
}

export default function NoteList() {
  const qc = useQueryClient()
  const {
    selectedFolderId,
    selectedTagId,
    searchQuery,
    setSearchQuery,
    setPendingSearchMatch,
    clearPendingSearchMatch
  } = useUiStore()
  const { selectedNoteId, setSelectedNote } = useEditorStore()
  const { setDraggingNote } = useDragStore()
  const [sort, setSort] = useState<SortKey>('updated_at')
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  // 드래그 중 낙관적 순서 관리
  const [optimisticNotes, setOptimisticNotes] = useState<Note[] | null>(null)

  const isSearching = searchQuery.trim().length > 0

  const { data: fetchedNotes = [], isLoading } = useQuery({
    queryKey: ['notes', { folder_id: selectedFolderId, tag_id: selectedTagId, sort }],
    queryFn: () => api.notes.list({
      folder_id: selectedFolderId,
      tag_id: selectedTagId ?? undefined,
      sort,
      is_archived: false
    }),
    enabled: !isSearching,
    onSuccess: () => setOptimisticNotes(null)
  })

  const { data: searchResults = [] } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: () => api.search.query(searchQuery),
    enabled: isSearching
  })

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.folders.list()
  })

  const notes = optimisticNotes ?? fetchedNotes
  const displayNotes: Note[] = isSearching ? searchResults : notes

  const createNote = useMutation({
    mutationFn: () => api.notes.create({ folder_id: selectedFolderId }),
    onSuccess: async (newNote) => {
      setSearchQuery('')
      await qc.invalidateQueries({ queryKey: ['notes'] })
      setSelectedNote(newNote)
    }
  })

  const deleteNote = useMutation({
    mutationFn: (id: string) => api.notes.delete(id),
    onSuccess: (_data, deletedId) => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      if (selectedNoteId === deletedId) setSelectedNote(null)
    }
  })

  const moveNote = useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) =>
      api.notes.update(id, { folder_id: folderId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] })
  })

  const reorderNotes = useMutation({
    mutationFn: (ids: string[]) => api.notes.reorder(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] })
  })

  const handleDelete = (noteId: string) => {
    deleteNote.mutate(noteId)
  }

  const handleSelectNote = useCallback((note: Note) => {
    if (isSearching && 'content_match_index' in note && typeof note.content_match_index === 'number' && note.content_match_index >= 0) {
      setPendingSearchMatch({
        noteId: note.id,
        index: note.content_match_index,
        length: searchQuery.trim().length
      })
    } else {
      clearPendingSearchMatch()
    }

    setSelectedNote(note)
  }, [clearPendingSearchMatch, isSearching, searchQuery, setPendingSearchMatch, setSelectedNote])

  // dnd-kit 센서: 5px 이상 이동 시 드래그 시작
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const note = notes.find((n) => n.id === event.active.id)
    if (note) {
      setActiveNote(note)
      setDraggingNote(note)
    }
  }, [notes, setDraggingNote])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveNote(null)
    setDraggingNote(null)

    const { active, over } = event

    // 드롭 위치의 DOM 요소 확인 (폴더 드롭 감지)
    const startEvent = event.activatorEvent as PointerEvent
    const endX = startEvent.clientX + event.delta.x
    const endY = startEvent.clientY + event.delta.y
    const el = document.elementFromPoint(endX, endY)
    const folderEl = el?.closest('[data-folder-id]') as HTMLElement | null
    if (folderEl) {
      const folderId = folderEl.getAttribute('data-folder-id')
      moveNote.mutate({ id: active.id as string, folderId })
      return
    }

    // 같은 위치이거나 폴더 드롭이 아닌 경우 → 순서 변경
    if (!over || active.id === over.id) return

    const oldIndex = notes.findIndex((n) => n.id === active.id)
    const newIndex = notes.findIndex((n) => n.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(notes, oldIndex, newIndex)
    setOptimisticNotes(reordered)
    setSort('manual')
    reorderNotes.mutate(reordered.map((n) => n.id))
  }, [notes, reorderNotes, moveNote])

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 상단 도구 모음 */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">{displayNotes.length}개</span>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value as SortKey); setOptimisticNotes(null) }}
              className="text-xs text-gray-500 bg-transparent border-none outline-none cursor-pointer"
            >
              <option value="updated_at">최근 수정</option>
              <option value="created_at">생성일</option>
              <option value="title">제목</option>
              <option value="manual">수동 정렬</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => createNote.mutate()}
              className="text-xs px-2 py-1 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900 font-medium"
              title="새 메모 (Ctrl+N)"
            >
              + 새 메모
            </button>
          </div>
        </div>
        <SearchBar />
      </div>

      {/* 메모 목록 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-400 text-sm">로딩 중...</div>
        ) : displayNotes.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {isSearching ? '검색 결과가 없습니다.' : '메모가 없습니다.'}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={displayNotes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
              {displayNotes.map((note) => (
                <SortableNoteItem
                  key={note.id}
                  note={note}
                  folders={folders}
                  isSelected={selectedNoteId === note.id}
                  isDragging={activeNote?.id === note.id}
                  onClick={() => handleSelectNote(note)}
                  onDelete={() => handleDelete(note.id)}
                  onMove={(folderId) => moveNote.mutate({ id: note.id, folderId })}
                />
              ))}
            </SortableContext>

            {/* 드래그 중 고스트 */}
            <DragOverlay>
              {activeNote && (
                <div className="bg-white dark:bg-gray-800 border border-blue-400 rounded shadow-xl px-3 py-2.5 opacity-95 text-sm font-medium text-gray-800 dark:text-gray-100 max-w-xs">
                  {activeNote.title}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  )
}

// 드래그 가능한 메모 아이템
function SortableNoteItem(props: NoteItemProps & { isDragging: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({
    id: props.note.id
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.3 : 1
  }

  return (
    <div ref={setNodeRef} style={style}>
      <NoteItem {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  )
}

interface NoteItemProps {
  note: Note
  folders: Folder[]
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
  onMove: (folderId: string | null) => void
  dragHandleProps?: Record<string, unknown>
}

function NoteItem({ note, folders, isSelected, onClick, onDelete, onMove, dragHandleProps }: NoteItemProps) {
  const [showFolderMenu, setShowFolderMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const previewMarkup = getPreviewMarkup(note)

  return (
    <div
      className={`px-3 py-2.5 cursor-pointer border-b border-gray-100 dark:border-gray-800 group ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-l-blue-500'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-1">
        {/* 드래그 핸들 */}
        <div
          {...dragHandleProps}
          className="flex-shrink-0 mt-1 text-gray-200 dark:text-gray-700 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          ⠿
        </div>

        {/* 본문 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className={`font-medium text-sm truncate ${isSelected ? 'text-blue-700 dark:text-blue-200' : 'text-gray-900 dark:text-gray-100'}`}>
              {note.title}
            </span>
          </div>
          {previewMarkup && (
            <p
              className="search-preview text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1"
              dangerouslySetInnerHTML={{ __html: previewMarkup }}
            />
          )}
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-gray-300 dark:text-gray-600">{formatDate(note.updated_at)}</span>
            {note.tags && note.tags.length > 0 && (
              <div className="flex gap-0.5">
                {note.tags.slice(0, 3).map(tag => (
                  <span key={tag.id} className="text-xs px-1 rounded" style={{ backgroundColor: tag.color || '#e5e7eb', color: '#374151' }}>
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0 mt-0.5">
          {/* 폴더 이동 */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowFolderMenu((v) => !v) }}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs"
              title="폴더 이동"
            >
              📁
            </button>
            {showFolderMenu && (
              <FolderDropdown
                note={note}
                folders={folders}
                onMove={onMove}
                onClose={() => setShowFolderMenu(false)}
              />
            )}
          </div>

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true) }}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 text-xs"
              title="삭제"
            >
              🗑
            </button>
            {showDeleteConfirm && (
              <DeleteConfirmPopup
                onConfirm={() => { setShowDeleteConfirm(false); onDelete() }}
                onCancel={() => setShowDeleteConfirm(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 삭제 확인 팝업
function DeleteConfirmPopup({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      {/* 배경 클릭 시 취소 */}
      <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); onCancel() }} />
      <div
        className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded shadow-lg px-2 py-1.5 flex items-center gap-1.5 whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs text-gray-500 dark:text-gray-400">삭제?</span>
        <button
          onClick={onConfirm}
          className="w-5 h-5 flex items-center justify-center rounded bg-red-500 hover:bg-red-600 text-white text-xs font-bold"
          title="삭제 확인"
        >
          ✕
        </button>
      </div>
    </>
  )
}

// 폴더 이동 드롭다운
function FolderDropdown({ note, folders, onMove, onClose }: {
  note: Note; folders: Folder[]
  onMove: (id: string | null) => void; onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); onClose() }} />
    <div
      className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1 text-xs text-gray-400 font-medium border-b border-gray-100 dark:border-gray-700 mb-1">폴더 이동</div>
      <button
        onClick={() => { onMove(null); onClose() }}
        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 ${note.folder_id === null ? 'text-blue-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
      >
        <span>📋</span> 폴더 없음 {note.folder_id === null && '✓'}
      </button>
      {folders.map((f) => (
        <button
          key={f.id}
          onClick={() => { onMove(f.id); onClose() }}
          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 ${note.folder_id === f.id ? 'text-blue-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
        >
          <span>📁</span> <span className="truncate">{f.name}</span> {note.folder_id === f.id && '✓'}
        </button>
      ))}
    </div>
    </>
  )
}
