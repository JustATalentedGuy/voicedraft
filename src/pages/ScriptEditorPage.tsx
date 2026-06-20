import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as storage from '../lib/storage'
import { generateId } from '../lib/utils'
import type { Paragraph, Script } from '../types'

const LONG_PRESS_MS = 500

function createDraft(): Script {
  const now = Date.now()
  return {
    id: generateId(),
    title: '',
    paragraphs: [{ id: generateId(), text: '' }],
    createdAt: now,
    updatedAt: now,
  }
}

export default function ScriptEditorPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isNew = !id
  const [script, setScript] = useState<Script>(() => (
    id ? storage.getScript(id) ?? createDraft() : createDraft()
  ))
  const [deleteParagraphId, setDeleteParagraphId] = useState<string | null>(null)
  const textareaRefs = useRef(new Map<string, HTMLTextAreaElement>())
  const titleRef = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<number | null>(null)
  const paragraphPressTimer = useRef<number | null>(null)
  const lastScheduledScript = useRef(script)

  const saveNow = useCallback((value: Script) => {
    const saved = {
      ...value,
      title: value.title.trim() || 'Untitled',
      updatedAt: Date.now(),
    }
    storage.saveScript(saved)
    return saved
  }, [])

  useEffect(() => {
    if (isNew) titleRef.current?.focus()
  }, [isNew])

  useEffect(() => {
    if (script === lastScheduledScript.current) return
    lastScheduledScript.current = script
    saveTimer.current = window.setTimeout(() => {
      saveNow(script)
    }, 300)
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
    }
  }, [saveNow, script])

  const resizeTextarea = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  useEffect(() => {
    textareaRefs.current.forEach(resizeTextarea)
  }, [script.paragraphs])

  const focusParagraph = (paragraphId: string, cursor?: number) => {
    window.requestAnimationFrame(() => {
      const textarea = textareaRefs.current.get(paragraphId)
      if (!textarea) return
      textarea.focus()
      const position = cursor ?? textarea.value.length
      textarea.setSelectionRange(position, position)
    })
  }

  const updateParagraph = (paragraphId: string, text: string) => {
    setScript((current) => ({
      ...current,
      paragraphs: current.paragraphs.map((paragraph) => (
        paragraph.id === paragraphId ? { ...paragraph, text } : paragraph
      )),
    }))
  }

  const addParagraphAfter = (paragraphId?: string) => {
    const newParagraph: Paragraph = { id: generateId(), text: '' }
    setScript((current) => {
      const paragraphs = [...current.paragraphs]
      const index = paragraphId
        ? paragraphs.findIndex((paragraph) => paragraph.id === paragraphId) + 1
        : paragraphs.length
      paragraphs.splice(index, 0, newParagraph)
      return { ...current, paragraphs }
    })
    focusParagraph(newParagraph.id, 0)
  }

  const handleParagraphKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
    paragraph: Paragraph,
    index: number,
  ) => {
    const textarea = event.currentTarget

    if (
      event.key === 'Enter'
      && !event.shiftKey
      && textarea.selectionStart === paragraph.text.length
      && textarea.selectionEnd === paragraph.text.length
    ) {
      event.preventDefault()
      addParagraphAfter(paragraph.id)
      return
    }

    if (
      event.key === 'Backspace'
      && paragraph.text === ''
      && index > 0
    ) {
      event.preventDefault()
      const previous = script.paragraphs[index - 1]
      setScript((current) => ({
        ...current,
        paragraphs: current.paragraphs.filter(({ id: currentId }) => (
          currentId !== paragraph.id
        )),
      }))
      focusParagraph(previous.id, previous.text.length)
    }
  }

  const beginParagraphLongPress = (
    event: PointerEvent<HTMLTextAreaElement>,
    paragraphId: string,
  ) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (paragraphPressTimer.current !== null) {
      window.clearTimeout(paragraphPressTimer.current)
    }
    paragraphPressTimer.current = window.setTimeout(() => {
      setDeleteParagraphId(paragraphId)
      paragraphPressTimer.current = null
    }, LONG_PRESS_MS)
  }

  const cancelParagraphLongPress = () => {
    if (paragraphPressTimer.current !== null) {
      window.clearTimeout(paragraphPressTimer.current)
      paragraphPressTimer.current = null
    }
  }

  const deleteParagraph = (paragraphId: string) => {
    setScript((current) => {
      if (current.paragraphs.length === 1) {
        return {
          ...current,
          paragraphs: [{ ...current.paragraphs[0], text: '' }],
        }
      }
      return {
        ...current,
        paragraphs: current.paragraphs.filter(({ id: currentId }) => (
          currentId !== paragraphId
        )),
      }
    })
    setDeleteParagraphId(null)
  }

  const goBack = () => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
    saveNow(script)
    navigate('/')
  }

  return (
    <main className="flex h-full flex-col bg-bg text-textPrimary">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-surfaceHigh px-2">
        <button
          type="button"
          aria-label="Back to scripts"
          onClick={goBack}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-textMuted transition-colors duration-150 hover:bg-surfaceHigh hover:text-textPrimary"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <input
          ref={titleRef}
          aria-label="Script title"
          value={script.title}
          onChange={(event) => setScript((current) => ({
            ...current,
            title: event.target.value,
          }))}
          placeholder="Script title"
          className="h-10 min-w-0 flex-1 rounded-lg bg-surfaceHigh px-3 font-medium text-textPrimary outline-none placeholder:text-textMuted focus:ring-1 focus:ring-accent"
        />
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        <div className="mx-auto w-full max-w-2xl">
          {script.paragraphs.map((paragraph, index) => (
            <div key={paragraph.id} className="relative border-b border-surfaceHigh py-4">
              <label className="sr-only" htmlFor={`paragraph-${paragraph.id}`}>
                Paragraph {index + 1}
              </label>
              <textarea
                id={`paragraph-${paragraph.id}`}
                ref={(element) => {
                  if (element) {
                    textareaRefs.current.set(paragraph.id, element)
                    resizeTextarea(element)
                  } else {
                    textareaRefs.current.delete(paragraph.id)
                  }
                }}
                data-paragraph-id={paragraph.id}
                value={paragraph.text}
                rows={1}
                onChange={(event) => {
                  updateParagraph(paragraph.id, event.target.value)
                  resizeTextarea(event.target)
                }}
                onKeyDown={(event) => handleParagraphKeyDown(
                  event,
                  paragraph,
                  index,
                )}
                onPointerDown={(event) => beginParagraphLongPress(
                  event,
                  paragraph.id,
                )}
                onPointerUp={cancelParagraphLongPress}
                onPointerCancel={cancelParagraphLongPress}
                onPointerLeave={cancelParagraphLongPress}
                placeholder={`Paragraph ${index + 1}`}
                className="block min-h-12 w-full resize-none overflow-hidden bg-transparent py-2 text-base leading-7 text-textPrimary outline-none placeholder:text-textMuted"
              />
              {deleteParagraphId === paragraph.id && (
                <button
                  type="button"
                  onClick={() => deleteParagraph(paragraph.id)}
                  className="absolute bottom-2 right-0 z-10 min-h-12 rounded-lg border border-danger/50 bg-surface px-3 text-sm font-medium text-danger transition-colors duration-150 hover:bg-surfaceHigh"
                >
                  Delete paragraph
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addParagraphAfter()}
            className="mt-3 min-h-12 w-full rounded-lg px-3 text-left font-medium text-accent transition-colors duration-150 hover:bg-surface"
          >
            + Add paragraph
          </button>
        </div>
      </section>
    </main>
  )
}
