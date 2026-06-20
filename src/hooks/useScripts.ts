import { useCallback, useState } from 'react'
import * as storage from '../lib/storage'
import type { Script } from '../types'

export function useScripts() {
  const [scripts, setScripts] = useState<Script[]>(storage.getAllScripts)

  const create = useCallback((title: string) => {
    const script = storage.createScript(title)
    setScripts(storage.getAllScripts())
    return script
  }, [])

  const update = useCallback((script: Script) => {
    storage.saveScript({ ...script, updatedAt: Date.now() })
    setScripts(storage.getAllScripts())
  }, [])

  const remove = useCallback((id: string) => {
    storage.deleteScript(id)
    setScripts(storage.getAllScripts())
  }, [])

  return { scripts, create, update, remove }
}
