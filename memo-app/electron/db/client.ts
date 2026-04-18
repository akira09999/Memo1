import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { applySchema } from './schema'

let db: Database.Database | null = null

export function initDb(): void {
  const dbPath = join(app.getPath('userData'), 'memo-app.db')
  db = new Database(dbPath)

  // WAL 모드로 읽기 성능 향상
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  applySchema(db)
}

export function getDb(): Database.Database {
  if (!db) throw new Error('DB가 초기화되지 않았습니다.')
  return db
}
