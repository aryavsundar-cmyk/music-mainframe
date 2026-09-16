import { Card } from '../primitives/index.js'

const ago = (iso) => {
  if (!iso) return 'never'
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.round(mins / 60)
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}

/** Which enrichment connectors are actually working, and what they last brought in. */
export function ConnectorStatus({ connectors = [], ready = false }) {
  if (!ready) return <Card pad="md"><p className="t-small text-ink-3 m-0">Checking the enrichment connectors…</p></Card>
  if (!connectors.length) return <Card pad="md"><p className="t-small text-ink-3 m-0">The enrichment service is unreachable. Scores fall back to the sourced records in the app, which is why some of them look quieter than usual.</p></Card>
  return (
    <Card pad="md">
      <div className="t-eyebrow text-ink-3 mb-2">Enrichment connectors</div>
      <div className="space-y-2">
        {connectors.map((c) => (
          <div key={c.id} className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="inline-flex items-center gap-2 min-w-0">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${c.live ? 'bg-secondary' : 'bg-danger'}`} aria-hidden="true" />
              <span className="t-small text-ink-1">{c.label}</span>
              <span className="t-micro text-ink-3">{c.coverage || `${c.sources} sources`}</span>
            </span>
            <span className="t-micro font-mono tabular text-ink-3">
              {c.items} items · {ago(c.lastSuccess)}{c.errors ? ` · ${c.errors} source error${c.errors === 1 ? '' : 's'}` : ''}
            </span>
          </div>
        ))}
      </div>
      {connectors.filter((c) => !c.live).map((c) => (
        <p key={c.id} className="t-micro text-danger mt-2 mb-0">
          {c.label} is down, so scores exclude its signals.{c.lastError ? ` ${c.lastError}` : ''}{c.hint ? ` ${c.hint}` : ''}
        </p>
      ))}
    </Card>
  )
}
