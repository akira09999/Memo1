import { create } from 'zustand'
import type { Note } from '../types/note'

interface EditorState {
  selectedNoteId: string | null
  selectedNote: Note | null
  isDirty: boolean
  setSelectedNote: (note: Note | null) => void
  setSelectedNoteId: (id: string | null) => void
  setIsDirty: (dirty: boolean) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  selectedNoteId: null,
  selectedNote: null,
  isDirty: false,
  setSelectedNote: (note) => set({ selectedNote: note, selectedNoteId: note?.id ?? null, isDirty: false }),
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),
  setIsDirty: (dirty) => set({ isDirty: dirty })
}))
