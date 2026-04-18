import { api } from '../../lib/api'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useI18n } from '../../hooks/useI18n'
import Editor from '../editor/Editor'

export default function EditorPane() {
  const { selectedNote, isDirty } = useEditorStore()
  const { t } = useI18n()
  const { fontSize, updateSetting } = useSettingsStore()

  const changeFontSize = (delta: number) => {
    const next = Math.min(24, Math.max(10, fontSize + delta))
    updateSetting('fontSize', next)
  }

  const exportMarkdown = async () => {
    if (!selectedNote) return
    await api.export.toMarkdown(selectedNote.id)
  }

  if (!selectedNote) {
    return (
      <div className="flex h-full items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center text-gray-400">
          <div className="mb-3 text-4xl">🗒</div>
          <p className="text-sm">{t('editor.emptyTitle')}</p>
          <p className="mt-1 text-xs text-gray-300">{t('editor.emptyShortcut')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-900">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <span className="flex-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
          {selectedNote.title}
        </span>
        {isDirty && <span className="text-xs text-gray-400">{t('editor.saving')}</span>}
        <div className="flex items-center gap-1">
          <button
            onClick={() => changeFontSize(-1)}
            disabled={fontSize <= 10}
            className="rounded px-1.5 py-1 text-xs text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
            title="글자 크기 줄이기"
          >
            A-
          </button>
          <span className="w-7 text-center text-xs text-gray-400">{fontSize}</span>
          <button
            onClick={() => changeFontSize(1)}
            disabled={fontSize >= 24}
            className="rounded px-1.5 py-1 text-xs text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
            title="글자 크기 키우기"
          >
            A+
          </button>
        </div>
        <button
          onClick={exportMarkdown}
          className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          title={t('editor.exportMarkdown')}
        >
          MD
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <Editor note={selectedNote} />
      </div>
    </div>
  )
}
