import { useEffect } from 'react'

interface Shortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  handler: (e: KeyboardEvent) => void
}

export function useShortcuts(shortcuts: Shortcut[]): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const sc of shortcuts) {
        const matchCtrl = sc.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey
        const matchShift = sc.shift ? e.shiftKey : !e.shiftKey
        const matchAlt = sc.alt ? e.altKey : !e.altKey
        if (e.key.toLowerCase() === sc.key.toLowerCase() && matchCtrl && matchShift && matchAlt) {
          e.preventDefault()
          sc.handler(e)
          break
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcuts])
}
