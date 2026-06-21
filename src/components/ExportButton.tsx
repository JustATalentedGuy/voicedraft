import { useState } from 'react'
import { exportSessionAsWAV } from '../lib/audio'
import type { ToastKind } from '../hooks/useToast'
import type { Clip } from '../types'

function createFilename(title: string): string {
  const printableTitle = Array.from(title)
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
  const safeTitle = printableTitle
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'VoiceDraft'
  const date = new Date().toISOString().slice(0, 10)
  return `${safeTitle}-${date}.wav`
}

export default function ExportButton({
  clips,
  scriptTitle,
  disabled = false,
  showToast,
}: {
  clips: Clip[]
  scriptTitle: string
  disabled?: boolean
  showToast: (message: string, kind?: ToastKind) => void
}) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (clips.length === 0) {
      showToast('No clips to export', 'warn')
      return
    }

    setExporting(true)
    showToast('Preparing export...')

    try {
      const wavBlob = await exportSessionAsWAV(clips)
      const filename = createFilename(scriptTitle)
      const url = URL.createObjectURL(wavBlob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.style.display = 'none'
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      showToast(`Exported: ${filename}`)
    } catch (error) {
      console.error(error)
      showToast('Export failed — try again', 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      type="button"
      aria-label={exporting ? 'Exporting session' : 'Export session'}
      disabled={disabled || exporting}
      onClick={() => void handleExport()}
      className="flex min-h-12 min-w-16 items-center justify-center rounded-lg px-3 font-medium text-accent transition-colors duration-150 hover:bg-surfaceHigh disabled:cursor-wait disabled:opacity-50"
    >
      {exporting ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
      ) : (
        'Export'
      )}
    </button>
  )
}
