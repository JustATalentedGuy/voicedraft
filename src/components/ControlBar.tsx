import type { RecorderState } from '../hooks/useRecorder'
import type { Clip } from '../types'
import RecordButton from './RecordButton'
import Timeline from './Timeline'

export default function ControlBar({
  clips,
  totalDuration,
  selectedClipId,
  currentClipId,
  playing,
  playbackProgress,
  recorderState,
  elapsed,
  onSelectClip,
  onPlayClip,
  onDeleteClip,
  onRecord,
  onTrimPause,
  onTrimMarker,
  onRedo,
  onPlayAll,
}: {
  clips: Clip[]
  totalDuration: number
  selectedClipId: string | null
  currentClipId: string | null
  playing: boolean
  playbackProgress: number
  recorderState: RecorderState
  elapsed: number
  onSelectClip: (clipId: string | null) => void
  onPlayClip: (clip: Clip) => void
  onDeleteClip: (clip: Clip) => void
  onRecord: () => void
  onTrimPause: () => void
  onTrimMarker: () => void
  onRedo: () => void
  onPlayAll: () => void
}) {
  const hasClips = clips.length > 0
  const lastClip = clips.at(-1)
  const hasMarkers = (lastClip?.markers.length ?? 0) > 0
  const busy = recorderState === 'recording' || recorderState === 'processing'

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-1">
      <Timeline
        clips={clips}
        totalDuration={totalDuration}
        selectedClipId={selectedClipId}
        currentClipId={currentClipId}
        playing={playing}
        playbackProgress={playbackProgress}
        actionsDisabled={busy}
        onSelectClip={onSelectClip}
        onPlayClip={onPlayClip}
        onDeleteClip={onDeleteClip}
      />

      <div className="flex h-11 shrink-0 gap-2">
        <button
          type="button"
          disabled={!hasClips || busy}
          onClick={onTrimPause}
          className="min-h-11 flex-1 rounded-lg bg-surfaceHigh px-2 text-xs text-textMuted transition-colors duration-150 disabled:opacity-40"
        >
          Trim to last pause
        </button>
        {hasMarkers && (
          <button
            type="button"
            disabled={busy}
            onClick={onTrimMarker}
            className="min-h-11 flex-1 rounded-lg bg-surfaceHigh px-2 text-xs text-textMuted transition-colors duration-150 disabled:opacity-40"
          >
            Trim to last marker
          </button>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <button
          type="button"
          disabled={!hasClips || busy}
          onClick={onRedo}
          className="absolute left-0 min-h-12 w-[72px] rounded-lg bg-surfaceHigh px-2 text-xs text-textMuted transition-colors duration-150 disabled:opacity-40"
        >
          Redo last
        </button>

        <RecordButton
          state={recorderState}
          elapsed={elapsed}
          onClick={onRecord}
        />

        <button
          type="button"
          disabled={!hasClips || busy}
          onClick={onPlayAll}
          className={`absolute right-0 min-h-12 w-[72px] rounded-lg px-2 text-xs transition-colors duration-150 disabled:opacity-40 ${
            playing
              ? 'bg-accent text-bg'
              : 'bg-surfaceHigh text-textMuted'
          }`}
        >
          {recorderState === 'previewing'
            ? 'Skip preview'
            : playing
              ? 'Stop all'
              : 'Play all'}
        </button>
      </div>
    </div>
  )
}
