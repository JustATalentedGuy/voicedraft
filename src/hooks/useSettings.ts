import { useCallback, useState } from 'react'
import * as storage from '../lib/storage'
import type { Settings } from '../types'

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(storage.getSettings)

  const update = useCallback((partial: Partial<Settings>) => {
    storage.saveSettings(partial)
    setSettings(storage.getSettings())
  }, [])

  return { settings, update }
}
