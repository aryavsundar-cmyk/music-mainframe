import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const KEY = 'mm-theme'
const read = () => {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch { /* storage unavailable */ }
  return 'dark'
}

/** Dark by default. Persisted per browser. Sets data-theme on <html>; tokens.css does the rest. */
export function useThemeState() {
  const [theme, setTheme] = useState(read)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(KEY, theme) } catch { /* ignore */ }
  }, [theme])
  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  return { theme, setTheme, toggle }
}

export const ThemeContext = createContext({ theme: 'dark', setTheme: () => {}, toggle: () => {} })

/** Read the current theme anywhere below <ThemeContext.Provider> (App). */
export const useTheme = () => useContext(ThemeContext)
