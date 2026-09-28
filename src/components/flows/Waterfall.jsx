import { Bar, Tag, Caveat, DataTable, Th } from '../primitives/index.js'

/**
 * Waterfall — where one dollar of a route's money lands, drawn as nested proportions.
 *
 * A Sankey was the obvious choice and is the wrong one. A Sankey implies conservation and a precision that
 * published RANGES cannot support, it is hard to make readable by anything but an eye, and it draws a network
 * where the truth is a tree of splits. Nested bars say the true thing: each row is a share of the row it is
 * indented under, the indentation IS the "out of whose money", and a range can be drawn as a band rather than
 * collapsed to a point.
 *
 * It is a real `<table>` because it is a table — three columns, a caption, and a header a screen reader can use.
 * The bar is the second mark on the figure, never the only one, so nothing here depends on seeing a width.
 *
 * Three things this renders that a normal chart does not, and they are the reason the page is worth having:
 *
 * - **A band, where the record holds a range.** "15–25%" draws as a range and reads as one. No midpoints.
 * - **A row with no number.** Where nobody publishes the split, the row says so and gives the reason, in the
 *   place a figure would otherwise sit. An empty cell would read as a rendering bug; this reads as a finding.
 * - **A branch measured against itself.** Where a branch's own share of the dollar is unpublished but the splits
 *   inside it are known, its rows are proportions OF THE BRANCH and are labelled that way. The alternative is
 *   multiplying a known split by an unknown base, which would be inventing the base.
 */

const TONE = { recording: 'recording', publishing: 'publishing', other: 'ink', ink: 'ink' }

/** A share of the unit as cents in the dollar — the form people actually reason in. */
const cents = (share) => `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}¢`
const pct = (v) => `${Number(v).toFixed(Number(v) % 1 === 0 ? 0 : 1)}%`

function Figure({ row }) {
  if (row.state === 'undisclosed') {
    return <span className="t-small text-ink-4 italic">not disclosed</span>
  }
  if (row.state === 'split-unknown') {
    return <span className="t-small text-ink-4 italic">share not published</span>
  }
  // One code path for both bases. A relative row is a proportion of its own branch and says so in the column
  // heading; an absolute row is cents in the dollar. The BAND is computed on the same base as the figure beside
  // it either way, so a cell can never show a figure and a range measured against two different things.
  const show = row.relative ? (v) => pct(v * 100) : cents
  const band = row.low != null && row.high != null && row.low !== row.high
  // A row with a band and no point is a figure the source declined to collapse — Bandcamp states payment
  // processing as "4–7%" and names no typical figure. It is shown as the range it is, with no midpoint invented
  // to give the column something tidy to align on.
  if (row.share == null && band) {
    return (
      <span className="t-data text-ink-1">
        {show(row.low)}–{show(row.high)}
        {row.relative && <span className="t-micro text-ink-4 ml-1">of the route</span>}
      </span>
    )
  }
  return (
    <span className={`t-data ${row.relative ? 'text-ink-2' : 'text-ink-1'}`}>
      {show(row.share)}
      {band && <span className="t-micro text-ink-4 ml-1">({show(row.low)}–{show(row.high)})</span>}
      {row.relative && <span className="t-micro text-ink-4 ml-1">of the route</span>}
    </span>
  )
}

