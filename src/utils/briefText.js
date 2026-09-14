/** briefText.js — plain-text renderer. Section eyebrows use the ▎ glyph and § numbering (Patterns §4). */
const W = 96
const wrap = (text, indent = 0) => {
  const pad = ' '.repeat(indent); const out = []; let line = pad
  for (const word of String(text).split(/\s+/)) {
    if ((line + word).length > W && line.trim()) { out.push(line.trimEnd()); line = pad }
    line += (line.trim() ? ' ' : '') + word
  }
  if (line.trim()) out.push(line.trimEnd()); return out.join('\n')
}
const rule = (ch = '─') => ch.repeat(W)

function block(b) {
  switch (b.kind) {
    case 'paragraph': return wrap(b.text)
    case 'note': return wrap(`Note: ${b.text}`)
    case 'bullets': return b.items.map((it) => wrap(`• ${it}`, 0).replace(/\n/g, '\n  ')).join('\n')
    case 'facts': { const w = Math.max(...b.rows.map(([k]) => k.length)); return b.rows.map(([k, v]) => `${k.padEnd(w)}  ${v}`).join('\n') }
    case 'stats': return b.items.map((s) => `${s.label}: ${s.value}${s.hint ? `  (${s.hint})` : ''}`).join('\n')
    case 'table': {
      const cols = b.columns.map((c, i) => Math.min(48, Math.max(c.length, ...b.rows.map((r) => String(r[i] ?? '').length))))
      // Give the last column whatever width is left so reform/headline text isn't clipped at 48.
      const used = cols.slice(0, -1).reduce((a, n) => a + n + 2, 0)
      cols[cols.length - 1] = Math.max(cols[cols.length - 1], Math.min(W - used, Math.max(...b.rows.map((r) => String(r[cols.length - 1] ?? '').length))))
      const line = (r) => r.map((c, i) => String(c ?? '').slice(0, cols[i]).padEnd(cols[i])).join('  ')
      return [line(b.columns), cols.map((n) => '─'.repeat(n)).join('  '), ...b.rows.map(line)].join('\n')
    }
    default: return ''
  }
}

export function renderBriefText(brief) {
  const head = [rule('═'), `MAINFRAME · MUSIC`, brief.title.toUpperCase(), brief.subtitle, `Generated ${brief.generatedAt.slice(0, 16).replace('T', ' ')}Z · record as of ${brief.asOf}`, rule('═'), '']
  const body = brief.sections.map((s) => [`▎ § ${String(s.num).padStart(2, '0')} — ${s.eyebrow.toUpperCase()}`, s.title, rule(), s.blocks.map(block).join('\n\n'), ''].join('\n'))
  return [...head, ...body].join('\n')
}
