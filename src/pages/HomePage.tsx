import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScripts } from '../hooks/useScripts'
import type { Script } from '../types'

const LONG_PRESS_MS = 500

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-12 w-12 items-center justify-center rounded-lg text-textMuted transition-colors duration-150 hover:bg-surfaceHigh hover:text-textPrimary active:bg-surfaceHigh"
    >
      {children}
    </button>
  )
}

function formatEditedAt(timestamp: number): string {
  const edited = new Date(timestamp)
  const today = new Date()
  const editedDay = new Date(
    edited.getFullYear(),
    edited.getMonth(),
    edited.getDate(),
  ).getTime()
  const todayDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime()
  const daysAgo = Math.round((todayDay - editedDay) / 86_400_000)

  if (daysAgo <= 0) return 'Edited today'
  if (daysAgo === 1) return 'Edited yesterday'
  if (daysAgo < 7) return `Edited ${daysAgo} days ago`
  return `Edited ${edited.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`
}

export default function HomePage() {
  const navigate = useNavigate()
  const { scripts, remove } = useScripts()
  const [selectedScript, setSelectedScript] = useState<Script | null>(null)
  const [scriptToDelete, setScriptToDelete] = useState<Script | null>(null)
  const pressTimer = useRef<number | null>(null)
  const longPressTriggered = useRef(false)

  const cancelLongPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const beginLongPress = (script: Script) => {
    cancelLongPress()
    longPressTriggered.current = false
    pressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true
      setSelectedScript(script)
      pressTimer.current = null
    }, LONG_PRESS_MS)
  }

  const openScript = (script: Script) => {
    cancelLongPress()
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }
    navigate(`/record/${script.id}`)
  }

  return (
    <main className="flex h-full flex-col bg-bg text-textPrimary">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-surfaceHigh px-4">
        <h1 className="text-xl font-semibold">VoiceDraft</h1>
        <div className="flex items-center gap-1">
          <IconButton label="Open settings" onClick={() => navigate('/settings')}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1.03H3v-4h.08A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.05V3h4v.08a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 7l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
            </svg>
          </IconButton>
          <IconButton label="New script" onClick={() => navigate('/script/new')}>
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </IconButton>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto p-4">
        {scripts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center pb-14 text-center">
            <button
              type="button"
              aria-label="Create your first script"
              onClick={() => navigate('/script/new')}
              className="mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-accent/40 bg-activePara text-accent transition-colors duration-150 hover:bg-surfaceHigh"
            >
              <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold">No scripts yet</h2>
            <p className="mt-2 text-sm text-textMuted">
              Tap + to write your first script
            </p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
            {scripts.map((script) => (
              <button
                key={script.id}
                type="button"
                onPointerDown={() => beginLongPress(script)}
                onPointerUp={(event) => {
                  if (event.button === 0) openScript(script)
                }}
                onPointerCancel={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onContextMenu={(event) => {
                  event.preventDefault()
                  cancelLongPress()
                  setSelectedScript(script)
                }}
                className="min-h-28 touch-manipulation rounded-xl border border-surfaceHigh bg-surface p-4 text-left transition-colors duration-150 hover:bg-surfaceHigh"
              >
                <span className="block truncate font-medium">{script.title}</span>
                <span className="mt-2 block text-sm text-textMuted">
                  {script.paragraphs.length}{' '}
                  {script.paragraphs.length === 1 ? 'paragraph' : 'paragraphs'}
                </span>
                <span className="mt-1 block text-sm text-textMuted">
                  {formatEditedAt(script.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedScript && (
        <div
          className="fixed inset-0 z-20 flex items-end bg-black/70"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setSelectedScript(null)
          }}
        >
          <section
            role="dialog"
            aria-label={`Actions for ${selectedScript.title}`}
            className="w-full rounded-t-2xl border-t border-surfaceHigh bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-textMuted/50" />
            <p className="mb-3 truncate px-2 font-medium">{selectedScript.title}</p>
            <button
              type="button"
              onClick={() => navigate(`/script/${selectedScript.id}`)}
              className="flex min-h-12 w-full items-center rounded-lg px-3 text-left transition-colors duration-150 hover:bg-surfaceHigh"
            >
              Edit script
            </button>
            <button
              type="button"
              onClick={() => {
                setScriptToDelete(selectedScript)
                setSelectedScript(null)
              }}
              className="flex min-h-12 w-full items-center rounded-lg px-3 text-left text-danger transition-colors duration-150 hover:bg-surfaceHigh"
            >
              Delete
            </button>
          </section>
        </div>
      )}

      {scriptToDelete && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
          <section role="alertdialog" aria-labelledby="delete-title" className="w-full max-w-sm rounded-xl border border-surfaceHigh bg-surface p-5">
            <h2 id="delete-title" className="text-lg font-semibold">Delete script?</h2>
            <p className="mt-2 text-sm leading-6 text-textMuted">
              This removes “{scriptToDelete.title}” from this device.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setScriptToDelete(null)}
                className="min-h-12 rounded-lg px-4 text-textMuted transition-colors duration-150 hover:bg-surfaceHigh"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  remove(scriptToDelete.id)
                  setScriptToDelete(null)
                }}
                className="min-h-12 rounded-lg bg-danger px-4 font-medium text-white transition-colors duration-150 hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
