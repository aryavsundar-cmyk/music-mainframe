import { useRef } from 'react'

/**
 * Segmented — one choice out of several, and it says so.
 *
 * Every window switcher, period switcher and direction toggle in the app was a row of `aria-pressed` buttons,
 * which a screen reader announces as several independent switches rather than one choice. This is a radio group:
 * arrow keys move between options, only the selected one is a tab stop, and `aria-checked` states the choice.
 */
export function Segmented({ options, value, onChange, label, className = '' }) {
  const ref = useRef(null)
  const index = Math.max(0, options.findIndex((o) => o.id === value))

  const onKeyDown = (ev) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ev.key]
    if (!delta) return
    ev.preventDefault()
    const next = options[(index + delta + options.length) % options.length]
    onChange(next.id)
    requestAnimationFrame(() => ref.current?.querySelector(`[data-id="${next.id}"]`)?.focus())
  }

  return (
    <div ref={ref} role="radiogroup" aria-label={label} onKeyDown={onKeyDown}
      className={`inline-flex rounded-md border border-line-2 overflow-hidden ${className}`}>
      {options.map((o) => {
        const on = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-id={o.id}
            title={o.hint}
            onClick={() => onChange(o.id)}
            className={[
              'inline-flex items-center gap-1.5 px-2.5 py-1 t-small border-0 cursor-pointer transition-colors duration-100',
              on ? 'bg-ground-4 text-ink-1' : 'bg-transparent text-ink-2 hover:bg-ground-2 hover:text-ink-1',
            ].join(' ')}
          >
            {o.icon}{o.label}
          </button>
        )
      })}
    </div>
  )
}
