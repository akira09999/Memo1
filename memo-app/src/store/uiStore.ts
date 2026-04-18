import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  sidebarWidth: number
  noteListWidth: number
  selectedFolderId: string | null
  selectedTagId: string | null
  searchQuery: string
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
  setSearchQuery: (q: string) => void
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
      searchQuery: '',
      pendingSearchMatch: null,
      theme: 'system',
      setSidebarWidth: (w) => set({ sidebarWidth: w }),
      setNoteListWidth: (w) => set({ noteListWidth: w }),
      setSelectedFolderId: (id) => set({ selectedFolderId: id, selectedTagId: null, searchQuery: '', pendingSearchMatch: null }),
      setSelectedTagId: (id) => set({ selectedTagId: id, selectedFolderId: null, searchQuery: '', pendingSearchMatch: null }),
      setSearchQuery: (q) => set(q.trim() ? { searchQuery: q } : { searchQuery: q, pendingSearchMatch: null }),
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
