import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useI18n } from '../../hooks/useI18n'
import { useSettingsStore, type Settings } from '../../store/settingsStore'

const categories = [
  { id: 'general', icon: '⚙️' },
  { id: 'editor', icon: '✏️' },
  { id: 'data', icon: '💾' },
  { id: 'shortcuts', icon: '⌨️' }
] as const

type CategoryId = typeof categories[number]['id']
type UpdateFn = <K extends keyof Settings>(key: K, value: Settings[K]) => void

export default function SettingsDialog() {
  const { isOpen, closeSettings, updateSetting, ...settings } = useSettingsStore()
  const { t } = useI18n()
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
      <div className="flex max-h-[80vh] w-[680px] overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800">
        <aside className="w-44 flex-shrink-0 bg-gray-50 py-4 dark:bg-gray-900">
          <div className="px-4 pb-3 text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400">
            {t('settings.title')}
          </div>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                activeCategory === category.id
                  ? 'border-r-2 border-blue-500 bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <span className="text-base">{category.icon}</span>
              {t(`settings.category.${category.id}`)}
            </button>
          ))}
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">
              {t(`settings.category.${activeCategory}`)}
            </h2>
            <button
              onClick={closeSettings}
              className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              ×
            </button>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto px-6 py-4">
            {activeCategory === 'general' && <GeneralOptions settings={settings} update={updateSetting} />}
            {activeCategory === 'editor' && <EditorOptions settings={settings} update={updateSetting} />}
            {activeCategory === 'data' && <DataOptions settings={settings} update={updateSetting} />}
            {activeCategory === 'shortcuts' && <ShortcutsPanel />}
          </div>
        </main>
      </div>
    </div>
  )
}

function OptionRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0 dark:border-gray-700">
      <div className="min-w-0 flex-1 pr-4">
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</div>
        {description && <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative h-[22px] w-10 flex-shrink-0 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span
        className="absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all duration-200"
        style={{ left: value ? '22px' : '3px' }}
      />
    </button>
  )
}

function Select<T extends string>({ value, options, onChange }: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  )
}

function NumberInput({ value, min, max, step, unit, onChange }: {
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
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
        className="w-20 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
      />
      {unit && <span className="text-xs text-gray-400">{unit}</span>}
    </div>
  )
}

function GeneralOptions({ settings, update }: { settings: Settings; update: UpdateFn }) {
  const { t } = useI18n()
  const [loginItem, setLoginItem] = useState(false)

  useEffect(() => {
    window.api.app.getLoginItem().then(setLoginItem)
  }, [])

  const handleLoginItem = (value: boolean) => {
    setLoginItem(value)
    window.api.app.setLoginItem(value)
  }

  return (
    <>
      <SectionTitle>{t('settings.section.appearance')}</SectionTitle>
      <OptionRow label={t('settings.theme')} description={t('settings.themeDescription')}>
        <Select
          value={settings.theme}
          options={[
            { value: 'light', label: t('settings.theme.light') },
            { value: 'dark', label: t('settings.theme.dark') },
            { value: 'sepia', label: t('settings.theme.sepia') },
            { value: 'midnight', label: t('settings.theme.midnight') },
            { value: 'forest', label: t('settings.theme.forest') },
            { value: 'rose', label: t('settings.theme.rose') }
          ]}
          onChange={(value) => update('theme', value)}
        />
      </OptionRow>
      <OptionRow label={t('settings.language')} description={t('settings.languageDescription')}>
        <Select
          value={settings.language}
          options={[
            { value: 'system', label: t('settings.language.system') },
            { value: 'en', label: t('settings.language.en') },
            { value: 'ko', label: t('settings.language.ko') },
            { value: 'ja', label: t('settings.language.ja') }
          ]}
          onChange={(value) => update('language', value)}
        />
      </OptionRow>

      <SectionTitle className="mt-4">{t('settings.section.behavior')}</SectionTitle>
      <OptionRow label={t('settings.autoLaunch')} description={t('settings.autoLaunchDescription')}>
        <Toggle value={loginItem} onChange={handleLoginItem} />
      </OptionRow>
      <OptionRow label={t('settings.startMinimized')} description={t('settings.startMinimizedDescription')}>
        <Toggle value={settings.startMinimized} onChange={(value) => update('startMinimized', value)} />
      </OptionRow>
      <OptionRow label={t('settings.closeToTray')} description={t('settings.closeToTrayDescription')}>
        <Toggle value={settings.closeToTray} onChange={(value) => update('closeToTray', value)} />
      </OptionRow>
    </>
  )
}

