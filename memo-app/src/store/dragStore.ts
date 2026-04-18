import { create } from 'zustand'
import type { Note } from '../types/note'

interface DragStore {
  draggingNote: Note | null
  setDraggingNote: (note: Note | null) => void
}

export const useDragStore = create<DragStore>((set) => ({
  draggingNote: null,
  setDraggingNote: (note) => set({ draggingNote: note })
}))
