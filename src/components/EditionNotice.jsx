import { Card } from './primitives/index.js'
import { FRAMING, IS_WORK } from '../editions.js'

/**
 * What this build is, said plainly. The research edition is shared with colleagues and may be reviewed by the
 * firm, so it states its own limits on screen rather than relying on anyone having been told.
 */
export function EditionNotice({ compact = false }) {
  if (!IS_WORK) return null
  if (compact) return <p className="t-micro text-ink-3 m-0">{FRAMING.notProduct} {FRAMING.sources}</p>
  return (
    <Card pad="md" className="mt-10">
      <div className="t-eyebrow text-ink-3 mb-2">About this tool</div>
      <div className="space-y-1.5 max-w-3xl">
        <p className="t-small text-ink-2 m-0">{FRAMING.what}</p>
        <p className="t-small text-ink-2 m-0"><span className="text-ink-1">{FRAMING.notProduct}</span> {FRAMING.sources}</p>
        <p className="t-small text-ink-2 m-0">{FRAMING.data}</p>
      </div>
    </Card>
  )
}
