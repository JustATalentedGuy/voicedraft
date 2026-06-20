import { formatDuration } from '../lib/utils'
import type { Clip } from '../types'

export default function ClipBlock({
  clip,
  index,
  width,
  selected,
  playing,
  progress,
  onSelect,
}: {
  clip: Clip
  index: number
  width: number
  selected: boolean
  playing: boolean
  progress: number
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-label={`Clip ${index + 1}, ${formatDuration(clip.durationSec)}`}
      aria-pressed={selected}
      data-clip-id={clip.id}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      className={`relative h-14 shrink-0 overflow-hidden rounded-lg px-2 py-1 text-left text-bg transition-all duration-150 ${
        selected || playing
          ? 'scale-105 bg-clipSelected'
          : 'bg-clipDefault'
      } ${playing ? 'animate-clip-pulse' : ''}`}
      style={{ width }}
    >
      <span className="block text-[11px] font-medium">Clip {index + 1}</span>
      <span className="absolute bottom-1 left-2 font-mono text-[11px]">
        {formatDuration(clip.durationSec)}
      </span>
      {clip.markers.map((marker) => (
        <span
          key={marker}
          aria-hidden="true"
          className="absolute top-0 h-full w-px bg-white/80"
          style={{
            left: `${Math.min(100, (marker / clip.durationSec) * 100)}%`,
          }}
        />
      ))}
      {playing && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 top-0 w-0.5 bg-white"
          style={{ left: `${Math.min(100, progress * 100)}%` }}
        />
      )}
    </button>
  )
}
