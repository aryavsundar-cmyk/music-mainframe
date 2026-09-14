import { Download, Sparkles, ChevronDown, ExternalLink } from 'lucide-react'
import { palette, themes, font, numeric } from '../tokens.js'
import { useTheme } from '../hooks/useTheme.js'
import { PageHeader, SectionHeader, Card, Stat, Num, Tag, Button, Eyebrow, FlowMark } from '../components/primitives/index.js'

const RAMPS = [
  ['shellac', 'Dark ground'], ['paper', 'Light ground'], ['ink', 'Warm neutrals'],
  ['gold', 'Lacquer gold · recording · money'], ['verdigris', 'Verdigris · publishing · rights'], ['vu', 'VU overdrive · semantic only'],
]
const ROLE_GROUPS = [
  ['Ground', ['ground-0', 'ground-1', 'ground-2', 'ground-3', 'ground-4']],
  ['Ink', ['ink-1', 'ink-2', 'ink-3', 'ink-4']],
  ['Line', ['line-1', 'line-2', 'line-3']],
  ['Accent', ['accent', 'accent-hover', 'accent-ink', 'accent-soft', 'accent-line']],
  ['Secondary', ['secondary', 'secondary-hover', 'secondary-ink', 'secondary-soft', 'secondary-line']],
  ['Semantic', ['danger', 'danger-soft', 'recording', 'publishing']],
]
const TYPE = [
  ['t-display', 'Display', 'Concord prices $1.8B royalty ABS'],
  ['t-h1', 'H1', 'Who owns the composition'],
  ['t-h2', 'H2', 'Publishing income flow'],
  ['t-h3', 'H3', 'Tranche structure'],
  ['t-lede', 'Lede', 'Built for operators — deal teams, catalog investors, label BD, artist management.'],
  ['t-body', 'Body', 'Primary Wave, backed by Brookfield, holds stakes in the Bowie, Whitney Houston, and James Brown catalogs.'],
  ['t-small', 'Small', 'Source: Music Business Worldwide · as of Sep 2026'],
  ['t-eyebrow', 'Eyebrow', 'Money · structured finance'],
  ['t-data', 'Data', 'ISRC USUM71703861 · ISWC T-070.234.567-1'],
]

function Swatch({ name, value, dark }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="h-12 rounded-md border border-line-1" style={{ background: value }} />
      <div className="t-micro text-ink-3 truncate">{name}</div>
      <div className="t-micro font-mono text-ink-4 truncate" title={value}>{dark ? value : value}</div>
    </div>
  )
}

