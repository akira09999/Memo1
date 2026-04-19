import { useCallback, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, PointerSensor, closestCenter, pointerWithin, useSensor, useSensors, type CollisionDetection, type DragEndEvent, DragOverlay, type DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '../../lib/api'
import { useI18n } from '../../hooks/useI18n'
import { useUiStore } from '../../store/uiStore'
import { useEditorStore } from '../../store/editorStore'
import { useDragStore } from '../../store/dragStore'
import type { Note, Tag } from '../../types/note'
import SearchBar from '../search/SearchBar'

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
  const { t, locale } = useI18n()
  const {
    selectedFolderId,
    selectedTagId,
    noteSort,
    searchQuery,
    setNoteSort,
    setSearchQuery,
    setPendingSearchMatch,
    clearPendingSearchMatch
  } = useUiStore()
  const { selectedNoteId, setSelectedNote } = useEditorStore()
  const { setDraggingNote } = useDragStore()
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [optimisticNotes, setOptimisticNotes] = useState<Note[] | null>(null)
  const sort = noteSort

  const formatDate = useCallback((ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    }
    const diff = now.getTime() - d.getTime()
    if (diff < 1000 * 60 * 60 * 24 * 7) {
      return d.toLocaleDateString(locale, { weekday: 'short', month: 'numeric', day: 'numeric' })
    }
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  }, [locale])

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

  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.tags.list()
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

  const reorderNotes = useMutation({
    mutationFn: (ids: string[]) => api.notes.reorder(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] })
  })

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const pointerHits = pointerWithin(args)
    if (pointerHits.length > 0) return pointerHits
    return closestCenter(args)
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const note = notes.find((entry) => entry.id === event.active.id)
    if (note) {
      setActiveNote(note)
      setDraggingNote(note)
    }
  }, [notes, setDraggingNote])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveNote(null)
    setDraggingNote(null)

    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = notes.findIndex((entry) => entry.id === active.id)
    const newIndex = notes.findIndex((entry) => entry.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(notes, oldIndex, newIndex)
    setOptimisticNotes(reordered)
    setNoteSort('manual')
    reorderNotes.mutate(reordered.map((entry) => entry.id))
  }, [notes, reorderNotes, setDraggingNote, setNoteSort])

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-900">
      <div className="space-y-2 border-b border-gray-200 p-2 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('noteList.count', { count: displayNotes.length })}</span>
            <select
              value={sort}
              onChange={(e) => { setNoteSort(e.target.value as SortKey); setOptimisticNotes(null) }}
              className="cursor-pointer border-none bg-transparent text-xs text-gray-500 outline-none"
            >
              <option value="updated_at">{t('noteList.sort.updated_at')}</option>
              <option value="created_at">{t('noteList.sort.created_at')}</option>
              <option value="title">{t('noteList.sort.title')}</option>
              <option value="manual">{t('noteList.sort.manual')}</option>
            </select>
          </div>
          <button
            onClick={() => createNote.mutate()}
            className="rounded px-2 py-1 text-xs font-medium text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900"
            title={t('noteList.newNoteTitle')}
          >
            + {t('noteList.newNote')}
          </button>
        </div>
        <SearchBar />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-gray-400">{t('noteList.loading')}</div>
        ) : displayNotes.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            {isSearching ? t('noteList.emptySearch') : t('noteList.emptyNotes')}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={displayNotes.map((note) => note.id)} strategy={verticalListSortingStrategy}>
              {displayNotes.map((note) => (
                <SortableNoteItem
                  key={note.id}
                  note={note}
                  allTags={allTags}
                  isSelected={selectedNoteId === note.id}
                  isDragging={activeNote?.id === note.id}
                  formatDate={formatDate}
                  onClick={() => handleSelectNote(note)}
                  onDelete={() => deleteNote.mutate(note.id)}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeNote && (
                <div className="max-w-xs rounded border border-blue-400 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 opacity-95 shadow-xl dark:bg-gray-800 dark:text-gray-100">
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

function SortableNoteItem(props: NoteItemProps & { isDragging: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.note.id
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1
      }}
    >
      <NoteItem {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  )
}

interface NoteItemProps {
  note: Note
  allTags: Tag[]
  isSelected: boolean
  formatDate: (ts: number) => string
  onClick: () => void
  onDelete: () => void
  dragHandleProps?: Record<string, unknown>
}

function NoteItem({ note, allTags, isSelected, formatDate, onClick, onDelete, dragHandleProps }: NoteItemProps) {
  const { t } = useI18n()
  const [showTagMenu, setShowTagMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const previewMarkup = getPreviewMarkup(note)

  return (
    <div
      className={`group cursor-pointer border-b border-gray-100 px-3 py-2.5 dark:border-gray-800 ${
        isSelected
          ? 'border-l-2 border-l-blue-500 bg-blue-50 dark:bg-blue-900/30'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-1">
        <div
          {...dragHandleProps}
          className="-ml-1 flex-shrink-0 self-center cursor-grab text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing dark:text-gray-600"
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="2.5" cy="2.5" r="1.5"/>
            <circle cx="7.5" cy="2.5" r="1.5"/>
            <circle cx="2.5" cy="7" r="1.5"/>
            <circle cx="7.5" cy="7" r="1.5"/>
            <circle cx="2.5" cy="11.5" r="1.5"/>
            <circle cx="7.5" cy="11.5" r="1.5"/>
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-200' : 'text-gray-900 dark:text-gray-100'}`}>
            {note.title}
          </span>
          {previewMarkup && (
            <p
              className="search-preview mt-0.5 line-clamp-1 text-xs text-gray-400 dark:text-gray-500"
              dangerouslySetInnerHTML={{ __html: previewMarkup }}
            />
          )}
          <div className="mt-0.5 flex items-center gap-1">
            <span className="text-xs text-gray-300 dark:text-gray-600">{formatDate(note.updated_at)}</span>
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-0.5">
                {note.tags.slice(0, 3).map((tag) => (
                  <span key={tag.id} className="rounded px-1 text-xs" style={{ backgroundColor: tag.color || '#e5e7eb', color: '#374151' }}>
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-0.5 hidden flex-shrink-0 items-center gap-0.5 group-hover:flex">
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowTagMenu((v) => !v) }}
              className="flex h-6 w-6 items-center justify-center rounded text-xs text-gray-300 hover:bg-gray-100 hover:text-blue-500 dark:hover:bg-gray-700"
              title={t('noteList.assignTag')}
            >
              #
            </button>
            {showTagMenu && (
              <TagDropdown note={note} allTags={allTags} onClose={() => setShowTagMenu(false)} />
            )}
          </div>

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true) }}
              className="flex h-6 w-6 items-center justify-center rounded text-xs text-gray-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
              title={t('noteList.delete')}
            >
              ✕
            </button>
            {showDeleteConfirm && (
              <DeleteConfirmPopup onConfirm={() => { setShowDeleteConfirm(false); onDelete() }} onCancel={() => setShowDeleteConfirm(false)} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TagDropdown({ note, allTags, onClose }: {
  note: Note
  allTags: Tag[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { t } = useI18n()
  const assignedIds = new Set(note.tags?.map((tag) => tag.id) ?? [])

  const assignTags = useMutation({
    mutationFn: (tagIds: string[]) => api.tags.assignToNote(note.id, tagIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] })
  })

  const toggle = (tagId: string) => {
    const next = assignedIds.has(tagId)
      ? [...assignedIds].filter((id) => id !== tagId)
      : [...assignedIds, tagId]
    assignTags.mutate(next)
  }

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); onClose() }} />
      <div
        className="absolute right-0 top-full z-20 mt-1 min-w-[150px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 border-b border-gray-100 px-3 py-1 text-xs font-medium text-gray-400 dark:border-gray-700">
          {t('noteList.assignTag')}
        </div>
        {allTags.length === 0 && (
          <div className="px-3 py-1.5 text-xs text-gray-400">{t('sidebar.noTags')}</div>
        )}
        {allTags.map((tag) => {
          const assigned = assignedIds.has(tag.id)
          return (
            <button
              key={tag.id}
              onClick={() => toggle(tag.id)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[9px] font-bold ${assigned ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                {assigned && '✓'}
              </span>
              <span style={tag.color ? { color: tag.color } : undefined}>#{tag.name}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function DeleteConfirmPopup({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const { t } = useI18n()

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); onCancel() }} />
      <div
        className="absolute right-0 top-full z-20 mt-1 flex items-center gap-1.5 whitespace-nowrap rounded border border-red-200 bg-white px-2 py-1.5 shadow-lg dark:border-red-700 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs text-gray-500 dark:text-gray-400">{t('noteList.deleteConfirm')}</span>
        <button
          onClick={onConfirm}
          className="flex h-5 w-5 items-center justify-center rounded bg-red-500 text-xs font-bold text-white hover:bg-red-600"
          title={t('noteList.delete')}
        >
          ✓
        </button>
      </div>
    </>
  )
}
