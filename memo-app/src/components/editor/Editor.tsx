import { useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useI18n } from '../../hooks/useI18n'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useUiStore } from '../../store/uiStore'
import type { Note } from '../../types/note'

const TEXT_BLOCK_SEPARATOR = '\n\n'
const searchHighlightPluginKey = new PluginKey('searchHighlight')

type SearchHighlightState = {
  query: string
  activeIndex: number | null
}

function scrollSelectionIntoView(editor: TiptapEditor, from: number, to: number) {
  editor.commands.setTextSelection({ from, to })
  const domInfo = editor.view.domAtPos(from)
  const el = domInfo.node instanceof HTMLElement ? domInfo.node : domInfo.node.parentElement
  el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

function scrollToTextOffset(editor: TiptapEditor, index: number, length: number) {
  const { doc } = editor.state
  let found = false

  doc.descendants((node, pos) => {
    if (found || !node.isText || !node.text) return !found

    const start = doc.textBetween(0, pos, TEXT_BLOCK_SEPARATOR, TEXT_BLOCK_SEPARATOR).length
    const end = start + node.text.length

    if (index >= start && index <= end) {
      const from = pos + (index - start)
      const to = Math.min(from + Math.max(length, 1), pos + node.text.length)
      scrollSelectionIntoView(editor, from, to)
      found = true
      return false
    }

    return true
  })
}

function scrollToSearchQuery(editor: TiptapEditor, query: string) {
  if (!query.trim()) return

  const q = query.toLowerCase()
  const { doc } = editor.state
  let found = false

  doc.descendants((node, pos) => {
    if (found || !node.isText || !node.text) return !found

    const idx = node.text.toLowerCase().indexOf(q)
    if (idx !== -1) {
      const from = pos + idx
      const to = from + query.length
      scrollSelectionIntoView(editor, from, to)
      found = true
      return false
    }

    return true
  })
}

function buildSearchDecorations(doc: TiptapEditor['state']['doc'], query: string, activeIndex: number | null) {
  if (!query.trim()) return DecorationSet.empty

  const q = query.toLowerCase()
  const decorations: Decoration[] = []

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true

    const lowerText = node.text.toLowerCase()
    const startOffset = doc.textBetween(0, pos, TEXT_BLOCK_SEPARATOR, TEXT_BLOCK_SEPARATOR).length
    let searchFrom = 0

    while (searchFrom < lowerText.length) {
      const idx = lowerText.indexOf(q, searchFrom)
      if (idx === -1) break

      const from = pos + idx
      const to = from + query.length
      const matchIndex = startOffset + idx
      const className = matchIndex === activeIndex ? 'search-highlight search-highlight-current' : 'search-highlight'

      decorations.push(Decoration.inline(from, to, { class: className }))
      searchFrom = idx + Math.max(query.length, 1)
    }

    return true
  })

  return DecorationSet.create(doc, decorations)
}

const SearchHighlightExtension = Extension.create({
  name: 'searchHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin<SearchHighlightState>({
        key: searchHighlightPluginKey,
        state: {
          init: () => ({ query: '', activeIndex: null }),
          apply(tr, value) {
            const meta = tr.getMeta(searchHighlightPluginKey) as Partial<SearchHighlightState> | undefined
            if (!meta) return value

            return {
              query: meta.query ?? value.query,
              activeIndex: meta.activeIndex ?? null
            }
          }
        },
        props: {
          decorations(state) {
            const pluginState = searchHighlightPluginKey.getState(state) as SearchHighlightState | undefined
            return buildSearchDecorations(state.doc, pluginState?.query ?? '', pluginState?.activeIndex ?? null)
          }
        }
      })
    ]
  }
})

interface EditorProps {
  note: Note
}

export default function Editor({ note }: EditorProps) {
  const qc = useQueryClient()
  const { t } = useI18n()
  const { setIsDirty, setSelectedNote } = useEditorStore()
  const { fontSize, autosaveDelay, spellCheck } = useSettingsStore()
  const { searchQuery, pendingSearchMatch, clearPendingSearchMatch } = useUiStore()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentNoteId = useRef(note.id)
  const autosaveDelayRef = useRef(autosaveDelay)

  useEffect(() => {
    autosaveDelayRef.current = autosaveDelay
  }, [autosaveDelay])

  const updateNote = useMutation({
    mutationFn: ({ content, content_html }: { content: string; content_html: string }) =>
      api.notes.update(note.id, { content, content_html }),
    onSuccess: (updatedNote) => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      setSelectedNote(updatedNote)
    }
  })

  const scheduleAutosave = useCallback((content: string, content_html: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setIsDirty(true)
    saveTimer.current = setTimeout(() => {
      updateNote.mutate({ content, content_html })
    }, autosaveDelayRef.current)
  }, [setIsDirty, updateNote])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: t('editor.placeholder') }),
      SearchHighlightExtension
    ],
    content: note.content_html || note.content,
    onUpdate: ({ editor: currentEditor }) => {
      scheduleAutosave(currentEditor.getText(), currentEditor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-full p-6 leading-relaxed',
        spellcheck: String(spellCheck)
      }
    }
  }, [spellCheck, t('editor.placeholder')])

  useEffect(() => {
    if (!editor) return

    const activeIndex = pendingSearchMatch?.noteId === note.id ? pendingSearchMatch.index : null
    editor.view.dispatch(
      editor.state.tr.setMeta(searchHighlightPluginKey, {
        query: searchQuery.trim(),
        activeIndex
      })
    )
  }, [editor, note.id, pendingSearchMatch, searchQuery])

  useEffect(() => {
    if (!editor) return

    if (note.id !== currentNoteId.current) {
      currentNoteId.current = note.id
      editor.commands.setContent(note.content_html || note.content || '', false)
      setIsDirty(false)
    }

    const runScroll = () => {
      if (pendingSearchMatch?.noteId === note.id) {
        scrollToTextOffset(editor, pendingSearchMatch.index, pendingSearchMatch.length)
        clearPendingSearchMatch()
        return
      }

      if (searchQuery.trim()) {
        scrollToSearchQuery(editor, searchQuery)
      }
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(runScroll)
    })
  }, [
    clearPendingSearchMatch,
    editor,
    note.content,
    note.content_html,
    note.id,
    pendingSearchMatch,
    searchQuery,
    setIsDirty
  ])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  return (
    <div className="h-full overflow-y-auto" style={{ fontSize: `${fontSize}px` }}>
      <EditorContent editor={editor} className="h-full" />
    </div>
  )
}
