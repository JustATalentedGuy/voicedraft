import { useCallback, useEffect, useMemo, useState } from 'react'
import { getEffectiveDuration } from '../lib/audio'
import {
  deleteAllClipsForScript,
  deleteClip,
  getClipsForScript,
  saveClip,
} from '../lib/db'
import type { Clip } from '../types'

export function useTimeline(scriptId: string) {
  const [clips, setClips] = useState<Clip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void getClipsForScript(scriptId).then((storedClips) => {
      if (!cancelled) {
        setClips(storedClips)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [scriptId])

  const addClip = useCallback((clip: Clip) => {
    setClips((current) => [...current, clip].sort(
      (first, second) => first.orderIndex - second.orderIndex,
    ))
  }, [])

  const setLastClipTrim = useCallback(async (trimEndSec: number) => {
    const last = clips.at(-1)
    if (!last) return null
    const endpoint = Math.min(
      last.durationSec,
      Math.max(0.25, trimEndSec),
    )
    const updatedClip: Clip = {
      ...last,
      trimEndSec: endpoint < last.durationSec - 0.005
        ? endpoint
        : undefined,
    }
    await saveClip(updatedClip)
    setClips((current) => [...current.slice(0, -1), updatedClip])
    return updatedClip
  }, [clips])

  const resetLastClipTrim = useCallback(async () => {
    const last = clips.at(-1)
    if (!last || last.trimEndSec === undefined) return null
    const updatedClip: Clip = { ...last, trimEndSec: undefined }
    await saveClip(updatedClip)
    setClips((current) => [...current.slice(0, -1), updatedClip])
    return updatedClip
  }, [clips])

  const deleteLastClip = useCallback(async () => {
    const last = clips.at(-1)
    if (!last) return
    await deleteClip(last.id)
    setClips((current) => current.slice(0, -1))
  }, [clips])

  const deleteSpecificClip = useCallback(async (clipId: string) => {
    await deleteClip(clipId)
    setClips((current) => current.filter((clip) => clip.id !== clipId))
  }, [])

  const clearAll = useCallback(async () => {
    await deleteAllClipsForScript(scriptId)
    setClips([])
  }, [scriptId])

  const totalDuration = useMemo(
    () => clips.reduce(
      (sum, clip) => sum + getEffectiveDuration(clip),
      0,
    ),
    [clips],
  )
  const nextOrderIndex = useMemo(
    () => clips.reduce(
      (highest, clip) => Math.max(highest, clip.orderIndex + 1),
      0,
    ),
    [clips],
  )

  return {
    clips,
    loading,
    addClip,
    setLastClipTrim,
    resetLastClipTrim,
    deleteLastClip,
    deleteSpecificClip,
    clearAll,
    totalDuration,
    nextOrderIndex,
  }
}
