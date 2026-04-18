# Windows 메모 앱 명세서

> Electron 기반 데스크톱 메모 애플리케이션
> 개발 방식: Claude Code
> 작성일: 2026-04-18

---

## 1. 프로젝트 개요

### 1.1 목적
빠른 작성과 강력한 검색에 초점을 맞춘 Windows용 로컬 메모 앱. 클라우드 의존 없이 개인 PC에서 모든 데이터를 관리한다.

### 1.2 핵심 가치
- **즉시성**: 전역 단축키로 어디서든 3초 내 메모 작성 시작
- **소유권**: 모든 데이터는 로컬 저장, 사용자가 백업/이동 가능
- **가벼움**: 수천 개 메모에서도 검색 100ms 이내

### 1.3 타깃 사용자
- 개발자, 기획자, 연구자 등 하루 10개 이상 메모를 작성하는 지식 노동자
- Evernote·Notion의 무거움을 불편해하는 사용자
- 마크다운에 익숙한 사용자

---

## 2. 기술 스택

### 2.1 런타임 & 프레임워크
| 영역 | 기술 | 비고 |
|------|------|------|
| 데스크톱 런타임 | Electron (최신 LTS) | Windows 10/11 지원 |
| 프론트엔드 | React 18 + TypeScript 5 | 엄격 모드 |
| 빌드 | Vite | electron-vite 템플릿 사용 |
| 패키징 | electron-builder | NSIS 인스톨러 |

### 2.2 UI & 상태
| 영역 | 기술 | 선택 이유 |
|------|------|----------|
| 스타일 | Tailwind CSS | 빠른 프로토타이핑 |
| 컴포넌트 | shadcn/ui (선택적) | 일관된 디자인 |
| 상태 관리 | Zustand | 보일러플레이트 최소 |
| 비동기 상태 | TanStack Query | IPC 캐싱/리페치 |
| 에디터 | TipTap | 마크다운+리치 혼용 가능 |

### 2.3 데이터
| 영역 | 기술 | 비고 |
|------|------|------|
| DB | SQLite (better-sqlite3) | 동기 API, 빠름 |
| 전문 검색 | SQLite FTS5 | 한국어 토크나이저 적용 |
| ORM | Drizzle ORM (선택) | 타입 안전 쿼리 |

### 2.4 개발 도구
- ESLint + Prettier
- Vitest (단위 테스트)
- Playwright (E2E, 선택적)

---

## 3. 프로젝트 구조

```
memo-app/
├── electron/
│   ├── main/
│   │   ├── index.ts              # 메인 엔트리
│   │   ├── window.ts             # BrowserWindow 관리
│   │   ├── tray.ts               # 트레이 아이콘
│   │   ├── shortcuts.ts          # 전역 단축키
│   │   └── ipc/
│   │       ├── notes.ts          # 메모 CRUD 핸들러
│   │       ├── search.ts         # 검색 핸들러
│   │       ├── tags.ts           # 태그 핸들러
│   │       └── export.ts         # 내보내기 핸들러
│   ├── preload/
│   │   └── index.ts              # contextBridge API
│   └── db/
│       ├── client.ts             # SQLite 커넥션
│       ├── schema.ts             # 스키마 정의
│       └── migrations/           # 마이그레이션
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── NoteList.tsx
│   │   │   └── EditorPane.tsx
│   │   ├── editor/
│   │   │   ├── Editor.tsx
│   │   │   └── Toolbar.tsx
│   │   ├── search/
│   │   │   └── SearchBar.tsx
│   │   └── ui/                   # shadcn 컴포넌트
│   ├── hooks/
│   │   ├── useNotes.ts
│   │   └── useShortcuts.ts
│   ├── store/
│   │   ├── uiStore.ts            # UI 상태 (Zustand)
│   │   └── editorStore.ts        # 현재 편집 중인 메모
│   ├── lib/
│   │   ├── api.ts                # window.api 래퍼
│   │   └── markdown.ts
│   └── types/
│       └── note.ts
├── resources/
│   ├── icon.ico
│   └── tray-icon.png
├── electron.vite.config.ts
├── package.json
└── tsconfig.json
```

---

## 4. 데이터 모델

### 4.1 notes 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT (UUID) | PK |
| title | TEXT | 제목 (본문 첫 줄 자동 추출 or 사용자 지정) |
| content | TEXT | 마크다운 본문 |
| content_html | TEXT | 렌더링된 HTML 캐시 (선택) |
| folder_id | TEXT NULL | 폴더 FK |
| is_pinned | INTEGER | 고정 여부 (0/1) |
| is_archived | INTEGER | 보관 여부 (0/1) |
| created_at | INTEGER | Unix ms |
| updated_at | INTEGER | Unix ms |

### 4.2 folders 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT | PK |
| name | TEXT | 폴더명 |
| parent_id | TEXT NULL | 상위 폴더 |
| sort_order | INTEGER | 정렬 순서 |

