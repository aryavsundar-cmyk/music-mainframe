/**
 * Sparkline — a company's reported record, drawn at the size of a word.
 *
 * A table cell can hold one number or it can hold a shape. The entities table held one: the freshest revenue
 * figure, with no way to see whether it was the top of a climb or the bottom of a fall without opening the company.
 * This draws the years the filings give, inside the row.
 *
 * Two rules, both of them the caller's to keep and both stated here because a chart is the easiest place to lie:
 *
 * - **One currency.** The line has no axis and no labels, so a jump from euros to dollars would read as growth.
 *   `revenueTrend` in `utils/financialConcepts.js` filters to a single currency before returning points.
 * - **Never a lone figure.** Below `min` points there is no shape to see, and a two-point line is a claim about a
 *   direction that one restatement could reverse. It renders nothing rather than a line the reader would trust.
 *
 * The line inherits `currentColor`, so the caller sets the tone with a text token and the mark stays with its
 * figure in both themes. It is decoration for sighted skimming: `aria-label` carries the same fact in words, and
 * the figure beside it is the accessible reading.
 */
export function Sparkline({ points = [], label, width = 52, height = 16, className = '' }) {
  if (points.length < 3) return null
  const values = points.map((p) => p.value)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || Math.abs(hi) || 1
  const pad = 1.5
  const x = (i) => (i / (points.length - 1)) * (width - pad * 2) + pad
  const y = (v) => height - pad - ((v - lo) / span) * (height - pad * 2)
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}
      className={`shrink-0 overflow-visible ${className}`}>
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(last.value)} r="1.75" fill="currentColor" stroke="none" />
    </svg>
  )
}
