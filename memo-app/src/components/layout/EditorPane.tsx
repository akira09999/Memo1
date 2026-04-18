import { useEditorStore } from '../../store/editorStore'
import Editor from '../editor/Editor'
import { api } from '../../lib/api'

export default function EditorPane() {
  const { selectedNote, isDirty } = useEditorStore()

  const exportMarkdown = async () => {
    if (!selectedNote) return
    await api.export.toMarkdown(selectedNote.id)
  }

  if (!selectedNote) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-sm">메모를 선택하거나 새 메모를 만드세요.</p>
          <p className="text-xs mt-1 text-gray-300">Ctrl+N으로 새 메모 생성</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 상단 도구 모음 */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <span className="font-semibold text-gray-800 dark:text-gray-100 truncate flex-1 text-sm">
          {selectedNote.title}
        </span>
        {isDirty && <span className="text-xs text-gray-400">저장 중...</span>}

        {/* 도구 버튼들 */}
        <button
          onClick={exportMarkdown}
          className="text-xs px-2 py-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Markdown으로 내보내기"
        >
          ↓MD
        </button>
      </div>

      {/* 에디터 */}
      <div className="flex-1 overflow-hidden">
        <Editor note={selectedNote} />
      </div>
    </div>
  )
}
