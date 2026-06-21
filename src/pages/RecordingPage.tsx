import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ControlBar from '../components/ControlBar'
import ExportButton from '../components/ExportButton'
import Toast from '../components/Toast'
import TrimEditor from '../components/TrimEditor'
import { usePlayback } from '../hooks/usePlayback'
import { useRecorder } from '../hooks/useRecorder'
import { useSettings } from '../hooks/useSettings'
import { useTimeline } from '../hooks/useTimeline'
import { useToast } from '../hooks/useToast'
import { getClipsForScript } from '../lib/db'
import { getScript } from '../lib/storage'
import type { Clip, Script } from '../types'

export default function RecordingPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { settings } = useSettings()
  const { toast, showToast } = useToast()
  const [script] = useState<Script | null>(() => getScript(id))
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [activeParagraphId, setActiveParagraphId] = useState(
    script?.paragraphs[0]?.id ?? '',
  )
  const [flashedParagraphId, setFlashedParagraphId] = useState<string | null>(
    null,
  )
  const [trimClip, setTrimClip] = useState<Clip | null>(null)
  const flashTimerRef = useRef<number | null>(null)
  const playback = usePlayback()
  const timeline = useTimeline(id)
  const {
    playing,
    currentClipId,
    progress: playbackProgress,
    playClip,
    playAll,
    stop: stopAudio,
  } = playback
  const {
    clips,
    loading,
    addClip,
    setLastClipTrim,
    resetLastClipTrim,
    deleteLastClip,
    deleteSpecificClip,
    totalDuration,
    nextOrderIndex,
  } = timeline

  const handleClipReady = useCallback((clip: Clip) => {
    addClip(clip)
    setSelectedClipId(clip.id)

    if (settings.autoPreview) {
      void playClip(clip).catch(() => {
        showToast('Could not preview this clip', 'error')
      })
      return true
    }
    return false
  }, [
    addClip,
    playClip,
    settings.autoPreview,
    showToast,
  ])

  const recorder = useRecorder(id, handleClipReady, (message) => {
    showToast(message, 'error')
  })
  const {
    state: recorderState,
    elapsed,
    start,
    stop: stopRecording,
    addMarker,
    setActivity,
    finishActivity,
  } = recorder

  useEffect(() => {
    if (!script) navigate('/', { replace: true })
  }, [navigate, script])

  useEffect(() => {
    if (
      !playing
      && (recorderState === 'playing' || recorderState === 'previewing')
    ) {
      finishActivity()
    }
  }, [finishActivity, playing, recorderState])

  useEffect(() => () => {
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!trimClip) return
    const closeOnBack = () => setTrimClip(null)
    window.addEventListener('popstate', closeOnBack)
    return () => window.removeEventListener('popstate', closeOnBack)
  }, [trimClip])

  const stopPlayback = useCallback(() => {
    stopAudio()
    finishActivity()
  }, [finishActivity, stopAudio])

  const handleRecord = () => {
    if (recorderState === 'recording') {
      stopRecording()
      return
    }
    if (recorderState === 'processing') return
    if (playing) stopPlayback()
    void start(nextOrderIndex)
  }

  const handleParagraphTap = (paragraphId: string) => {
    setActiveParagraphId(paragraphId)
  }

  const handleParagraphPointerDown = (paragraphId: string) => {
    if (recorderState !== 'recording') return
    addMarker()
    setActiveParagraphId(paragraphId)
    setFlashedParagraphId(paragraphId)
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current)
    }
    flashTimerRef.current = window.setTimeout(() => {
      setFlashedParagraphId(null)
    }, 150)
  }

  const handlePlayClip = (clip: Clip) => {
    if (playing && currentClipId === clip.id) {
      stopPlayback()
      return
    }
    stopAudio()
    setActivity('playing')
    void playClip(clip).catch(() => {
      finishActivity()
      showToast('Could not play this clip', 'error')
    })
  }

  const handlePlayAll = () => {
    if (playing) {
      stopPlayback()
      return
    }
    setActivity('playing')
    void playAll(clips).catch(() => {
      finishActivity()
      showToast('Could not play this session', 'error')
    })
  }

  const handleDeleteClip = (clip: Clip) => {
    if (currentClipId === clip.id) stopPlayback()
    void deleteSpecificClip(clip.id).then(() => {
      setSelectedClipId(null)
      showToast('Clip deleted')
    })
  }

  const handleRedo = () => {
    stopPlayback()
    void deleteLastClip().then(() => {
      setSelectedClipId(null)
      showToast('Last clip removed')
    })
  }

  const handleOpenTrim = () => {
    stopPlayback()
    const lastClip = clips.at(-1)
    if (lastClip) {
      window.history.pushState({ voiceDraftTrim: true }, '')
      setTrimClip(lastClip)
    }
  }

  const handleApplyTrim = async (endpoint: number) => {
    const updatedClip = await setLastClipTrim(endpoint)
    if (!updatedClip) return
    showToast(`Trimmed to ${Math.floor(endpoint / 60)}:${Math.floor(endpoint % 60).toString().padStart(2, '0')}`)
    window.history.back()
  }

  const handleResetTrim = async () => {
    const updatedClip = await resetLastClipTrim()
    if (!updatedClip) return
    setTrimClip(updatedClip)
    showToast('Full clip restored')
  }

  const handleTrimError = useCallback((message: string) => {
    showToast(message, 'error')
  }, [showToast])

  const handleBack = async () => {
    if (recorderState === 'recording' || recorderState === 'processing') {
      showToast('Stop recording before leaving', 'warn')
      return
    }
    const sessionClips = loading ? await getClipsForScript(id) : clips
    if (sessionClips.length > 0) {
      setShowLeaveDialog(true)
    } else {
      navigate('/')
    }
  }

  if (!script) return null

  const paragraphTextSize = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  }[settings.fontSize]

  return (
    <main className="h-full overflow-hidden bg-bg text-textPrimary">
      <header className="flex h-14 items-center gap-2 border-b border-surfaceHigh px-2">
        <button
          type="button"
          aria-label="Back to scripts"
          onClick={() => void handleBack()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-textMuted transition-colors duration-150 hover:bg-surfaceHigh hover:text-textPrimary"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="min-w-0 flex-1 truncate font-semibold">{script.title}</h1>
        <ExportButton
          clips={clips}
          scriptTitle={script.title}
          disabled={loading || trimClip !== null || recorderState === 'recording' || recorderState === 'processing'}
          showToast={showToast}
        />
      </header>

      <section
        data-testid="script-zone"
        className="overflow-y-auto border-b border-surfaceHigh px-4 py-3"
        style={{ height: 'calc((100dvh - 56px) * 0.55)' }}
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {script.paragraphs.map((paragraph) => (
            <button
              key={paragraph.id}
              type="button"
              onPointerDown={() => handleParagraphPointerDown(paragraph.id)}
              onClick={() => handleParagraphTap(paragraph.id)}
              className={`min-h-12 rounded-r-lg border-l-2 p-3 text-left leading-relaxed transition-colors duration-150 ${paragraphTextSize} ${
                paragraph.id === activeParagraphId
                  ? 'border-accent bg-activePara'
                  : 'border-transparent bg-transparent'
              } ${
                paragraph.id === flashedParagraphId ? 'opacity-50' : 'opacity-100'
              }`}
            >
              {paragraph.text || (
                <span className="text-textMuted">Empty paragraph</span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section
        data-testid="control-zone"
        className="overflow-hidden bg-surface p-2"
        style={{ height: 'calc((100dvh - 56px) * 0.45)' }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-textMuted">
            Loading session…
          </div>
        ) : (
          <ControlBar
            clips={clips}
            totalDuration={totalDuration}
            selectedClipId={selectedClipId}
            currentClipId={currentClipId}
            playing={playing}
            playbackProgress={playbackProgress}
            recorderState={recorderState}
            elapsed={elapsed}
            onSelectClip={setSelectedClipId}
            onPlayClip={handlePlayClip}
            onDeleteClip={handleDeleteClip}
            onRecord={handleRecord}
            onOpenTrim={handleOpenTrim}
            onRedo={handleRedo}
            onPlayAll={handlePlayAll}
          />
        )}
      </section>

      <Toast toast={toast} />

      {trimClip && (
        <TrimEditor
          clip={trimClip}
          clipNumber={clips.length}
          onApply={handleApplyTrim}
          onReset={handleResetTrim}
          onCancel={() => window.history.back()}
          onError={handleTrimError}
        />
      )}

      {showLeaveDialog && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
          <section role="alertdialog" aria-labelledby="leave-title" className="w-full max-w-sm rounded-xl border border-surfaceHigh bg-surface p-5">
            <h2 id="leave-title" className="text-lg font-semibold">Leave recording?</h2>
            <p className="mt-2 text-sm leading-6 text-textMuted">
              Your session is saved and you can return to it.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLeaveDialog(false)}
                className="min-h-12 rounded-lg px-4 text-textMuted transition-colors duration-150 hover:bg-surfaceHigh"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  stopPlayback()
                  navigate('/')
                }}
                className="min-h-12 rounded-lg bg-accent px-4 font-medium text-bg transition-colors duration-150 hover:bg-accentLight"
              >
                Leave
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
