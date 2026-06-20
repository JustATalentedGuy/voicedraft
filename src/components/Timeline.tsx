import { useEffect, useRef, useState } from 'react'
import type { Clip } from '../types'
import ClipBlock from './ClipBlock'

export default function Timeline({
  clips,
  totalDuration,
  selectedClipId,
  currentClipId,
  playing,
  playbackProgress,
  actionsDisabled,
  onSelectClip,
  onPlayClip,
  onDeleteClip,
}: {
  clips: Clip[]
  totalDuration: number
  selectedClipId: string | null
  currentClipId: string | null
  playing: boolean
  playbackProgress: number
  actionsDisabled: boolean
  onSelectClip: (clipId: string | null) => void
  onPlayClip: (clip: Clip) => void
  onDeleteClip: (clip: Clip) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const clipRefs = useRef(new Map<string, HTMLButtonElement>())
  const [containerWidth, setContainerWidth] = useState(320)
  const selectedClip = clips.find((clip) => clip.id === selectedClipId) ?? null

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const updateWidth = () => setContainerWidth(container.clientWidth)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const visibleClipId = currentClipId ?? selectedClipId
    if (visibleClipId) {
      clipRefs.current.get(visibleClipId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      })
    }
  }, [currentClipId, selectedClipId])

  return (
    <div className="shrink-0">
      <div
        ref={containerRef}
        data-testid="timeline"
        onClick={() => onSelectClip(null)}
        className="h-16 overflow-x-auto overflow-y-hidden rounded-lg border border-surfaceHigh bg-bg px-2"
      >
        {clips.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-textMuted">
            No clips yet — tap Record to start
          </div>
        ) : (
          <div className="flex h-full min-w-max items-center gap-2 py-1">
            {clips.map((clip, index) => {
              const usableWidth = Math.max(48, containerWidth - 64)
              const proportionalWidth = totalDuration > 0
                ? (clip.durationSec / totalDuration) * usableWidth
                : 48
              return (
                <div
                  key={clip.id}
                >
                  <div
                    ref={(element) => {
                      const button = element?.querySelector('button')
                      if (button) clipRefs.current.set(clip.id, button)
                      else clipRefs.current.delete(clip.id)
                    }}
                  >
                    <ClipBlock
                      clip={clip}
                      index={index}
                      width={Math.max(48, proportionalWidth)}
                      selected={clip.id === selectedClipId}
                      playing={clip.id === currentClipId}
                      progress={
                        clip.id === currentClipId ? playbackProgress : 0
                      }
                      onSelect={() => onSelectClip(clip.id)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedClip && (
        <div
          data-testid="clip-actions"
          className="mt-1 flex h-11 items-center justify-between gap-2"
        >
          <button
            type="button"
            disabled={actionsDisabled}
            onClick={() => onPlayClip(selectedClip)}
            className="min-h-11 flex-1 rounded-lg bg-surfaceHigh px-3 text-sm text-textMuted transition-colors duration-150 hover:text-textPrimary disabled:opacity-40"
          >
            {playing && currentClipId === selectedClip.id
              ? 'Stop clip'
              : 'Play clip'}
          </button>
          <button
            type="button"
            disabled={actionsDisabled}
            onClick={() => onDeleteClip(selectedClip)}
            className="min-h-11 flex-1 rounded-lg bg-surfaceHigh px-3 text-sm text-danger transition-colors duration-150 hover:bg-danger hover:text-white disabled:opacity-40"
          >
            Delete clip
          </button>
        </div>
      )}
    </div>
  )
}
