/**
 * Chip — the one toggle in this app.
 *
 * There were twenty: eleven files declaring `const chip`, one class string copied into ten of them, six padding
 * pairs, two radii and three different treatments for "this is on". Nothing a reader learned on one page carried
 * to the next, which is the whole cost of inconsistency: "only its absence is noticed".
 *
 * `pressed` is for an independent toggle (aria-pressed). A choice that is one-of-several belongs in Segmented,
 * which says so to a screen reader instead of announcing five unrelated switches.
 */
const SIZES = {
  sm: 'px-1.5 py-0.5 t-micro',
  md: 'px-2 py-1 t-small',
}

export function Chip({ pressed = false, size = 'md', count, children, className = '', as: Tag = 'button', ...rest }) {
  const isButton = Tag === 'button'
  return (
    <Tag
      {...(isButton ? { type: 'button', 'aria-pressed': pressed } : {})}
      className={[
        'inline-flex items-center gap-1.5 rounded-sm border select-none whitespace-nowrap no-underline',
        'transition-colors duration-100 cursor-pointer',
        SIZES[size] ?? SIZES.md,
        pressed ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-1 text-ink-2 hover:bg-ground-2 hover:text-ink-1',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
      {count != null && <span className="t-micro font-mono text-ink-3">{count}</span>}
    </Tag>
  )
}
