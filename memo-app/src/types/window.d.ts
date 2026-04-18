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
} from './note'

declare global {
  interface Window {
    api: {
      notes: {
        list(filter?: NoteFilter): Promise<Note[]>
        get(id: string): Promise<Note | null>
        create(input: CreateNoteInput): Promise<Note>
        update(id: string, patch: UpdateNoteInput): Promise<Note>
        delete(id: string): Promise<void>
        pin(id: string, pinned: boolean): Promise<void>
        reorder(ids: string[]): Promise<void>
      }
      search: {
        query(keyword: string, options?: SearchOptions): Promise<SearchResult[]>
      }
      tags: {
        list(): Promise<Tag[]>
        create(name: string, color?: string): Promise<Tag>
        delete(id: string): Promise<void>
        assignToNote(noteId: string, tagIds: string[]): Promise<void>
      }
      folders: {
        list(): Promise<Folder[]>
        create(input: CreateFolderInput): Promise<Folder>
        rename(id: string, name: string): Promise<void>
        delete(id: string): Promise<void>
      }
      export: {
        toMarkdown(noteId: string): Promise<string | null>
        backupAll(): Promise<string | null>
      }
      app: {
        getVersion(): Promise<string>
        openExternal(url: string): Promise<void>
        getLoginItem(): Promise<boolean>
        setLoginItem(enable: boolean): Promise<void>
      }
    }
  }
}
