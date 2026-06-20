import { useNavigate } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'
import type {
  FontSize,
  SilenceThreshold,
  SilenceWindowMs,
} from '../types'

function OptionGroup<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ label: string; value: T }>
  onChange: (value: T) => void
}) {
  return (
    <fieldset>
      <legend className="mb-3 font-medium">{label}</legend>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-12 cursor-pointer items-center justify-center rounded-lg border px-2 text-sm transition-colors duration-150 ${
              value === option.value
                ? 'border-accent bg-activePara text-accentLight'
                : 'border-surfaceHigh bg-surface text-textMuted hover:bg-surfaceHigh'
            }`}
          >
            <input
              type="radio"
              className="sr-only"
              name={label}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { settings, update } = useSettings()

  return (
    <main className="flex h-full flex-col bg-bg text-textPrimary">
      <header className="flex h-14 shrink-0 items-center border-b border-surfaceHigh px-2">
        <button
          type="button"
          aria-label="Back to scripts"
          onClick={() => navigate('/')}
          className="flex h-12 w-12 items-center justify-center rounded-lg text-textMuted transition-colors duration-150 hover:bg-surfaceHigh hover:text-textPrimary"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl divide-y divide-surfaceHigh">
          <div className="pb-6">
            <OptionGroup<FontSize>
              label="Script font size"
              value={settings.fontSize}
              options={[
                { label: 'Small', value: 'sm' },
                { label: 'Medium', value: 'md' },
                { label: 'Large', value: 'lg' },
              ]}
              onChange={(fontSize) => update({ fontSize })}
            />
          </div>

          <div className="py-6">
            <OptionGroup<SilenceThreshold>
              label="Silence threshold"
              value={settings.silenceThreshold}
              options={[
                { label: '0.01', value: 0.01 },
                { label: '0.02', value: 0.02 },
                { label: '0.05', value: 0.05 },
              ]}
              onChange={(silenceThreshold) => update({ silenceThreshold })}
            />
            <div className="mt-2 flex justify-between text-xs text-textMuted">
              <span>Quieter</span>
              <span>Louder</span>
            </div>
          </div>

          <div className="py-6">
            <OptionGroup<SilenceWindowMs>
              label="Silence window"
              value={settings.silenceWindowMs}
              options={[
                { label: '200ms', value: 200 },
                { label: '300ms', value: 300 },
                { label: '500ms', value: 500 },
              ]}
              onChange={(silenceWindowMs) => update({ silenceWindowMs })}
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-6">
            <div>
              <p className="font-medium">Auto-preview after record</p>
              <p className="mt-1 text-sm text-textMuted">
                Play each clip after recording stops
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.autoPreview}
              aria-label="Auto-preview after record"
              onClick={() => update({ autoPreview: !settings.autoPreview })}
              className={`relative h-12 w-16 shrink-0 rounded-full border transition-colors duration-150 ${
                settings.autoPreview
                  ? 'border-accent bg-accent'
                  : 'border-surfaceHigh bg-surfaceHigh'
              }`}
            >
              <span
                className={`absolute left-2 top-2 h-7 w-7 rounded-full bg-white transition-transform duration-150 ${
                  settings.autoPreview ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
