import { useEffect, useMemo, useRef, useState } from 'react'
import { usePlayback } from '../hooks/usePlayback'
import {
  buildWaveformPeaks,
  getEffectiveDuration,
} from '../lib/audio'
import { clamp } from '../lib/utils'
import type { Clip } from '../types'

function formatPreciseDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remaining = (seconds % 60).toFixed(1).padStart(4, '0')
  return `${minutes}:${remaining}`
}

function positionWithinWaveform(seconds: number, duration: number): string {
  const ratio = duration > 0 ? clamp(seconds / duration, 0, 1) : 0
  return `calc(24px + ${ratio * 100}% - ${ratio * 48}px)`
}

export default function TrimEditor({
  clip,
  clipNumber,
  onApply,
  onReset,
  onCancel,
  onError,
}: {
  clip: Clip
  clipNumber: number
  onApply: (endpoint: number) => Promise<void>
  onReset: () => Promise<void>
  onCancel: () => void
  onError: (message: string) => void
}) {
  const initialEndpoint = getEffectiveDuration(clip)
  const minimumEndpoint = Math.min(0.25, clip.durationSec)
  const [endpoint, setEndpoint] = useState(initialEndpoint)
  const [seekSec, setSeekSec] = useState(0)
  const [peaks, setPeaks] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const waveformRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const playback = usePlayback()

  useEffect(() => {
    let cancelled = false
    void buildWaveformPeaks(clip.blob, 88)
      .then((waveformPeaks) => {
        if (!cancelled) setPeaks(waveformPeaks)
      })
      .catch(() => {
        if (!cancelled) onError('Could not prepare the waveform')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [clip.blob, onError])

  const updateFromPointer = (
    clientX: number,
    mode: 'trim' | 'seek',
  ) => {
    const bounds = waveformRef.current?.getBoundingClientRect()
    if (!bounds) return
    const trackLeft = bounds.left + 24
    const trackWidth = Math.max(1, bounds.width - 48)
    const ratio = clamp((clientX - trackLeft) / trackWidth, 0, 1)
    const seconds = ratio * clip.durationSec
    playback.stop()
    if (mode === 'trim') {
      const nextEndpoint = clamp(
        seconds,
        minimumEndpoint,
        clip.durationSec,
      )
      setEndpoint(nextEndpoint)
      setSeekSec(Math.min(seekSec, nextEndpoint))
    } else {
      setSeekSec(Math.min(seconds, endpoint))
    }
  }

  const cursorSec = playback.playing
    ? playback.currentTime
    : seekSec
  const changed = Math.abs(endpoint - initialEndpoint) >= 0.005
  const removedDuration = Math.max(0, clip.durationSec - endpoint)
  const visibleMarkers = useMemo(
    () => clip.markers.filter((marker) => marker <= clip.durationSec),
    [clip.durationSec, clip.markers],
  )
  const lastMarker = visibleMarkers.at(-1)

  const playKeptAudio = () => {
    if (playback.playing) {
      playback.stop()
      return
    }
    const start = seekSec >= endpoint - 0.05 ? 0 : seekSec
    void playback.playRange(clip, start, endpoint).catch(() => {
      onError('Could not play this clip')
    })
  }

  const previewEnding = () => {
    playback.stop()
    setSeekSec(Math.max(0, endpoint - 3))
    void playback.playRange(
      clip,
      Math.max(0, endpoint - 3),
      endpoint,
    ).catch(() => {
      onError('Could not preview the ending')
    })
  }

  const nudge = (amount: number) => {
    playback.stop()
    setEndpoint((current) => clamp(
      current + amount,
      minimumEndpoint,
      clip.durationSec,
    ))
  }

  const apply = async () => {
    if (!changed || saving) return
    playback.stop()
    setSaving(true)
    try {
      await onApply(endpoint)
    } catch {
      onError('Could not save the trim')
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    if (saving) return
    playback.stop()
    setSaving(true)
    try {
      await onReset()
      setEndpoint(clip.durationSec)
      setSeekSec(0)
    } catch {
      onError('Could not restore the full clip')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex h-[100dvh] flex-col bg-bg text-textPrimary">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-surfaceHigh px-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            playback.stop()
            onCancel()
          }}
          className="min-h-12 min-w-16 rounded-lg px-3 text-textMuted transition-colors duration-150 hover:bg-surfaceHigh disabled:opacity-40"
        >
          Cancel
        </button>
        <h2 className="font-semibold">Trim clip {clipNumber}</h2>
        <button
          type="button"
          disabled={!changed || loading || saving}
          onClick={() => void apply()}
          className="min-h-12 min-w-16 rounded-lg px-3 font-medium text-accent transition-colors duration-150 hover:bg-surfaceHigh disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Apply'}
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-surfaceHigh bg-surface p-3">
              <span className="block text-xs text-textMuted">Keep</span>
              <strong className="mt-1 block font-mono text-xl font-medium text-accentLight">
                {formatPreciseDuration(endpoint)}
              </strong>
            </div>
            <div className="rounded-xl border border-surfaceHigh bg-surface p-3">
              <span className="block text-xs text-textMuted">Remove</span>
              <strong className="mt-1 block font-mono text-xl font-medium text-danger">
                {formatPreciseDuration(removedDuration)}
              </strong>
            </div>
          </div>

          <p className="mb-2 text-sm text-textMuted">
            Drag the amber handle to choose where the clip ends. Tap anywhere
            else on the waveform to move playback.
          </p>

          <div
            ref={waveformRef}
            data-testid="trim-waveform"
            className="relative h-44 touch-none select-none overflow-hidden rounded-xl border border-surfaceHigh bg-surface"
            onPointerDown={(event) => {
              const target = event.target as HTMLElement
              const trimming = Boolean(target.closest('[data-trim-handle]'))
              draggingRef.current = trimming
              event.currentTarget.setPointerCapture(event.pointerId)
              updateFromPointer(event.clientX, trimming ? 'trim' : 'seek')
            }}
            onPointerMove={(event) => {
              if (draggingRef.current) updateFromPointer(event.clientX, 'trim')
            }}
            onPointerUp={(event) => {
              draggingRef.current = false
              event.currentTarget.releasePointerCapture(event.pointerId)
            }}
            onPointerCancel={() => {
              draggingRef.current = false
            }}
          >
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
              </div>
            ) : (
              <div className="absolute inset-y-3 left-6 right-6 flex items-center gap-px">
                {peaks.map((peak, index) => (
                  <span
                    key={index}
                    className="min-w-px flex-1 rounded-full bg-accent"
                    style={{ height: `${Math.max(4, peak * 100)}%` }}
                  />
                ))}
              </div>
            )}

            <div
              data-testid="trim-cursor"
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 bg-danger/25"
              style={{
                left: positionWithinWaveform(endpoint, clip.durationSec),
                right: '24px',
              }}
            />

            {visibleMarkers.map((marker) => (
              <button
                key={marker}
                type="button"
                aria-label={`Set endpoint to marker at ${formatPreciseDuration(marker)}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => {
                  playback.stop()
                  setEndpoint(clamp(
                    marker,
                    minimumEndpoint,
                    clip.durationSec,
                  ))
                }}
                className={`absolute inset-y-0 z-20 w-5 -translate-x-1/2 ${
                  marker === lastMarker ? 'text-accentLight' : 'text-white/70'
                }`}
                style={{
                  left: positionWithinWaveform(marker, clip.durationSec),
                }}
              >
                <span className="mx-auto block h-full w-px bg-current" />
              </button>
            ))}

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-white"
              style={{
                left: positionWithinWaveform(cursorSec, clip.durationSec),
              }}
            />

            <button
              type="button"
              data-trim-handle
              data-testid="trim-handle"
              aria-label={`Trim endpoint ${formatPreciseDuration(endpoint)}`}
              className="absolute inset-y-0 z-30 w-12 -translate-x-1/2 touch-none"
              style={{
                left: positionWithinWaveform(endpoint, clip.durationSec),
              }}
            >
              <span className="absolute bottom-0 left-1/2 top-0 w-1 -translate-x-1/2 bg-clipSelected" />
              <span className="absolute left-1/2 top-2 h-8 w-8 -translate-x-1/2 rounded-full border-4 border-bg bg-clipSelected" />
            </button>
          </div>

          <div className="mt-3 flex justify-between font-mono text-xs text-textMuted">
            <span>{formatPreciseDuration(0)}</span>
            <span>{formatPreciseDuration(clip.durationSec)}</span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={loading || saving}
              onClick={playKeptAudio}
              className="min-h-12 rounded-lg bg-surfaceHigh px-3 text-sm font-medium transition-colors duration-150 hover:text-accentLight disabled:opacity-40"
            >
              {playback.playing ? 'Pause' : 'Play kept audio'}
            </button>
            <button
              type="button"
              disabled={loading || saving}
              onClick={previewEnding}
              className="min-h-12 rounded-lg bg-surfaceHigh px-3 text-sm font-medium transition-colors duration-150 hover:text-accentLight disabled:opacity-40"
            >
              Preview ending
            </button>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {[-0.5, -0.1, 0.1, 0.5].map((amount) => (
              <button
                key={amount}
                type="button"
                disabled={loading || saving}
                onClick={() => nudge(amount)}
                className="min-h-12 rounded-lg border border-surfaceHigh bg-surface font-mono text-sm transition-colors duration-150 hover:bg-surfaceHigh disabled:opacity-40"
              >
                {amount > 0 ? '+' : '−'}{Math.abs(amount).toFixed(1)}s
              </button>
            ))}
          </div>

          {clip.trimEndSec !== undefined && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void reset()}
              className="mt-5 min-h-12 rounded-lg border border-surfaceHigh px-4 text-sm text-textMuted transition-colors duration-150 hover:bg-surfaceHigh hover:text-textPrimary disabled:opacity-40"
            >
              Reset to full clip
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