function Row({ row, onSelectNode }) {
  const indent = Math.min(row.depth, 4) * 14
  const tone = TONE[row.tone] || (row.depth === 0 ? 'accent' : 'secondary-soft')
  const missing = row.state === 'undisclosed' || row.state === 'split-unknown'
  // A band-only row draws to its LOW in the solid tone and carries the rest of the range in a soft one: the
  // certain part and the uncertain part, distinguishable, with neither overstated.
  const width = missing ? 0 : row.share ?? row.low
  const segments = !missing && row.share == null && row.low != null
    ? [{ share: row.low, tone: TONE[row.tone] || 'secondary' }, { share: row.high - row.low, tone: 'secondary-soft' }]
    : null
  // A relative row is drawn against its own branch, so its bar is honest only within that block; it gets the
  // muted track so it never reads as the same scale as the rows above it.
  return (
    <tr className={row.depth === 0 ? 'border-t border-line-2' : ''}>
      <td className="py-1.5 pr-3 align-top" style={{ paddingLeft: indent }}>
        <span className={`t-small ${row.depth === 0 ? 'text-ink-1' : 'text-ink-2'} block leading-tight`}>
          {row.node
            ? <button type="button" onClick={() => onSelectNode?.(row.node)}
                className="bg-transparent border-0 p-0 cursor-pointer text-left text-inherit hover:text-accent underline decoration-dotted decoration-line-2 underline-offset-2">
                {row.label}
              </button>
            : row.label}
        </span>
        {row.sub && <span className="t-micro text-ink-4 block leading-tight mt-0.5">{row.sub}</span>}
      </td>
      <td className="py-1.5 px-3 align-top w-[34%]">
        <div className="flex flex-col gap-1">
          <Figure row={row} />
          {!missing && (
            <Bar share={width} segments={segments} tone={tone} height="h-1.5" track={row.relative ? 'bg-ground-2' : 'bg-ground-3'}
              label={`${row.label}: ${row.share == null ? `${cents(row.low)} to ${cents(row.high)}` : row.relative ? pct(row.share * 100) : cents(row.share)}`} />
          )}
          {missing && <div className="h-1.5 rounded-sm border border-dashed border-line-2" aria-hidden="true" />}
        </div>
      </td>
      <td className="py-1.5 pl-3 align-top t-micro text-ink-3 w-[32%]">
        {row.why || row.rate?.note || (row.rest ? 'the remainder of the line above' : '')}
        {row.rate?.verify && <Tag tone="danger" className="ml-1.5">verify</Tag>}
      </td>
    </tr>
  )
}

export function Waterfall({ waterfall, onSelectNode }) {
  if (!waterfall) return null
  const { scenario, rows, undisclosed, unverified } = waterfall
  const tails = rows.filter((r) => r.tail)
  return (
    <section aria-label={`Where one dollar goes: ${scenario.label}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1">
        <h3 className="t-h3 text-ink-1 m-0">Where the dollar goes</h3>
        <span className="t-micro text-ink-4">unit: {scenario.unit}</span>
      </div>
      <p className="t-small text-ink-2 m-0 mb-4 max-w-3xl">{scenario.lede}</p>

      <DataTable minWidth={640} caption={`Each step's share of ${scenario.unit}, indented under the step it is paid out of.`}>
        <thead>
          <tr>
            <Th>Step</Th>
            <Th>Share of the dollar</Th>
            <Th>On what basis</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => <Row key={r.id} row={r} onSelectNode={onSelectNode} />)}
        </tbody>
      </DataTable>

      <div className="mt-3 flex flex-col gap-2 max-w-3xl">
        {tails.map((r) => (
          <p key={r.tail.id} className="t-micro text-ink-3 m-0">
            <span className="text-ink-2">{r.label}:</span> {r.tail.label}
            {r.tail.node && <> — <button type="button" onClick={() => onSelectNode?.(r.tail.node)} className="bg-transparent border-0 p-0 cursor-pointer text-accent underline decoration-dotted underline-offset-2">see the stage</button></>}.
          </p>
        ))}
        {scenario.note && <p className="t-small text-ink-2 m-0">{scenario.note}</p>}

        <Caveat more={(
          <>
            {scenario.unitNote}{' '}
            Every rate here is read from the stage economics on this page, which are published ranges, statutory
            schedules and rules of thumb — never the terms of any particular deal. Where the record holds a range
            the row shows the range; a midpoint is never presented as a rate.
            {undisclosed.length > 0 && <> {undisclosed.length} step{undisclosed.length === 1 ? '' : 's'} on this route {undisclosed.length === 1 ? 'has' : 'have'} no published figure at all, and {undisclosed.length === 1 ? 'says' : 'say'} so rather than carrying an estimate.</>}
            {unverified.length > 0 && <> {unverified.length} rate{unverified.length === 1 ? ' is' : 's are'} marked unverified on the record and {unverified.length === 1 ? 'is' : 'are'} tagged in the table.</>}
          </>
        )}>
          One dollar of a published unit, divided at published rates — not an estimate of what anyone earns.
        </Caveat>
      </div>
    </section>
  )
}