### 4.3 tags 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT | PK |
| name | TEXT UNIQUE | 태그명 |
| color | TEXT NULL | 색상 (hex) |

### 4.4 note_tags 테이블 (N:N)
| 컬럼 | 타입 |
|------|------|
| note_id | TEXT |
| tag_id | TEXT |

### 4.5 notes_fts (FTS5 가상 테이블)
전문 검색용. `title`, `content` 컬럼을 인덱싱. `notes` 테이블과 트리거로 동기화.

---

## 5. 기능 명세

### 5.1 MVP (Phase 1)

#### 5.1.1 메모 CRUD
- **생성**: 사이드바의 "새 메모" 버튼 or `Ctrl+N`
- **편집**: 리스트에서 선택 → 우측 에디터에서 즉시 편집
- **자동 저장**: 입력 후 500ms 디바운스 → DB 저장
- **삭제**: 우클릭 메뉴 or `Delete` 키 → 확인 다이얼로그

#### 5.1.2 레이아웃 (3-pane)
```
┌─────────┬──────────────┬──────────────────────┐
│ Sidebar │  NoteList    │      Editor          │
│         │              │                      │
│ 폴더    │  메모 목록   │   선택된 메모 편집    │
│ 태그    │  (최근순)    │                      │
│         │              │                      │
└─────────┴──────────────┴──────────────────────┘
```
- 각 패널 폭은 드래그로 조절 가능
- 설정값은 로컬 저장 (next launch 시 복원)

#### 5.1.3 제목 자동 추출
- 본문 첫 줄을 제목으로 사용
- `# 제목` 형식의 마크다운 H1이 있으면 우선 사용
- 빈 메모는 "제목 없음"으로 표시

#### 5.1.4 목록 뷰
- 각 항목: 제목, 본문 미리보기 2줄, 수정일
- 정렬: 수정일 내림차순 (기본) / 생성일 / 제목
- 고정된 메모는 최상단에 별도 표시

---

### 5.2 Phase 2

#### 5.2.1 전역 단축키
| 기능 | 단축키 | 동작 |
|------|--------|------|
| 빠른 메모 | `Ctrl+Shift+N` | 작은 팝업 창 → 입력 → `Ctrl+Enter`로 저장 |
| 앱 토글 | `Ctrl+Shift+M` | 앱 창 show/hide |
| 검색 포커스 | `Ctrl+F` (앱 내) | 검색창 포커스 |

#### 5.2.2 트레이
- 시스템 트레이에 아이콘 상주
- 좌클릭: 앱 창 토글
- 우클릭: 컨텍스트 메뉴 (새 메모, 종료)
- 창 닫기 버튼은 기본적으로 트레이로 최소화

#### 5.2.3 검색
- 상단 검색 바 (`Ctrl+F`)
- FTS5 기반, 제목·본문 동시 검색
- 결과는 NoteList를 필터링하여 표시
- 검색어 하이라이트

#### 5.2.4 폴더/태그
- 사이드바에서 폴더 생성·이동·삭제
- 메모에 태그 추가 (해시태그 `#tag` 자동 인식 or UI)
- 태그 클릭 시 해당 태그 메모 필터링

---

### 5.3 Phase 3

#### 5.3.1 에디터 강화
- 마크다운 라이브 프리뷰 (토글)
- 코드 블록 신택스 하이라이트
- 이미지 붙여넣기 → 로컬 저장 → 링크 삽입
- 체크리스트 (`- [ ]`)

#### 5.3.2 테마
- 라이트 / 다크 / 시스템 따름
- 시스템 테마 변경 자동 감지

#### 5.3.3 내보내기 / 가져오기
- 단일 메모: Markdown, HTML, PDF
- 전체: ZIP (Markdown 파일들)
- 가져오기: Markdown 파일, Evernote ENEX (Phase 4 이후)

#### 5.3.4 백업
- 수동 백업: 전체 DB + 첨부 파일을 ZIP으로
- 자동 백업: 설정된 폴더에 주기적 저장

---

## 6. IPC 인터페이스

### 6.1 원칙
- `contextIsolation: true`, `nodeIntegration: false`
- 모든 Node/Electron API는 preload에서 `contextBridge.exposeInMainWorld`로만 노출
- 타입은 `src/types/`에 공유 정의

### 6.2 API 구조 (preload)
```typescript
window.api = {
  notes: {
    list(filter?: NoteFilter): Promise<Note[]>
    get(id: string): Promise<Note | null>
    create(input: CreateNoteInput): Promise<Note>
    update(id: string, patch: UpdateNoteInput): Promise<Note>
    delete(id: string): Promise<void>
    pin(id: string, pinned: boolean): Promise<void>
  },
  search: {
    query(keyword: string, options?: SearchOptions): Promise<SearchResult[]>
  },
  tags: {
    list(): Promise<Tag[]>
    create(name: string): Promise<Tag>
    delete(id: string): Promise<void>
    assignToNote(noteId: string, tagIds: string[]): Promise<void>
  },
  folders: {
    list(): Promise<Folder[]>
    create(input: CreateFolderInput): Promise<Folder>
    rename(id: string, name: string): Promise<void>
    delete(id: string): Promise<void>
  },
  export: {
    toMarkdown(noteId: string): Promise<string>
    toPdf(noteId: string): Promise<string>  // 저장 경로 반환
    backupAll(): Promise<string>
  },
  app: {
    getVersion(): Promise<string>
    openExternal(url: string): Promise<void>
  }
}
```

