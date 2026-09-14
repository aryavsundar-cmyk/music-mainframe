/** Tag — small pill for type, tier, structure, status. Tone encodes meaning; never decorative. */
const TONES = {
  neutral: 'bg-ground-3 text-ink-2 border-line-1',
  accent: 'bg-accent-soft text-accent border-accent-line',
  secondary: 'bg-secondary-soft text-secondary border-secondary-line',
  recording: 'bg-accent-soft text-recording border-accent-line',
  publishing: 'bg-secondary-soft text-publishing border-secondary-line',
  danger: 'bg-danger-soft text-danger border-danger/40',
  solid: 'bg-accent text-accent-ink border-accent',
}

export function Tag({ children, tone = 'neutral', mono = false, className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-sm border px-1.5 py-[1px] t-micro whitespace-nowrap',
        mono ? 'font-mono' : 'font-medium tracking-[0.04em]',
        TONES[tone] ?? TONES.neutral, className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
