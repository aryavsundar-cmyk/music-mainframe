/**
 * eventKeys.js — when two feed items are the same story. Shared by the archive job (server/archive.js) and the
 * browser (utils/forces.js), because the archive and the live feed overlap and must be merged the same way in
 * both places: by id, by URL, or by headline — the aggregator's own dedupe key.
 */

/** Headlines repeat across outlets with small differences. */
export const titleKey = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64)

/** Same page: scheme, www, query strings and fragments do not make a URL different. */
export function urlKey(u) {
  try {
    const x = new URL(u)
    return `${x.hostname.replace(/^www\./, '')}${x.pathname.replace(/\/$/, '')}`.toLowerCase()
  } catch { return String(u || '').toLowerCase() }
}

/** Items from `a`, then items from `b` that are not already in `a`. Order within each is kept. */
export function mergeUnique(a = [], b = []) {
  const ids = new Set(); const urls = new Set(); const titles = new Set()
  const out = []
  for (const x of [...a, ...b]) {
    if (!x?.id) continue
    const u = x.url ? urlKey(x.url) : ''; const k = titleKey(x.title)
    if (ids.has(x.id) || (u && urls.has(u)) || (k && titles.has(k))) continue
    ids.add(x.id); if (u) urls.add(u); if (k) titles.add(k)
    out.push(x)
  }
  return out
}
