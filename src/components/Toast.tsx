import type { ToastMessage } from '../hooks/useToast'

export default function Toast({ toast }: { toast: ToastMessage | null }) {
  if (!toast) return null

  const colors = {
    success: 'bg-accent text-bg',
    warn: 'bg-amber-500 text-bg',
    error: 'bg-danger text-white',
  }[toast.kind]

  return (
    <div
      key={toast.id}
      role="status"
      className={`fixed bottom-[calc(45dvh+8px)] left-1/2 z-[100] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-full px-4 py-2 text-center text-sm font-medium ${colors}`}
    >
      {toast.message}
    </div>
  )
}
