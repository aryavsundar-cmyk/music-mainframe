import { useEffect, useRef } from 'react'

/**
 * useDismissable — Escape closes it, and focus goes back where it came from.
 *
 * The entity map's drawer did this correctly and nothing else did: the flows panel, the holding panel, the
 * account panel, the force panel and the export menu all opened with no Escape key and dropped focus to the body
 * when they closed. One hook, so the behaviour cannot drift apart again.
 *
 * `open` is whether the thing is showing; `onClose` is called on Escape. Attach `ref` to the panel to move focus
 * into it on open — pass `focus: false` for a panel that should not steal focus (an inline disclosure).
 */
export function useDismissable(open, onClose, { focus = true } = {}) {
  const ref = useRef(null)
  const opener = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const panel = ref.current
    opener.current = document.activeElement
    if (focus) {
      const target = panel?.matches?.('[tabindex], button, a, input') ? panel : panel?.querySelector('[tabindex="-1"], h2, h3, button, a, input')
      target?.focus?.({ preventScroll: true })
    }
    const onKey = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      const back = opener.current
      // Only take focus back if it is still inside the thing being closed.
      if (back instanceof HTMLElement && (!document.activeElement || document.activeElement === document.body || panel?.contains(document.activeElement))) {
        requestAnimationFrame(() => back.focus({ preventScroll: true }))
      }
    }
  }, [open, onClose, focus])

  return ref
}
