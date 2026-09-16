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
  const clear = useCallback((id) => setRecords((r) => { const n = { ...r }; delete n[id]; return n }), [])
  const reset = useCallback(() => setRecords({}), [])
  return { records, update, clear, reset }
}

export const readProspectRecords = read
