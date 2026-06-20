import { useCallback, useEffect, useRef, useState } from 'react'

export type ToastKind = 'success' | 'warn' | 'error'

export interface ToastMessage {
  id: number
  message: string
  kind: ToastKind
}

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const timerRef = useRef<number | null>(null)

  const showToast = useCallback((
    message: string,
    kind: ToastKind = 'success',
  ) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    setToast({ id: Date.now(), message, kind })
    timerRef.current = window.setTimeout(() => {
      setToast(null)
      timerRef.current = null
    }, 2500)
  }, [])

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
  }, [])

  return { toast, showToast }
}
