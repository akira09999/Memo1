import { api } from '../../lib/api'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useI18n } from '../../hooks/useI18n'
import Editor from '../editor/Editor'

export default function EditorPane() {
  const { selectedNote, isDirty } = useEditorStore()
  const { t } = useI18n()
  const { fontSize, updateSetting } = useSettingsStore()

  const formatHeaderDate = (ts: number) =>
    new Date(ts).toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

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
      <div className="flex items-start gap-3 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
              {selectedNote.title}
            </span>
            <div className="flex shrink-0 items-center gap-x-2 text-[11px] text-gray-400">
              <span>{t('editor.updated')} {formatHeaderDate(selectedNote.updated_at)}</span>
              <span>{t('editor.created')} {formatHeaderDate(selectedNote.created_at)}</span>
              {isDirty && <span>{t('editor.saving')}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 pt-0.5 text-xs text-gray-400">
          <button
            onClick={() => changeFontSize(-1)}
            disabled={fontSize <= 10}
            className="rounded px-1.5 py-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
            title="글자 크기 줄이기"
          >
            -
          </button>
          <span className="w-6 text-center">{fontSize}</span>
          <button
            onClick={() => changeFontSize(1)}
            disabled={fontSize >= 24}
            className="rounded px-1.5 py-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
            title="글자 크기 키우기"
          >
            +
          </button>
        </div>
        <button
          onClick={exportMarkdown}
          className="mt-0.5 rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
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
