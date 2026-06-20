import { useCallback, useEffect, useRef, useState } from 'react'
import type { Clip } from '../types'

export function usePlayback() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const sequenceRef = useRef(0)
  const sequenceResolveRef = useRef<(() => void) | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentClipId, setCurrentClipId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const releaseCurrentAudio = useCallback(() => {
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
  }, [releaseCurrentAudio])

  const playOne = useCallback(async (
    clip: Clip,
    sequence: number,
  ): Promise<boolean> => {
    releaseCurrentAudio()
    const url = URL.createObjectURL(clip.blob)
    const audio = new Audio(url)
    objectUrlRef.current = url
    audioRef.current = audio
    setCurrentClipId(clip.id)
    setPlaying(true)
    setProgress(0)

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
      sequenceResolveRef.current = cancel
      audio.ontimeupdate = () => {
        setProgress(
          Number.isFinite(audio.duration) && audio.duration > 0
            ? Math.min(1, audio.currentTime / audio.duration)
            : 0,
        )
      }
      audio.onended = () => finish(sequenceRef.current === sequence)
      audio.onerror = () => fail(new Error('Audio playback failed'))
      void audio.play().catch(fail)
    })
  }, [releaseCurrentAudio])

  const playClip = useCallback(async (clip: Clip) => {
    stop()
    const sequence = sequenceRef.current
    try {
      await playOne(clip, sequence)
    } finally {
      if (sequenceRef.current === sequence) {
        setPlaying(false)
        setCurrentClipId(null)
        setProgress(0)
      }
    }
  }, [playOne, stop])

  const playAll = useCallback(async (clips: Clip[]) => {
    stop()
    const sequence = sequenceRef.current

    try {
      for (const clip of clips) {
        if (sequenceRef.current !== sequence) break
        const completed = await playOne(clip, sequence)
        if (!completed) break
      }
    } finally {
      if (sequenceRef.current === sequence) {
        releaseCurrentAudio()
        setPlaying(false)
        setCurrentClipId(null)
        setProgress(0)
      }
    }
  }, [playOne, releaseCurrentAudio, stop])

  useEffect(() => stop, [stop])

  return {
    playing,
    currentClipId,
    progress,
    playClip,
    playAll,
    stop,
  }
}
