/** briefMarkdown.js — Markdown renderer over the doc model. Used for .md downloads and as Gamma input. */
function block(b) {
  switch (b.kind) {
    case 'paragraph': return b.text
    case 'note': return `> ${b.text}`
    case 'bullets': return b.items.map((it) => `- ${it}`).join('\n')
    case 'facts': return b.rows.map(([k, v]) => `- **${k}:** ${v}`).join('\n')
    case 'stats': return b.items.map((s) => `- **${s.label}:** ${s.value}${s.hint ? ` _(${s.hint})_` : ''}`).join('\n')
    case 'table': {
      const esc = (v) => String(v ?? '').replace(/\|/g, '\\|')
      return [`| ${b.columns.map(esc).join(' | ')} |`, `| ${b.columns.map(() => '---').join(' | ')} |`, ...b.rows.map((r) => `| ${r.map(esc).join(' | ')} |`)].join('\n')
    }
    default: return ''
  }
}

export function renderBriefMarkdown(doc) {
  const head = [`# ${doc.title}`, '', `_${doc.subtitle}_  `, `_Generated ${doc.generatedAt.slice(0, 10)} · record as of ${doc.asOf} · Mainframe · Music_`, '']
  const body = doc.sections.map((s) => [`## § ${String(s.num).padStart(2, '0')} — ${s.eyebrow}: ${s.title}`, '', s.blocks.map(block).join('\n\n'), ''].join('\n'))
  return [...head, ...body].join('\n')
}
