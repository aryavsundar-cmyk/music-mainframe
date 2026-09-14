import { NavLink, Route, Routes } from 'react-router-dom'
import { Disc3, Building2, Waypoints, Handshake, Landmark, Layers, Library, ScrollText, Radio, Rss, Palette, Sun, Moon } from 'lucide-react'
import { ThemeContext, useThemeState } from './hooks/useTheme.js'
import Home from './pages/Home.jsx'
import Entities from './pages/Entities.jsx'
import Flows from './pages/Flows.jsx'
import Deals from './pages/Deals.jsx'
import PE from './pages/PE.jsx'
import ABS from './pages/ABS.jsx'
import PROs from './pages/PROs.jsx'
import DSPs from './pages/DSPs.jsx'
import Catalogs from './pages/Catalogs.jsx'
import News from './pages/News.jsx'
import DesignSystem from './pages/DesignSystem.jsx'
import NotFound from './pages/NotFound.jsx'

const NAV = [
  { group: 'Canvas', items: [
    { to: '/', label: 'Overview', icon: Disc3, end: true },
    { to: '/entities', label: 'Entities', icon: Building2 },
    { to: '/flows', label: 'Flows', icon: Waypoints },
  ]},
  { group: 'Money', items: [
    { to: '/deals', label: 'Deals', icon: Handshake },
    { to: '/pe', label: 'PE funds', icon: Landmark },
    { to: '/abs', label: 'ABS', icon: Layers },
    { to: '/catalogs', label: 'Catalog sales', icon: Library },
  ]},
  { group: 'Rights', items: [
    { to: '/pros', label: 'PROs & CMOs', icon: ScrollText },
    { to: '/dsps', label: 'DSPs', icon: Radio },
  ]},
  { group: 'Live', items: [
    { to: '/news', label: 'News', icon: Rss },
  ]},
]

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => [
        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 t-small no-underline transition-colors duration-150',
        isActive ? 'bg-ground-4 text-ink-1' : 'text-ink-2 hover:bg-ground-3 hover:text-ink-1',
      ].join(' ')}
    >
      {({ isActive }) => (
        <>
          <Icon size={16} strokeWidth={1.75} className={isActive ? 'text-accent' : 'text-ink-3'} aria-hidden="true" />
          {label}
        </>
      )}
    </NavLink>
  )
}

export default function App() {
  const themeState = useThemeState()
  const { theme, toggle } = themeState
  return (
    <ThemeContext.Provider value={themeState}>
    <div className="flex min-h-screen">
      <aside className="w-sidebar shrink-0 bg-ground-2 border-r border-line-1 flex flex-col sticky top-0 h-screen">
        <NavLink to="/" className="flex items-center gap-3 px-5 pt-6 pb-5 no-underline border-b border-line-1">
          <span className="relative inline-flex w-7 h-7 items-center justify-center" aria-hidden="true">
            <span className="absolute inset-0 rounded-full border-2 border-accent" />
            <span className="w-2 h-2 rounded-full bg-secondary" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="t-eyebrow text-ink-3">Mainframe</span>
            <span className="font-display text-[1.375rem] text-ink-1 mt-0.5">Music</span>
          </span>
        </NavLink>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="t-micro text-ink-4 uppercase tracking-[0.12em] px-2.5 mb-1.5">{g.group}</div>
              <div className="space-y-0.5">{g.items.map((it) => <NavItem key={it.to} {...it} />)}</div>
            </div>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-line-1 space-y-0.5">
          <NavItem to="/design" label="Design system" icon={Palette} />
          <button
            type="button"
            onClick={toggle}
            className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-1.5 t-small text-ink-2 hover:bg-ground-3 hover:text-ink-1 bg-transparent border-0 cursor-pointer transition-colors duration-150"
          >
            {theme === 'dark' ? <Sun size={16} strokeWidth={1.75} className="text-ink-3" aria-hidden="true" /> : <Moon size={16} strokeWidth={1.75} className="text-ink-3" aria-hidden="true" />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-content-max px-gutter py-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/entities" element={<Entities />} />
            <Route path="/flows/*" element={<Flows />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/pe" element={<PE />} />
            <Route path="/abs" element={<ABS />} />
            <Route path="/pros" element={<PROs />} />
            <Route path="/dsps" element={<DSPs />} />
            <Route path="/catalogs" element={<Catalogs />} />
            <Route path="/news" element={<News />} />
            <Route path="/design" element={<DesignSystem />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
    </div>
    </ThemeContext.Provider>
  )
}
