import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * What should happen when you arrive somewhere: start at the top of the page, unless the link named a row, in
 * which case go to that row.
 *
 * React Router does neither by itself. Without the first, clicking a company 3,000px down the entity table drops
 * you onto the company page 1,869px down — below its name, its back link and its figures, which makes every
 * header and back link in the app unreliable. Without the second, the deal links from the map drawer and the
 * forces panel land at the top of a long page with the row they named far below.
 */
export function useArrival() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      // The row may render a frame later than the route; try now, then once more after paint.
      const find = () => document.getElementById(decodeURIComponent(hash.slice(1)))
      const focus = (el) => {
        if (!el) return false
        el.scrollIntoView({ block: 'start', behavior: 'auto' })
        if (typeof el.focus === 'function') el.focus({ preventScroll: true })
        return true
      }
      if (focus(find())) return undefined
      const id = requestAnimationFrame(() => focus(find()))
      return () => cancelAnimationFrame(id)
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    return undefined
  }, [pathname, hash])
}
