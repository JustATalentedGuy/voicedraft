import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { blobToAudioBuffer } from '../lib/audio'
import { saveClip } from '../lib/db'
import { generateId } from '../lib/utils'
import type { Clip } from '../types'

export type RecorderState =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'previewing'
  | 'playing'

type RecorderAction =
  | { type: 'START' }
  | { type: 'STOP' }
  | { type: 'PREVIEW' }
  | { type: 'PLAY' }
  | { type: 'IDLE' }

function reducer(
  state: RecorderState,
  action: RecorderAction,
): RecorderState {
  switch (action.type) {
    case 'START':
      return state === 'idle' || state === 'playing' || state === 'previewing'
        ? 'recording'
        : state
    case 'STOP':
      return state === 'recording' ? 'processing' : state
    case 'PREVIEW':
      return 'previewing'
    case 'PLAY':
      return 'playing'
    case 'IDLE':
      return 'idle'
  }
}

export function useRecorder(
  scriptId: string,
  onClipReady: (clip: Clip) => boolean | Promise<boolean>,
  onError?: (message: string) => void,
) {
  const [state, dispatch] = useReducer(reducer, 'idle')
  const [elapsed, setElapsed] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const markersRef = useRef<number[]>([])
  const startTimeRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const orderIndexRef = useRef(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const start = useCallback(async (nextOrderIndex: number) => {
    if (state === 'recording' || state === 'processing') return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      const preferredMimeType = 'audio/webm;codecs=opus'
      const mimeType = MediaRecorder.isTypeSupported(preferredMimeType)
        ? preferredMimeType
        : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })

      chunksRef.current = []
      markersRef.current = []
      orderIndexRef.current = nextOrderIndex
      startTimeRef.current = performance.now()
      streamRef.current = stream
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onerror = () => {
        clearTimer()
        stopStream()
        dispatch({ type: 'IDLE' })
        onError?.('Recording failed. Please try again.')
      }

      recorder.onstop = () => {
        void (async () => {
          dispatch({ type: 'STOP' })
          clearTimer()
          stopStream()

          try {
            const blob = new Blob(chunksRef.current, { type: mimeType })
            if (blob.size === 0) throw new Error('The recording was empty')
            const audioBuffer = await blobToAudioBuffer(blob)
            const durationSec = audioBuffer.duration
            const clip: Clip = {
              id: generateId(),
              scriptId,
              orderIndex: orderIndexRef.current,
              blob,
              durationSec,
              markers: markersRef.current.filter(
                (marker) => marker > 0 && marker < durationSec,
              ),
              createdAt: Date.now(),
            }

            await saveClip(clip)
            const shouldPreview = await onClipReady(clip)
            setElapsed(0)
            dispatch({ type: shouldPreview ? 'PREVIEW' : 'IDLE' })
          } catch (error) {
            setElapsed(0)
            dispatch({ type: 'IDLE' })
            onError?.(
              error instanceof Error
                ? error.message
                : 'Could not process this recording.',
            )
          } finally {
            mediaRecorderRef.current = null
          }
        })()
      }

      recorder.start(100)
      dispatch({ type: 'START' })
      timerRef.current = window.setInterval(() => {
        setElapsed((performance.now() - startTimeRef.current) / 1000)
      }, 100)
    } catch (error) {
      stopStream()
      dispatch({ type: 'IDLE' })
      const message = error instanceof DOMException
        && error.name === 'NotAllowedError'
        ? 'Microphone permission is required to record.'
        : 'Could not access the microphone.'
      onError?.(message)
    }
  }, [clearTimer, onClipReady, onError, scriptId, state, stopStream])

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'recording') return
    clearTimer()
    mediaRecorderRef.current.stop()
  }, [clearTimer])

  const addMarker = useCallback(() => {
    if (state !== 'recording') return
    markersRef.current.push(
      (performance.now() - startTimeRef.current) / 1000,
    )
  }, [state])

  const setActivity = useCallback((activity: 'previewing' | 'playing') => {
    dispatch({ type: activity === 'previewing' ? 'PREVIEW' : 'PLAY' })
  }, [])

  const finishActivity = useCallback(() => {
    dispatch({ type: 'IDLE' })
  }, [])

  useEffect(() => () => {
    clearTimer()
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    stopStream()
  }, [clearTimer, stopStream])

  return {
    state,
    elapsed,
    start,
    stop,
    addMarker,
    setActivity,
    finishActivity,
  }
}
