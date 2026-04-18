import Sidebar from './components/layout/Sidebar'
import NoteList from './components/layout/NoteList'
import EditorPane from './components/layout/EditorPane'
import SettingsDialog from './components/settings/SettingsDialog'
import { useUiStore } from './store/uiStore'
import { useSettingsStore } from './store/settingsStore'
import { useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './lib/api'
import { useEditorStore } from './store/editorStore'
import { useShortcuts } from './hooks/useShortcuts'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const { sidebarWidth, noteListWidth, selectedFolderId, setSidebarWidth, setNoteListWidth, setSearchQuery } = useUiStore()
  const { setSelectedNote } = useEditorStore()
  const { openSettings } = useSettingsStore()
  const qc = useQueryClient()

  // 테마 적용 (시스템 변경 감지 포함)
  useTheme()

  const isDraggingSidebar = useRef(false)
  const isDraggingNoteList = useRef(false)

  const createNote = useMutation({
    mutationFn: () => api.notes.create({ folder_id: selectedFolderId }),
    onSuccess: async (newNote) => {
      setSearchQuery('')
      await qc.invalidateQueries({ queryKey: ['notes'] })
      setSelectedNote(newNote)
    }
  })

  useShortcuts([
    { key: 'n', ctrl: true, handler: () => createNote.mutate() },
    { key: ',', ctrl: true, handler: () => openSettings() }
  ])

  const onSidebarDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingSidebar.current = true
    const onMove = (ev: MouseEvent) => {
      if (!isDraggingSidebar.current) return
      setSidebarWidth(Math.max(150, Math.min(400, ev.clientX)))
    }
    const onUp = () => {
      isDraggingSidebar.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [setSidebarWidth])

  const onNoteListDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingNoteList.current = true
    const onMove = (ev: MouseEvent) => {
      if (!isDraggingNoteList.current) return
      setNoteListWidth(Math.max(200, Math.min(500, ev.clientX - sidebarWidth)))
    }
    const onUp = () => {
      isDraggingNoteList.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [sidebarWidth, setNoteListWidth])

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 select-none">
      {/* 사이드바 */}
      <div style={{ width: sidebarWidth, minWidth: sidebarWidth }} className="flex-shrink-0 overflow-hidden">
        <Sidebar onOpenSettings={openSettings} />
      </div>

      <div
        className="w-1 cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 transition-colors"
        onMouseDown={onSidebarDragStart}
      />

      {/* 메모 목록 */}
      <div style={{ width: noteListWidth, minWidth: noteListWidth }} className="flex-shrink-0 overflow-hidden border-r border-gray-200 dark:border-gray-700">
        <NoteList />
      </div>

      <div
        className="w-1 cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 transition-colors"
        onMouseDown={onNoteListDragStart}
      />

      {/* 에디터 */}
      <div className="flex-1 overflow-hidden">
        <EditorPane />
      </div>

      {/* 설정 다이얼로그 (모달) */}
      <SettingsDialog />
    </div>
  )
}