---

## 7. 비기능 요구사항

### 7.1 성능
- 앱 초기 로딩: 2초 이내
- 메모 전환: 100ms 이내 (1000개 메모 기준)
- 검색 응답: 200ms 이내 (5000개 메모 기준)
- 메모리 사용: 유휴 시 200MB 이하

### 7.2 보안
- SQL Injection 방지: 모든 쿼리는 prepared statement 사용
- XSS 방지: 마크다운 렌더링 시 DOMPurify 적용
- 렌더러 프로세스는 Node 접근 불가 (contextIsolation)

### 7.3 플랫폼
- 1차: Windows 10 / 11 (x64)
- 2차 (차기 마일스톤): macOS, Linux

### 7.4 접근성
- 모든 주요 기능 키보드 조작 가능
- 포커스 인디케이터 명확히 표시
- ARIA 속성 적절히 사용

---

## 8. 개발 마일스톤

| Phase | 기간 목표 | 주요 산출물 |
|-------|----------|-----------|
| 0. 스캐폴드 | 1일 | electron-vite 초기 세팅, TS/ESLint 구성 |
| 1. MVP | 1주 | CRUD, 3-pane 레이아웃, 자동 저장 |
| 2. 핵심 기능 | 1주 | 검색, 폴더/태그, 트레이, 전역 단축키 |
| 3. 품질 향상 | 1주 | 에디터 강화, 테마, 내보내기/백업 |
| 4. 패키징 | 2일 | electron-builder 설정, 인스톨러, 자동 업데이트 |

---

## 9. Claude Code 개발 가이드

### 9.1 작업 분할 원칙
Claude Code에 한 번에 너무 많은 범위를 맡기지 말고, 다음 단위로 요청한다.

1. **스캐폴드**: 프로젝트 초기화 + 기본 구성
2. **DB 레이어**: 스키마, 마이그레이션, 쿼리 함수
3. **IPC 레이어**: main의 핸들러, preload 브릿지, 타입 공유
4. **UI 컴포넌트**: 레이아웃 → 개별 컴포넌트
5. **통합**: UI에서 IPC 호출 연결
6. **기능 단위 추가**: 검색 → 태그 → 트레이 순

### 9.2 각 단계별 프롬프트 예시

**스캐폴드**
```
electron-vite로 memo-app 프로젝트를 만들어줘.
React + TypeScript + Tailwind CSS + Zustand 구성.
ESLint와 Prettier도 설정. package.json의 스크립트는
dev, build, package로 정리.
```

**DB 레이어**
```
electron/db에 better-sqlite3 기반 DB 모듈 작성.
schema.ts에 notes, folders, tags, note_tags 테이블 정의.
FTS5 가상 테이블 notes_fts도 만들고 트리거로 동기화.
client.ts에서 앱 userData 경로에 DB 파일 생성하고
마이그레이션 실행.
```

**IPC 레이어**
```
electron/main/ipc/notes.ts에 메모 CRUD 핸들러 작성.
채널명은 notes:list, notes:create 등.
preload에서 window.api.notes로 노출.
타입은 src/types/note.ts에 정의하고 양쪽에서 공유.
```

이후 UI 구현, 기능 추가로 단계적으로 진행.

### 9.3 주의사항
- Claude Code가 `nodeIntegration: true`로 설정하려 하면 반드시 제지
- 동기 SQLite 호출은 렌더러에서 직접 하지 않고 항상 IPC 경유
- 마이그레이션은 버전 관리 철저히 (데이터 손실 방지)
- 빌드 전 반드시 `npm run typecheck` 통과 확인

---

## 10. 오픈 이슈

개발 시작 전 결정이 필요한 항목:

- [ ] 에디터를 TipTap으로 할지 CodeMirror로 할지 (마크다운 순수 텍스트 vs WYSIWYG)
- [ ] shadcn/ui를 도입할지 Tailwind만 사용할지
- [ ] 자동 업데이트 서버를 어디에 둘지 (GitHub Releases / 자체 서버)
- [ ] 암호화 저장 옵션을 MVP에 포함할지 (SQLCipher)
- [ ] 다중 창 지원 여부 (여러 메모를 별도 창으로 띄우기)

---

## 부록 A. 참고 자료

- electron-vite: https://electron-vite.org
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- SQLite FTS5: https://www.sqlite.org/fts5.html
- TipTap: https://tiptap.dev
- electron-builder: https://www.electron.build
