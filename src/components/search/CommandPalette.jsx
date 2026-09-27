import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft, ArrowUp, ArrowDown, X } from 'lucide-react'
import { search, groupResults, handoffs } from '../../utils/search.js'
import { readRecents, pushRecent } from '../../utils/recents.js'

/** The group heading names the kind; the dot just keeps the kinds apart when the eye scans a mixed list. */
const KIND_DOT = { entity: 'bg-accent', view: 'bg-secondary', page: 'bg-ink-4', deal: 'bg-money', term: 'bg-secondary', handoff: 'bg-ink-4' }

/**
 * One search across everything, over the page rather than on it.
 *
 * Opened with ⌘K / Ctrl+K, or `/` when the focus is not already in a field. It is a dialog with a combobox
 * inside: the input keeps focus and owns the keyboard, the list is a listbox whose active option is announced
 * through `aria-activedescendant`, and Escape returns focus to whatever opened it. Everything it can find is
 * indexed from the records themselves; the live feed and the archive are served, so those become explicit
 * hand-offs to the pages that can search them rather than silently missing results.
 */
export function CommandPalette({ onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const opener = useRef(null)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  // Mounted only while open (see App), so the last search is never waiting in the box on the next visit.
  const [recents] = useState(readRecents)

  // Results, or — before anything is typed — what this reader last opened.
  const results = useMemo(() => (q.trim() ? [...search(q), ...handoffs(q)] : recents), [q, recents])
  const groups = useMemo(() => {
    if (!q.trim()) return recents.length ? [{ id: 'recent', label: 'Recently opened', items: recents }] : []
    const hand = results.filter((r) => r.kind === 'handoff')
    return [...groupResults(results), ...(hand.length ? [{ id: 'handoff', label: 'Search where the records live', items: hand }] : [])]
  }, [q, results, recents])
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])

  // Remember what had focus, then take it. Both are external-system work, so they belong in an effect.
  useEffect(() => {
    opener.current = document.activeElement
    inputRef.current?.focus()
  }, [])

  // Keep the highlighted row in view when the keyboard moves it.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const close = () => {
    onClose()
    const back = opener.current
    requestAnimationFrame(() => (back instanceof HTMLElement ? back.focus() : null))
  }

  const go = (item) => {
    if (!item) return
    pushRecent(item)
    // Navigate BEFORE closing: closing unmounts this component, and a navigation issued from an unmounted
    // component never happens. Focus goes to the new page, so there is nothing to restore here.
    navigate(item.to)
    opener.current = null
    onClose()
  }

  const onKeyDown = (ev) => {
    if (ev.key === 'Escape') { ev.preventDefault(); close(); return }
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setActive((i) => (flat.length ? (i + 1) % flat.length : 0)); return }
    if (ev.key === 'ArrowUp') { ev.preventDefault(); setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0)); return }
    if (ev.key === 'Home') { ev.preventDefault(); setActive(0); return }
    if (ev.key === 'End') { ev.preventDefault(); setActive(Math.max(0, flat.length - 1)); return }
    if (ev.key === 'Enter') { ev.preventDefault(); go(flat[active]) }
  }

  let index = -1
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]" role="presentation">
      <button type="button" aria-label="Close search" onClick={close}
        className="absolute inset-0 bg-ground-0/80 border-0 cursor-default motion-safe:animate-[mm-fade-in_120ms_ease-out]" />

      <div role="dialog" aria-modal="true" aria-label="Search everything"
        className="relative w-full max-w-2xl bg-ground-1 border border-line-2 rounded-lg shadow-2xl overflow-hidden motion-safe:animate-[mm-rise_140ms_ease-out]">
        <div className="flex items-center gap-2.5 px-4 border-b border-line-1">
          <Search size={16} className="text-ink-3 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            value={q}
            onChange={(ev) => { setQ(ev.target.value); setActive(0) }}
            onKeyDown={onKeyDown}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="mm-search-list"
            aria-activedescendant={flat[active] ? `mm-result-${active}` : undefined}
            aria-label="Search companies, deals, terms and pages"
            placeholder="Search companies, deals, terms and pages…"
            autoComplete="off"
            spellCheck="false"
            className="flex-1 h-14 bg-transparent border-0 t-body text-ink-1 placeholder:text-ink-4 outline-none"
          />
          <button type="button" onClick={close} aria-label="Close search"
            className="shrink-0 w-7 h-7 grid place-items-center rounded-md border border-line-2 bg-transparent text-ink-3 cursor-pointer hover:bg-ground-3 hover:text-ink-1"><X size={14} aria-hidden="true" /></button>
        </div>

        <div ref={listRef} id="mm-search-list" role="listbox" aria-label="Results" className="max-h-[52vh] overflow-y-auto py-2">
          {groups.length === 0 && (
            <div className="px-4 py-6">
              {q.trim()
                ? <>
                    <p className="t-small text-ink-2 m-0">Nothing on the canvas matches “{q}”.</p>
                    <p className="t-micro text-ink-3 m-0 mt-1">The live feed and the news archive are searched on their own pages — try one of the hand-offs below, or check the spelling.</p>
                  </>
                : <p className="t-small text-ink-3 m-0">Type a company, a deal, a term like “EBITDA”, or a word the industry uses — “majors”, “PRO”, “securitisation”.</p>}
            </div>
          )}

          {groups.map((g) => (
            <div key={g.id} className="mb-1 last:mb-0">
              <div className="px-4 py-1 t-eyebrow text-ink-4">{g.label}</div>
              {g.items.map((item) => {
                index += 1
                const i = index
                const on = i === active
                return (
                  <div
                    key={item.id}
                    id={`mm-result-${i}`}
                    role="option"
                    aria-selected={on}
                    data-active={on}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(item)}
                    className={`px-4 py-2 flex items-baseline gap-3 border-l-2 cursor-pointer ${on ? 'bg-ground-3 border-accent' : 'border-transparent'}`}
                  >
                    <span aria-hidden="true" className={`shrink-0 w-1.5 h-1.5 rounded-full self-center ${KIND_DOT[item.kind] || 'bg-ink-4'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block t-small text-ink-1 truncate">{item.title}</span>
                      {item.subtitle && <span className="block t-micro text-ink-3 truncate">{item.subtitle}</span>}
                    </span>
                    {item.meta && <span className="shrink-0 t-micro font-mono text-ink-4">{item.meta}</span>}
                    {item.aliasLabel && <span className="shrink-0 t-micro text-ink-4">{item.aliasLabel}</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 px-4 py-2 border-t border-line-1 t-micro text-ink-4">
          <span className="inline-flex items-center gap-1"><ArrowUp size={11} aria-hidden="true" /><ArrowDown size={11} aria-hidden="true" />to move</span>
          <span className="inline-flex items-center gap-1"><CornerDownLeft size={11} aria-hidden="true" />to open</span>
          <span>esc to close</span>
          <span className="ml-auto">{q.trim() ? `${flat.length} result${flat.length === 1 ? '' : 's'}` : 'everything on the canvas'}</span>
        </div>
      </div>
    </div>
  )
}
