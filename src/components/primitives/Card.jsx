/**
 * Card — ground-1 surface with a hairline. Elevation on dark ground is a lighter ground, not a shadow.
 * `tone` adds a 2px left rule in the flow/accent colour for recording/publishing-tagged content.
 */
const TONE_RULE = {
  recording: 'border-l-2 border-l-recording',
  publishing: 'border-l-2 border-l-publishing',
  accent: 'border-l-2 border-l-accent',
  danger: 'border-l-2 border-l-danger',
}
const PAD = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-6' }

export function Card({ children, tone, pad = 'md', interactive = false, className = '', as: Tag = 'div', ...rest }) {
  const rounded = tone ? 'rounded-r-lg' : 'rounded-lg'
  return (
    <Tag
      className={[
        'bg-ground-1 border border-line-1', rounded, PAD[pad] ?? PAD.md,
        tone ? TONE_RULE[tone] : '',
        interactive ? 'transition-colors duration-200 hover:bg-ground-2 hover:border-line-2 cursor-pointer' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  )
}
