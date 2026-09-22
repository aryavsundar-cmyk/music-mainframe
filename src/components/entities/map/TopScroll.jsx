import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const STEP = 292 // one column and its gap

/**
 * A horizontal scrubber that sits ABOVE a wide, sideways-scrolling region and sticks to the top of the window, so
 * the map can be moved without first scrolling to the bottom of its longest column. Not a mirrored native
 * scrollbar: macOS hides those until you scroll, which would make this invisible. Drag the thumb, click the
 * track, use the arrows, or focus it and use ← → Home End. It names the stages in view.
 */
export function TopScroll({ target, label = 'Scroll the map sideways' }) {
  const track = useRef(null)
  const drag = useRef(null)
  const [s, setS] = useState({ left: 0, width: 1, client: 1, visible: '' })

  useEffect(() => {
    const el = target.current
    if (!el) return undefined
    const measure = () => {
      const lo = el.scrollLeft
      const hi = lo + el.clientWidth
      const names = [...el.querySelectorAll('section[aria-label]')]
        .filter((c) => c.offsetLeft + c.offsetWidth / 2 > lo && c.offsetLeft + c.offsetWidth / 2 < hi)
        .map((c) => c.getAttribute('aria-label'))
      const visible = names.length ? (names.length === 1 ? names[0] : `${names[0]} → ${names.at(-1)}`) : ''
      setS({ left: lo, width: el.scrollWidth, client: el.clientWidth, visible })
    }
    el.addEventListener('scroll', measure, { passive: true })
    // A ResizeObserver reports once on observe, which gives the first measurement without a render-time read.
    // Watch the columns too: the inner row is exactly as wide as the viewport, so it never resizes when the
    // content starts to overflow (a late stylesheet, a filter change) — the columns do.
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const watchColumns = () => el.querySelectorAll('section[aria-label]').forEach((c) => ro.observe(c))
    watchColumns()
    const mo = new MutationObserver(() => { watchColumns(); measure() })
    mo.observe(el, { childList: true, subtree: false })
    if (el.firstElementChild) mo.observe(el.firstElementChild, { childList: true })
    window.addEventListener('resize', measure)
    // Observers only report on rendered frames, which a throttled or background tab may not produce; measure on
    // timers too, once now and once after late styles and fonts.
    const timers = [setTimeout(measure, 0), setTimeout(measure, 600)]
    return () => { el.removeEventListener('scroll', measure); window.removeEventListener('resize', measure); ro.disconnect(); mo.disconnect(); timers.forEach(clearTimeout) }
  }, [target])

  const max = Math.max(0, s.width - s.client)
  if (max <= 1) return null
  const thumbPct = (s.client / s.width) * 100
  const leftPct = (s.left / s.width) * 100
  const to = (x, smooth = false) => target.current?.scrollTo({ left: Math.max(0, Math.min(max, x)), behavior: smooth ? 'smooth' : 'auto' })
  const by = (dx) => to(s.left + dx, true)

  const onTrackDown = (ev) => {
    if (ev.target !== track.current) return
    const r = track.current.getBoundingClientRect()
    to(((ev.clientX - r.left) / r.width) * s.width - s.client / 2, true)
  }
  const onThumbDown = (ev) => {
    ev.preventDefault()
    ev.currentTarget.setPointerCapture(ev.pointerId)
    drag.current = { x: ev.clientX, left: s.left, ratio: s.width / track.current.getBoundingClientRect().width }
  }
  const onThumbMove = (ev) => { if (drag.current) to(drag.current.left + (ev.clientX - drag.current.x) * drag.current.ratio) }
  const onThumbUp = () => { drag.current = null }
  const onKey = (ev) => {
    const k = { ArrowLeft: -STEP, ArrowRight: STEP, PageUp: -s.client, PageDown: s.client }[ev.key]
    if (k) { ev.preventDefault(); by(k) }
    if (ev.key === 'Home') { ev.preventDefault(); to(0, true) }
    if (ev.key === 'End') { ev.preventDefault(); to(max, true) }
  }
  const btn = 'shrink-0 w-7 h-7 grid place-items-center rounded-md border border-line-2 bg-ground-1 text-ink-2 cursor-pointer hover:bg-ground-3 hover:text-ink-1 disabled:opacity-40 disabled:cursor-default disabled:hover:bg-ground-1'

  return (
    <div className="sticky top-0 z-30 -mx-gutter px-gutter py-2 mb-3 bg-ground-0 border-b border-line-1 flex items-center gap-3">
      <button type="button" className={btn} onClick={() => by(-STEP)} disabled={s.left <= 0} aria-label="Previous stage"><ChevronLeft size={15} aria-hidden="true" /></button>
      <div ref={track} onPointerDown={onTrackDown}
        role="scrollbar" aria-orientation="horizontal" aria-label={label} aria-valuemin={0} aria-valuemax={Math.round(max)} aria-valuenow={Math.round(s.left)}
        aria-valuetext={s.visible ? `Showing ${s.visible}` : undefined} tabIndex={0} onKeyDown={onKey}
        className="relative flex-1 h-3 rounded-full bg-ground-3 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <div onPointerDown={onThumbDown} onPointerMove={onThumbMove} onPointerUp={onThumbUp} onPointerCancel={onThumbUp}
          className="absolute top-0 bottom-0 rounded-full bg-ink-4 hover:bg-ink-3 active:bg-accent cursor-grab active:cursor-grabbing touch-none"
          style={{ left: `${leftPct}%`, width: `${Math.max(thumbPct, 6)}%` }} />
      </div>
      <button type="button" className={btn} onClick={() => by(STEP)} disabled={s.left >= max - 1} aria-label="Next stage"><ChevronRight size={15} aria-hidden="true" /></button>
      <span className="hidden md:block t-micro text-ink-3 whitespace-nowrap min-w-[16rem] text-right truncate">{s.visible}</span>
    </div>
  )
}
