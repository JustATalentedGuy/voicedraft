import type { Script, Settings } from '../types'
import { generateId } from './utils'

const SCRIPTS_KEY = 'vd_scripts'
const SETTINGS_KEY = 'vd_settings'

const DEFAULT_SETTINGS: Settings = {
  fontSize: 'md',
  silenceThreshold: 0.02,
  silenceWindowMs: 300,
  autoPreview: true,
}

export function getAllScripts(): Script[] {
  try {
    return JSON.parse(localStorage.getItem(SCRIPTS_KEY) ?? '[]') as Script[]
  } catch {
    return []
  }
}

export function getScript(id: string): Script | null {
  return getAllScripts().find((script) => script.id === id) ?? null
}

export function saveScript(script: Script): void {
  const scripts = getAllScripts()
  const index = scripts.findIndex((savedScript) => savedScript.id === script.id)

  if (index >= 0) {
    scripts[index] = script
  } else {
    scripts.unshift(script)
  }

  localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts))
}

export function createScript(title: string): Script {
  const now = Date.now()
  const script: Script = {
    id: generateId(),
    title: title.trim() || 'Untitled',
    paragraphs: [{ id: generateId(), text: '' }],
    createdAt: now,
    updatedAt: now,
  }

  saveScript(script)
  return script
}

export function deleteScript(id: string): void {
  const scripts = getAllScripts().filter((script) => script.id !== id)
  localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts))
}

export function getSettings(): Settings {
  try {
    const savedSettings = localStorage.getItem(SETTINGS_KEY)
    return savedSettings
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) as Partial<Settings> }
      : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Partial<Settings>): void {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...getSettings(), ...settings }),
  )
}
