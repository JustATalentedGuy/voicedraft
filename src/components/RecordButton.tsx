import type { RecorderState } from '../hooks/useRecorder'
import { formatDuration } from '../lib/utils'

export default function RecordButton({
  state,
  elapsed,
  onClick,
}: {
  state: RecorderState
  elapsed: number
  onClick: () => void
}) {
  const processing = state === 'processing'
  const recording = state === 'recording'

  return (
    <button
      type="button"
      aria-label={
        processing
          ? 'Processing recording'
          : recording
            ? 'Stop recording'
            : 'Start recording'
      }
      disabled={processing}
      onClick={onClick}
      className={`relative flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-danger text-white transition-colors duration-150 disabled:cursor-wait ${
        recording ? 'animate-pulse-ring' : ''
      }`}
    >
      {processing ? (
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/35 border-t-white" />
      ) : recording ? (
        <>
          <span className="h-6 w-6 rounded bg-white" />
          <span className="absolute -bottom-5 font-mono text-xs text-textPrimary">
            {formatDuration(elapsed)}
          </span>
        </>
      ) : (
        <span className="h-8 w-8 rounded-full bg-white" />
      )}
    </button>
  )
}
