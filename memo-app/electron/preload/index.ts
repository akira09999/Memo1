import { contextBridge, ipcRenderer } from 'electron'
import type {
  Note,
  Folder,
  Tag,
  NoteFilter,
  CreateNoteInput,
  UpdateNoteInput,
  CreateFolderInput,
  SearchResult,
  SearchOptions
} from '../../src/types/note'

contextBridge.exposeInMainWorld('api', {
  notes: {
    list: (filter?: NoteFilter): Promise<Note[]> =>
      ipcRenderer.invoke('notes:list', filter),
    get: (id: string): Promise<Note | null> =>
      ipcRenderer.invoke('notes:get', id),
    create: (input: CreateNoteInput): Promise<Note> =>
      ipcRenderer.invoke('notes:create', input),
    update: (id: string, patch: UpdateNoteInput): Promise<Note> =>
      ipcRenderer.invoke('notes:update', id, patch),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke('notes:delete', id),
    pin: (id: string, pinned: boolean): Promise<void> =>
      ipcRenderer.invoke('notes:pin', id, pinned),
    reorder: (ids: string[]): Promise<void> =>
      ipcRenderer.invoke('notes:reorder', ids)
  },
  search: {
    query: (keyword: string, options?: SearchOptions): Promise<SearchResult[]> =>
      ipcRenderer.invoke('search:query', keyword, options)
  },
  tags: {
    list: (): Promise<Tag[]> =>
      ipcRenderer.invoke('tags:list'),
    create: (name: string, color?: string): Promise<Tag> =>
      ipcRenderer.invoke('tags:create', name, color),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke('tags:delete', id),
    assignToNote: (noteId: string, tagIds: string[]): Promise<void> =>
      ipcRenderer.invoke('tags:assignToNote', noteId, tagIds)
  },
  folders: {
    list: (): Promise<Folder[]> =>
      ipcRenderer.invoke('folders:list'),
    create: (input: CreateFolderInput): Promise<Folder> =>
      ipcRenderer.invoke('folders:create', input),
    rename: (id: string, name: string): Promise<void> =>
      ipcRenderer.invoke('folders:rename', id, name),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke('folders:delete', id)
  },
  export: {
    toMarkdown: (noteId: string): Promise<string | null> =>
      ipcRenderer.invoke('export:toMarkdown', noteId),
    backupAll: (): Promise<string | null> =>
      ipcRenderer.invoke('export:backupAll')
  },
  app: {
    getVersion: (): Promise<string> =>
      ipcRenderer.invoke('app:version'),
    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke('app:openExternal', url),
    getLoginItem: (): Promise<boolean> =>
      ipcRenderer.invoke('app:getLoginItem'),
    setLoginItem: (enable: boolean): Promise<void> =>
      ipcRenderer.invoke('app:setLoginItem', enable),
    setLanguage: (language: string): Promise<void> =>
      ipcRenderer.invoke('app:setLanguage', language)
  }
})

export {}
