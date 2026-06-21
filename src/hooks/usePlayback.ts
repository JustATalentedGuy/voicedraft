import { useCallback, useEffect, useRef, useState } from 'react'
import { getEffectiveDuration } from '../lib/audio'
import type { Clip } from '../types'

interface PlaybackRange {
  startSec: number
  endSec: number
}

export function usePlayback() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const sequenceRef = useRef(0)
  const sequenceResolveRef = useRef<(() => void) | null>(null)
  const stopTimerRef = useRef<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentClipId, setCurrentClipId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  const releaseCurrentAudio = useCallback(() => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }
    const audio = audioRef.current
    if (audio) {
      audio.onended = null
      audio.onerror = null
      audio.ontimeupdate = null
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    audioRef.current = null
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    sequenceRef.current += 1
    releaseCurrentAudio()
    sequenceResolveRef.current?.()
    sequenceResolveRef.current = null
    setPlaying(false)
    setCurrentClipId(null)
    setProgress(0)
    setCurrentTime(0)
  }, [releaseCurrentAudio])

  const playOne = useCallback(async (
    clip: Clip,
    sequence: number,
    range: PlaybackRange,
  ): Promise<boolean> => {
    releaseCurrentAudio()
    const url = URL.createObjectURL(clip.blob)
    const audio = new Audio(url)
    const startSec = Math.max(0, range.startSec)
    const endSec = Math.min(clip.durationSec, Math.max(startSec, range.endSec))
    objectUrlRef.current = url
    audioRef.current = audio
    setCurrentClipId(clip.id)
    setPlaying(true)
    setProgress(0)
    setCurrentTime(startSec)

    return new Promise<boolean>((resolve, reject) => {
      let settled = false
      const finish = (completed: boolean) => {
        if (settled) return
        settled = true
        if (sequenceResolveRef.current === cancel) {
          sequenceResolveRef.current = null
        }
        releaseCurrentAudio()
        resolve(completed)
      }
      const cancel = () => finish(false)
      const fail = (error: unknown) => {
        if (settled) return
        settled = true
        if (sequenceResolveRef.current === cancel) {
          sequenceResolveRef.current = null
        }
        releaseCurrentAudio()
        reject(error)
      }
      const updateProgress = () => {
        const time = Math.min(endSec, audio.currentTime)
        setCurrentTime(time)
        setProgress(
          endSec > startSec
            ? Math.min(1, (time - startSec) / (endSec - startSec))
            : 1,
        )
        if (time >= endSec - 0.015) finish(sequenceRef.current === sequence)
      }

      sequenceResolveRef.current = cancel
      audio.onloadedmetadata = () => {
        audio.currentTime = startSec
      }
      audio.ontimeupdate = updateProgress
      audio.onended = () => finish(sequenceRef.current === sequence)
      audio.onerror = () => fail(new Error('Audio playback failed'))
      stopTimerRef.current = window.setTimeout(
        () => finish(sequenceRef.current === sequence),
        Math.max(50, (endSec - startSec) * 1000 + 150),
      )
      void audio.play().catch(fail)
    })
  }, [releaseCurrentAudio])

  const playRange = useCallback(async (
    clip: Clip,
    startSec: number,
    endSec: number,
  ) => {
    stop()
    const sequence = sequenceRef.current
    try {
      await playOne(clip, sequence, { startSec, endSec })
    } finally {
      if (sequenceRef.current === sequence) {
        setPlaying(false)
        setCurrentClipId(null)
        setProgress(0)
      }
    }
  }, [playOne, stop])

  const playClip = useCallback(
    (clip: Clip) => playRange(clip, 0, getEffectiveDuration(clip)),
    [playRange],
  )

  const playAll = useCallback(async (clips: Clip[]) => {
    stop()
    const sequence = sequenceRef.current
    try {
      for (const clip of clips) {
        if (sequenceRef.current !== sequence) break
        const completed = await playOne(clip, sequence, {
          startSec: 0,
          endSec: getEffectiveDuration(clip),
        })
        if (!completed) break
      }
    } finally {
      if (sequenceRef.current === sequence) {
        releaseCurrentAudio()
        setPlaying(false)
        setCurrentClipId(null)
        setProgress(0)
        setCurrentTime(0)
      }
    }
  }, [playOne, releaseCurrentAudio, stop])

  useEffect(() => stop, [stop])

  return {
    playing,
    currentClipId,
    progress,
    currentTime,
    playClip,
    playRange,
    playAll,
    stop,
  }
}
