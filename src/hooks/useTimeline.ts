import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  blobToAudioBuffer,
  encodeWAV,
  trimAudioBuffer,
  trimBlobToLastPause,
} from '../lib/audio'
import {
  deleteAllClipsForScript,
  deleteClip,
  getClipsForScript,
  saveClip,
} from '../lib/db'
import type { Clip, Settings } from '../types'

export function useTimeline(scriptId: string, settings: Settings) {
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

  const trimLastClip = useCallback(async (): Promise<number | null> => {
    const last = clips.at(-1)
    if (!last) return null

    const originalBuffer = await blobToAudioBuffer(last.blob)
    const { trimmedBuffer, trimSec } = await trimBlobToLastPause(
      last.blob,
      settings.silenceThreshold,
      settings.silenceWindowMs,
    )

    if (
      trimSec <= 0
      || originalBuffer.duration - trimSec < 0.1
    ) {
      return null
    }

    const updatedClip: Clip = {
      ...last,
      blob: encodeWAV(
        trimmedBuffer.getChannelData(0),
        trimmedBuffer.sampleRate,
      ),
      durationSec: trimSec,
      markers: last.markers.filter((marker) => marker < trimSec),
    }

    await saveClip(updatedClip)
    setClips((current) => [
      ...current.slice(0, -1),
      updatedClip,
    ])
    return trimSec
  }, [clips, settings.silenceThreshold, settings.silenceWindowMs])

  const trimLastClipToMarker = useCallback(async (): Promise<number | null> => {
    const last = clips.at(-1)
    const lastMarker = last?.markers.at(-1)
    if (!last || lastMarker === undefined) return null

    const audioBuffer = await blobToAudioBuffer(last.blob)
    const trimmedBuffer = trimAudioBuffer(audioBuffer, lastMarker)
    const updatedClip: Clip = {
      ...last,
      blob: encodeWAV(
        trimmedBuffer.getChannelData(0),
        trimmedBuffer.sampleRate,
      ),
      durationSec: lastMarker,
      markers: last.markers.filter((marker) => marker < lastMarker),
    }

    await saveClip(updatedClip)
    setClips((current) => [
      ...current.slice(0, -1),
      updatedClip,
    ])
    return lastMarker
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
    () => clips.reduce((sum, clip) => sum + clip.durationSec, 0),
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
    trimLastClip,
    trimLastClipToMarker,
    deleteLastClip,
    deleteSpecificClip,
    clearAll,
    totalDuration,
    nextOrderIndex,
  }
}
