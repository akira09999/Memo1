import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  sidebarWidth: number
  noteListWidth: number
  selectedFolderId: string | null
  selectedTagId: string | null
  noteSort: 'updated_at' | 'created_at' | 'title' | 'manual'
  searchQuery: string
  noteScrollPositions: Record<string, number>
  pendingSearchMatch: {
    noteId: string
    index: number
    length: number
    requestId: number
  } | null
  theme: 'light' | 'dark'
  setSidebarWidth: (w: number) => void
  setNoteListWidth: (w: number) => void
  setSelectedFolderId: (id: string | null) => void
  setSelectedTagId: (id: string | null) => void
  setNoteSort: (sort: UiState['noteSort']) => void
  setSearchQuery: (q: string) => void
  setNoteScrollPosition: (noteId: string, scrollTop: number) => void
  setPendingSearchMatch: (match: { noteId: string; index: number; length: number } | null) => void
  clearPendingSearchMatch: () => void
  setTheme: (t: 'light' | 'dark') => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarWidth: 200,
      noteListWidth: 280,
      selectedFolderId: null,
      selectedTagId: null,
      noteSort: 'updated_at',
      searchQuery: '',
      noteScrollPositions: {},
      pendingSearchMatch: null,
      theme: 'system',
      setSidebarWidth: (w) => set({ sidebarWidth: w }),
      setNoteListWidth: (w) => set({ noteListWidth: w }),
      setSelectedFolderId: (id) => set({ selectedFolderId: id, selectedTagId: null, searchQuery: '', pendingSearchMatch: null }),
      setSelectedTagId: (id) => set({ selectedTagId: id, selectedFolderId: null, searchQuery: '', pendingSearchMatch: null }),
      setNoteSort: (sort) => set({ noteSort: sort }),
      setSearchQuery: (q) => set(q.trim() ? { searchQuery: q } : { searchQuery: q, pendingSearchMatch: null }),
      setNoteScrollPosition: (noteId, scrollTop) =>
        set((state) => ({
          noteScrollPositions: {
            ...state.noteScrollPositions,
            [noteId]: scrollTop
          }
        })),
      setPendingSearchMatch: (match) =>
        set({
          pendingSearchMatch: match
            ? { ...match, requestId: Date.now() }
            : null
        }),
      clearPendingSearchMatch: () => set({ pendingSearchMatch: null }),
      setTheme: (t) => set({ theme: t })
    }),
    { name: 'memo-ui-state' }
  )
)
