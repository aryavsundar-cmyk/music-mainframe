import { Search } from 'lucide-react'

/**
 * SearchInput — one search box.
 *
 * There were five, and they disagreed on everything a reader notices: three heights, two of them with the magnifier
 * and three without, two indents, and one that forgot `outline-none` so it drew the browser's own focus ring inside
 * a border that already had a focus colour. None of that was decided; it accumulated.
 *
 * `size` is the only axis: `md` for a box that leads a page, `sm` for one inside a card or a control row. Everything
 * else — the token colours, the focus treatment, the placeholder — is the same box in every place it appears.
 *
 * A search box with no visible label needs `label`: the placeholder disappears the moment someone types, and a
 * screen reader that only ever had the placeholder is then reading an unnamed field.
 */
const SIZES = {
  md: { box: 'h-9 t-body', pad: 'pl-9 pr-3', bare: 'px-3', icon: 15, at: 'left-3' },
  sm: { box: 'h-8 t-small', pad: 'pl-8 pr-2', bare: 'px-2', icon: 14, at: 'left-2.5' },
}

export function SearchInput({
  value, onChange, placeholder = 'Search', label, size = 'md', icon = true, disabled = false, className = '', ...rest
}) {
  const s = SIZES[size] || SIZES.md
  return (
    <label className={`relative block ${className}`}>
      {icon && <Search size={s.icon} className={`absolute ${s.at} top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none`} aria-hidden="true" />}
      <input
        type="search"
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        placeholder={placeholder}
        aria-label={label || placeholder}
        disabled={disabled}
        className={`w-full ${s.box} ${icon ? s.pad : s.bare} bg-ground-1 border border-line-2 rounded-md text-ink-1 placeholder:text-ink-4 outline-none focus:border-accent disabled:opacity-60`}
        {...rest}
      />
    </label>
  )
}