export default function DesignSystem() {
  const { theme } = useTheme()
  const t = themes[theme] ?? themes.dark
  return (
    <>
      <PageHeader
        eyebrow="Reference · src/tokens.js"
        title="Design system"
        lede="Both accents are brass. Polished is lacquer gold: recording rights and money. Oxidised is verdigris: publishing rights and counts. Warm/cool is the two-flow split. Ground is shellac by default, manuscript paper in light mode."
        actions={<><Button variant="primary" icon={Sparkles}>Primary CTA</Button><Button variant="secondary" icon={ChevronDown}>Secondary</Button></>}
      />

      <section className="mb-14">
        <SectionHeader eyebrow="Palette" title="Base ramps" aside="mode-stable hex · tokens.palette" />
        <div className="space-y-6">
          {RAMPS.map(([ramp, label]) => (
            <div key={ramp}>
              <div className="t-small text-ink-2 mb-2">{label} <span className="t-micro font-mono text-ink-4 ml-2">palette.{ramp}</span></div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Object.keys(palette[ramp]).length}, minmax(0, 1fr))` }}>
                {Object.entries(palette[ramp]).map(([stop, hex]) => <Swatch key={stop} name={`${ramp}-${stop}`} value={hex} />)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-14">
        <SectionHeader eyebrow="Palette" title="Semantic roles" aside="switch theme in the sidebar — these flip" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {ROLE_GROUPS.map(([group, keys]) => (
            <div key={group}>
              <div className="t-small text-ink-2 mb-2">{group}</div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${keys.length}, minmax(0, 1fr))` }}>
                {keys.map((k) => <Swatch key={k} name={k} value={`var(--mm-${k})`} />)}
              </div>
              <div className="t-micro font-mono text-ink-4 mt-1.5 truncate">{keys.map((k) => t[k]).join(' · ')}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-14">
        <SectionHeader eyebrow="Typography" title="Type scale" aside="Instrument Serif · IBM Plex Sans · IBM Plex Mono" />
        <div className="space-y-5">
          {TYPE.map(([cls, name, sample]) => (
            <div key={cls} className="grid grid-cols-[120px_1fr] gap-6 items-baseline">
              <div className="t-micro font-mono text-ink-4">{cls}<br /><span className="text-ink-3">{name}</span></div>
              <div className={`${cls} text-ink-1 ${cls === 't-eyebrow' ? 'text-accent' : ''} ${cls === 't-data' ? 'text-ink-2' : ''}`}>{sample}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 mt-8">
          {Object.entries(font).map(([k, v]) => (
            <Card key={k} pad="sm"><div className="t-micro text-ink-3 mb-1">font.{k}</div><div className="t-micro font-mono text-ink-2 break-words">{v}</div></Card>
          ))}
        </div>
      </section>

      <section className="mb-14">
        <SectionHeader eyebrow="Numerics" title="Four kinds of number" aside="tokens.numeric · utils/format.js · <Num />" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><Stat label="Money · deal value" kind="money" value={1.8e9} hint="compact currency · gold" /></Card>
          <Card><Stat label="Count · works in collateral" kind="count" value={62000} hint="compact integer · verdigris" /></Card>
          <Card><Stat label="Pct · label share" kind="pct" value={55} hint="one decimal · ink-1" /></Card>
          <Card><Stat label="Rate · per-stream payout" kind="rate" value={0.0032} hint="precise · ink-2" /></Card>
        </div>
        <p className="t-body text-ink-2 mt-6 mb-0 max-w-3xl">
          Inline, the same treatments hold: Sony paid <Num kind="money" value={600e6} /> for half of the Jackson estate&rsquo;s interests;
          Chord Music Partners holds <Num kind="count" value={62000} /> songs; Spotify&rsquo;s premium ARPU moved <Num kind="pct" value={4.2} /> year on year;
          Concord&rsquo;s senior notes priced near <Num kind="rate" value={5.4} opts={{ kind: 'pct' }} />.
          Missing values render as <Num kind="money" value={null} />, never as null.
        </p>
        <div className="t-micro font-mono text-ink-4 mt-3">{Object.entries(numeric).map(([k, v]) => `${k}: ${v.color}/${v.format}`).join('   ')}</div>
      </section>

      <section className="mb-14">
        <SectionHeader eyebrow="Flow language" title="Two rights domains, two rhythms" aside="tokens.flows · <FlowMark /> · Card tone" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card tone="recording" pad="lg">
            <FlowMark flow="recording" className="mb-3" />
            <p className="t-body text-ink-2 m-0">Solid chain. Label → distributor → DSP → consumer, then payout back down the same line. Drawn linear.</p>
          </Card>
          <Card tone="publishing" pad="lg">
            <FlowMark flow="publishing" className="mb-3" />
            <p className="t-body text-ink-2 m-0">Dashed fan. Composition → publisher/admin → PROs, MLC, MROs → DSPs, venues, broadcasters, then collected back in. Drawn as fan-out / collect-in.</p>
          </Card>
        </div>
      </section>

      <section className="mb-14">
        <SectionHeader eyebrow="Components" title="Primitives" aside="src/components/primitives" />
        <div className="space-y-8">
          <div>
            <div className="t-small text-ink-2 mb-3">Buttons — one primary per view</div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button variant="primary" icon={Sparkles}>Export full label brief</Button>
              <Button variant="secondary" icon={Download}>Export</Button>
              <Button variant="ghost" icon={ExternalLink}>Open filing</Button>
              <Button variant="danger">Remove</Button>
              <Button size="sm">Small</Button>
              <Button size="lg" variant="primary">Large primary</Button>
            </div>
          </div>
          <div>
            <div className="t-small text-ink-2 mb-3">Tags — tone encodes meaning</div>
            <div className="flex flex-wrap gap-2 items-center">
              <Tag>label</Tag><Tag>tier 1</Tag><Tag tone="accent">catalog PE</Tag><Tag tone="secondary">PRO</Tag>
              <Tag tone="recording">recording</Tag><Tag tone="publishing">publishing</Tag><Tag tone="danger">litigation</Tag>
              <Tag tone="solid">ABS</Tag><Tag mono>SPOT</Tag><Tag mono>NASDAQ: RSVR</Tag>
            </div>
          </div>
          <div>
            <div className="t-small text-ink-2 mb-3">Eyebrows — numbered only in exports</div>
            <div className="flex flex-wrap gap-8 items-center">
              <Eyebrow>Money · structured finance</Eyebrow>
              <Eyebrow tone="secondary">Rights</Eyebrow>
              <Eyebrow tone="muted">Live</Eyebrow>
              <Eyebrow number={3}>Anchor positioning</Eyebrow>
            </div>
          </div>
          <div>
            <div className="t-small text-ink-2 mb-3">Cards — ground-1 + hairline; interactive lifts to ground-2</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><div className="t-h3 text-ink-1 mb-1">Static</div><div className="t-small text-ink-3">Default surface</div></Card>
              <Card interactive><div className="t-h3 text-ink-1 mb-1">Interactive</div><div className="t-small text-ink-3">Hover to lift</div></Card>
              <Card tone="accent"><div className="t-h3 text-ink-1 mb-1">Accent rule</div><div className="t-small text-ink-3">Left rule, right-rounded</div></Card>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
