import { useCallback, useEffect, useState } from 'react'

const KEY = 'mm-prospect-v1'
export const STATUSES = ['new', 'researching', 'contacted', 'replied', 'meeting', 'proposal', 'parked']
export const STATUS_LABEL = { new: 'New', researching: 'Researching', contacted: 'Contacted', replied: 'Replied', meeting: 'Meeting', proposal: 'Proposal', parked: 'Parked' }

const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } }

/**
 * Per-account prospecting record in localStorage (per browser): status, relationship strength, owner, note,
 * and the date of the last touch. People data never leaves the machine — nothing here is sent anywhere.
 */
export function useProspectRecords() {
  const [records, setRecords] = useState(read)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(records)) } catch { /* storage unavailable */ } }, [records])
  const update = useCallback((id, patch) => setRecords((r) => ({ ...r, [id]: { ...r[id], ...patch, updated: new Date().toISOString().slice(0, 10) } })), [])
  const logOutcome = useCallback((id, outcome) => setRecords((r) => {
    const prev = r[id] || {}
    const entry = { kind: outcome.kind, date: outcome.date || new Date().toISOString().slice(0, 10), note: outcome.note || '' }
    const outcomes = [...(prev.outcomes || []).filter((o) => !(o.kind === entry.kind && o.date === entry.date)), entry]
    return { ...r, [id]: { ...prev, outcomes, status: outcome.status || prev.status, parkedUntil: outcome.parkedUntil ?? prev.parkedUntil, updated: new Date().toISOString().slice(0, 10) } }
  }), [])
  const removeOutcome = useCallback((id, entry) => setRecords((r) => {
    const prev = r[id] || {}
    return { ...r, [id]: { ...prev, outcomes: (prev.outcomes || []).filter((o) => !(o.kind === entry.kind && o.date === entry.date)) } }
  }), [])
  const clear = useCallback((id) => setRecords((r) => { const n = { ...r }; delete n[id]; return n }), [])
  const reset = useCallback(() => setRecords({}), [])
  return { records, update, logOutcome, removeOutcome, clear, reset }
}

export const readProspectRecords = read