function EditorOptions({ settings, update }: { settings: Settings; update: UpdateFn }) {
  const { t } = useI18n()

  return (
    <>
      <SectionTitle>{t('settings.section.editing')}</SectionTitle>
      <OptionRow label={t('settings.fontSize')} description={t('settings.fontSizeDescription')}>
        <NumberInput value={settings.fontSize} min={10} max={24} step={1} unit="px" onChange={(value) => update('fontSize', value)} />
      </OptionRow>
      <OptionRow label={t('settings.autosaveDelay')} description={t('settings.autosaveDelayDescription')}>
        <NumberInput value={settings.autosaveDelay} min={100} max={5000} step={100} unit="ms" onChange={(value) => update('autosaveDelay', value)} />
      </OptionRow>

      <SectionTitle className="mt-4">{t('settings.section.assistance')}</SectionTitle>
      <OptionRow label={t('settings.spellCheck')} description={t('settings.spellCheckDescription')}>
        <Toggle value={settings.spellCheck} onChange={(value) => update('spellCheck', value)} />
      </OptionRow>
    </>
  )
}

function DataOptions({ settings, update }: { settings: Settings; update: UpdateFn }) {
  const { t } = useI18n()

  const handleBackup = async () => {
    const path = await api.export.backupAll()
    if (path) alert(t('settings.backupComplete', { path }))
  }

  return (
    <>
      <SectionTitle>{t('settings.section.backup')}</SectionTitle>
      <OptionRow label={t('settings.autoBackup')} description={t('settings.autoBackupDescription')}>
        <Toggle value={settings.autoBackup} onChange={(value) => update('autoBackup', value)} />
      </OptionRow>
      {settings.autoBackup && (
        <OptionRow label={t('settings.backupInterval')} description={t('settings.backupIntervalDescription')}>
          <Select
            value={String(settings.autoBackupInterval)}
            options={[
              { value: '1', label: t('settings.backup.every1h') },
              { value: '6', label: t('settings.backup.every6h') },
              { value: '12', label: t('settings.backup.every12h') },
              { value: '24', label: t('settings.backup.every24h') }
            ]}
            onChange={(value) => update('autoBackupInterval', Number(value))}
          />
        </OptionRow>
      )}

      <SectionTitle className="mt-4">{t('settings.section.manualBackup')}</SectionTitle>
      <div className="py-3">
        <button
          onClick={handleBackup}
          className="w-full rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
        >
          {t('settings.backupNow')}
        </button>
        <p className="mt-2 text-center text-xs text-gray-400">{t('settings.backupNowDescription')}</p>
      </div>
    </>
  )
}

function ShortcutsPanel() {
  const { t } = useI18n()
  const shortcuts = [
    { keys: ['Ctrl', 'N'], desc: t('shortcuts.newNote') },
    { keys: ['Ctrl', 'F'], desc: t('shortcuts.search') },
    { keys: ['Ctrl', ','], desc: t('shortcuts.settings') },
    { keys: ['Ctrl', 'Shift', 'M'], desc: t('shortcuts.toggleWindow') },
    { keys: ['Ctrl', 'Shift', 'N'], desc: t('shortcuts.quickNote') },
    { keys: ['Esc'], desc: t('shortcuts.closeSettings') }
  ]

  return (
    <>
      <SectionTitle>{t('settings.section.shortcuts')}</SectionTitle>
      <div className="mt-1 space-y-1">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between border-b border-gray-100 py-2.5 last:border-0 dark:border-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">{shortcut.desc}</span>
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key, keyIndex) => (
                <span key={keyIndex} className="flex items-center gap-1">
                  <kbd className="rounded border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-700 shadow-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {key}
                  </kbd>
                  {keyIndex < shortcut.keys.length - 1 && <span className="text-xs text-gray-300">+</span>}
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
    <div className={`pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 ${className}`}>
      {children}
    </div>
  )
}
