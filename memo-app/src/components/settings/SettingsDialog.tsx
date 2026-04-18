import { useState, useCallback, useEffect } from 'react'
import { useSettingsStore } from '../../store/settingsStore'
import type { Settings } from '../../store/settingsStore'
import { api } from '../../lib/api'

// 카테고리 정의
const CATEGORIES = [
  { id: 'general',  label: '일반',   icon: '⚙️' },
  { id: 'editor',   label: '에디터', icon: '✏️' },
  { id: 'data',     label: '데이터', icon: '💾' },
  { id: 'shortcuts',label: '단축키', icon: '⌨️' },
] as const

type CategoryId = typeof CATEGORIES[number]['id']

export default function SettingsDialog() {
  const { isOpen, closeSettings, updateSetting, ...settings } = useSettingsStore()
  const [activeCategory, setActiveCategory] = useState<CategoryId>('general')

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeSettings()
  }, [closeSettings])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) closeSettings() }}
      onKeyDown={handleKey}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[640px] max-h-[80vh] flex overflow-hidden">
        {/* 왼쪽: 카테고리 목록 */}
        <aside className="w-40 bg-gray-50 dark:bg-gray-900 flex flex-col py-4 flex-shrink-0">
          <div className="px-4 pb-3 text-sm font-semibold text-gray-500 dark:text-gray-400 tracking-wide">
            설정
          </div>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${
                activeCategory === cat.id
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium border-r-2 border-blue-500'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span className="text-base">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </aside>

        {/* 오른쪽: 옵션 패널 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">
              {CATEGORIES.find((c) => c.id === activeCategory)?.label}
            </h2>
            <button
              onClick={closeSettings}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ✕
            </button>
          </div>

          {/* 옵션 목록 */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
            {activeCategory === 'general'  && <GeneralOptions  settings={settings} update={updateSetting} />}
            {activeCategory === 'editor'   && <EditorOptions   settings={settings} update={updateSetting} />}
            {activeCategory === 'data'     && <DataOptions     settings={settings} update={updateSetting} />}
            {activeCategory === 'shortcuts' && <ShortcutsPanel />}
          </div>
        </main>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 옵션 공통 컴포넌트
// ─────────────────────────────────────────────

interface OptionRowProps {
  label: string
  description?: string
  children: React.ReactNode
}

function OptionRow({ label, description, children }: OptionRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</div>
        {description && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative flex-shrink-0 w-10 h-[22px] rounded-full transition-colors ${
        value ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className="absolute top-[3px] w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
        style={{ left: value ? '22px' : '3px' }}
      />
    </button>
  )
}

function Select<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1.5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function NumberInput({
  value,
  min,
  max,
  step,
  unit,
  onChange
}: {
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1.5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      {unit && <span className="text-xs text-gray-400">{unit}</span>}
    </div>
  )
}

// ─────────────────────────────────────────────
// 카테고리별 옵션 패널
// ─────────────────────────────────────────────

type UpdateFn = <K extends keyof Settings>(key: K, value: Settings[K]) => void

function GeneralOptions({ settings, update }: { settings: Settings; update: UpdateFn }) {
  const [loginItem, setLoginItem] = useState(false)

  useEffect(() => {
    window.api.app.getLoginItem().then(setLoginItem)
  }, [])

  const handleLoginItem = (v: boolean) => {
    setLoginItem(v)
    window.api.app.setLoginItem(v)
  }

  return (
    <>
      <SectionTitle>외관</SectionTitle>
      <OptionRow label="테마" description="앱 전체의 색상 테마를 설정합니다.">
        <Select
          value={settings.theme}
          options={[
            { value: 'light',    label: '☀️ 라이트' },
            { value: 'dark',     label: '🌙 다크' },
            { value: 'sepia',    label: '📜 세피아' },
            { value: 'midnight', label: '🌌 미드나잇' },
            { value: 'forest',   label: '🌲 포레스트' },
            { value: 'rose',     label: '🌸 로즈' },
          ]}
          onChange={(v) => update('theme', v)}
        />
      </OptionRow>

      <SectionTitle className="mt-4">동작</SectionTitle>
      <OptionRow
        label="윈도우 시작 시 자동 실행"
        description="Windows 로그인 시 앱을 자동으로 실행합니다."
      >
        <Toggle value={loginItem} onChange={handleLoginItem} />
      </OptionRow>
      <OptionRow
        label="시작 시 최소화"
        description="앱 시작 시 창을 트레이로 최소화합니다."
      >
        <Toggle value={settings.startMinimized} onChange={(v) => update('startMinimized', v)} />
      </OptionRow>
      <OptionRow
        label="닫기 버튼 → 트레이"
        description="창 닫기 버튼을 누르면 종료하지 않고 트레이로 최소화합니다."
      >
        <Toggle value={settings.closeToTray} onChange={(v) => update('closeToTray', v)} />
      </OptionRow>
    </>
  )
}

function EditorOptions({ settings, update }: { settings: Settings; update: UpdateFn }) {
  return (
    <>
      <SectionTitle>편집</SectionTitle>
      <OptionRow label="글꼴 크기" description="에디터의 글꼴 크기(px)를 설정합니다.">
        <NumberInput
          value={settings.fontSize}
          min={10} max={24} step={1} unit="px"
          onChange={(v) => update('fontSize', v)}
        />
      </OptionRow>
      <OptionRow
        label="자동 저장 딜레이"
        description="입력 후 자동 저장까지 대기 시간입니다."
      >
        <NumberInput
          value={settings.autosaveDelay}
          min={100} max={5000} step={100} unit="ms"
          onChange={(v) => update('autosaveDelay', v)}
        />
      </OptionRow>

      <SectionTitle className="mt-4">보조 기능</SectionTitle>
      <OptionRow
        label="맞춤법 검사"
        description="브라우저 기본 맞춤법 검사를 사용합니다."
      >
        <Toggle value={settings.spellCheck} onChange={(v) => update('spellCheck', v)} />
      </OptionRow>
    </>
  )
}

function DataOptions({ settings, update }: { settings: Settings; update: UpdateFn }) {
  const handleBackup = async () => {
    const path = await api.export.backupAll()
    if (path) alert(`백업 완료: ${path}`)
  }

  return (
    <>
      <SectionTitle>백업</SectionTitle>
      <OptionRow
        label="자동 백업"
        description="설정된 간격으로 데이터베이스를 자동 백업합니다."
      >
        <Toggle value={settings.autoBackup} onChange={(v) => update('autoBackup', v)} />
      </OptionRow>
      {settings.autoBackup && (
        <OptionRow
          label="백업 간격"
          description="자동 백업 실행 간격입니다."
        >
          <Select
            value={String(settings.autoBackupInterval) as any}
            options={[
              { value: '1',  label: '1시간' },
              { value: '6',  label: '6시간' },
              { value: '12', label: '12시간' },
              { value: '24', label: '24시간 (매일)' },
            ]}
            onChange={(v) => update('autoBackupInterval', Number(v))}
          />
        </OptionRow>
      )}

      <SectionTitle className="mt-4">수동 백업</SectionTitle>
      <div className="py-3">
        <button
          onClick={handleBackup}
          className="w-full text-sm py-2 px-4 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-medium transition-colors"
        >
          💾 지금 백업하기
        </button>
        <p className="text-xs text-gray-400 mt-2 text-center">
          전체 데이터베이스를 SQLite 파일로 저장합니다.
        </p>
      </div>
    </>
  )
}

function ShortcutsPanel() {
  const shortcuts = [
    { keys: ['Ctrl', 'N'],          desc: '새 메모 생성' },
    { keys: ['Ctrl', 'F'],          desc: '검색창 포커스' },
    { keys: ['Ctrl', ','],          desc: '설정 열기' },
    { keys: ['Ctrl', 'Shift', 'M'], desc: '앱 창 show/hide 토글 (전역)' },
    { keys: ['Ctrl', 'Shift', 'N'], desc: '빠른 새 메모 (전역)' },
    { keys: ['Esc'],                desc: '설정 닫기' },
  ]

  return (
    <>
      <SectionTitle>키보드 단축키</SectionTitle>
      <div className="space-y-1 mt-1">
        {shortcuts.map((s, i) => (
          <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <span className="text-sm text-gray-700 dark:text-gray-300">{s.desc}</span>
            <div className="flex items-center gap-1">
              {s.keys.map((k, ki) => (
                <span key={ki} className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600 shadow-sm">
                    {k}
                  </kbd>
                  {ki < s.keys.length - 1 && <span className="text-gray-300 text-xs">+</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pb-1 ${className}`}>
      {children}
    </div>
  )
}
