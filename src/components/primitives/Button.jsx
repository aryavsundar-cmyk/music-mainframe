/**
 * Button — one `primary` per view (the "give me everything" CTA); everything else `secondary` or `ghost`.
 * `icon` is a Lucide component rendered at 16px before the label.
 */
const VARIANTS = {
  primary: 'bg-accent text-accent-ink border-accent hover:bg-accent-hover',
  secondary: 'bg-transparent text-ink-1 border-line-2 hover:bg-ground-2 hover:border-line-3',
  ghost: 'bg-transparent text-ink-2 border-transparent hover:bg-ground-2 hover:text-ink-1',
  danger: 'bg-transparent text-danger border-danger/40 hover:bg-danger-soft',
}
const SIZES = { sm: 'h-7 px-2.5 t-small', md: 'h-9 px-3.5 t-small', lg: 'h-11 px-5 t-body' }

export function Button({ children, variant = 'secondary', size = 'md', icon: Icon, className = '', as: Tag = 'button', ...rest }) {
  return (
    <Tag
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md border font-medium select-none',
        'transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant] ?? VARIANTS.secondary, SIZES[size] ?? SIZES.md, className,
      ].join(' ')}
      {...rest}
    >
      {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden="true" />}
      {children}
    </Tag>
  )
}
