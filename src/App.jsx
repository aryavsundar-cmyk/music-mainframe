import { lazy, Suspense } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { BookOpen, Disc3, Building2, Waypoints, Handshake, Landmark, Layers, Library, ScrollText, Radio, Rss, Palette, Sun, Moon, Crosshair, Users, Info, Network } from 'lucide-react'
import { ThemeContext, useThemeState } from './hooks/useTheme.js'
import { CURRENT, has, showsGroup } from './editions.js'
import { PRIVATE_NAV } from './navPrivate.js'
import { EditionNotice } from './components/EditionNotice.jsx'
import Home from './pages/Home.jsx'
import Entities from './pages/Entities.jsx'
import EntityDetail from './pages/EntityDetail.jsx'
import EntityMap from './pages/EntityMap.jsx'
import Flows from './pages/Flows.jsx'
import Deals from './pages/Deals.jsx'
import PE from './pages/PE.jsx'
import PEFundDetail from './pages/PEFundDetail.jsx'
import ABS from './pages/ABS.jsx'
import PROs from './pages/PROs.jsx'
import PRODetail from './pages/PRODetail.jsx'
import DSPs from './pages/DSPs.jsx'
import Catalogs from './pages/Catalogs.jsx'
import News from './pages/News.jsx'
import Consulting from './pages/Consulting.jsx'
import ConsultingCategory from './pages/ConsultingCategory.jsx'
import Deliverables from './pages/Deliverables.jsx'
import Prospecting from './pages/Prospecting.jsx'
import CatalogScan from './pages/CatalogScan.jsx'
import BuyerMatch from './pages/BuyerMatch.jsx'
import ProspectAccount from './pages/ProspectAccount.jsx'
// Lab pages are lazy chunks: the valuation engine and case data stay out of the core bundle.
const Lab = lazy(() => import('./pages/Lab.jsx'))
const LabCase = lazy(() => import('./pages/LabCase.jsx'))
const Glossary = lazy(() => import('./pages/Glossary.jsx'))
const About = lazy(() => import('./pages/About.jsx'))
import DesignSystem from './pages/DesignSystem.jsx'
import NotFound from './pages/NotFound.jsx'

const NAV = [
  { group: 'Canvas', items: [
    { to: '/', label: 'Overview', icon: Disc3, end: true },
    { to: '/entities', label: 'Entities', icon: Building2, except: ['/entities/map'] },
    { to: '/entities/map', label: 'Entity map', icon: Network, sub: true },
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
  { group: 'Market', items: [
    { to: '/market/catalogs', label: 'Catalog scan', icon: Library },
    { to: '/market/buyers', label: 'Buyer match', icon: Users },
  ]},
  { group: 'Pipeline', items: [
    { to: '/prospecting', label: 'Prospecting', icon: Crosshair },
  ]},
  { group: 'Reference', items: [
    { to: '/glossary', label: 'Finance, explained', icon: BookOpen },
    { to: '/about', label: 'About this tool', icon: Info },
  ]},
  ...PRIVATE_NAV,
].filter((g) => showsGroup(g.group))

/** `except` keeps a parent item from lighting up on a subpage that has its own item; `sub` indents that subpage. */
function NavItem({ to, label, icon: Icon, end, except = [], sub = false }) {
  const { pathname } = useLocation()
  const excluded = except.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const on = (isActive) => isActive && !excluded
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => [
        'flex items-center gap-2.5 rounded-md py-1.5 t-small no-underline transition-colors duration-150',
        sub ? 'pl-7 pr-2.5' : 'px-2.5',
        on(isActive) ? 'bg-ground-4 text-ink-1' : 'text-ink-2 hover:bg-ground-3 hover:text-ink-1',
      ].join(' ')}
      aria-current={excluded ? 'false' : 'page'}
    >
      {({ isActive }) => (
        <>
          <Icon size={sub ? 14 : 16} strokeWidth={1.75} className={on(isActive) ? 'text-accent' : 'text-ink-3'} aria-hidden="true" />
          {label}
        </>
      )}
    </NavLink>
  )
}

/**
 * Width by page. Reading pages keep the 1280px measure; the entity map uses the whole window (it scrolls
 * sideways), and company pages go to the wide measure so their panels sit side by side instead of stacking.
 */
function useWidth() {
  const { pathname } = useLocation()
  if (pathname === '/entities/map') return 'max-w-none'
  if (/^\/entities\/[^/]+$/.test(pathname)) return 'max-w-content-wide'
  return 'max-w-content-max'
}

export default function App() {
  const width = useWidth()
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
            {CURRENT.id === 'work' && <span className="t-micro text-ink-4">research edition</span>}
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
        <div className={`${width} px-gutter py-10`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/entities" element={<Entities />} />
            <Route path="/entities/map" element={<EntityMap />} />
            <Route path="/entities/:id" element={<EntityDetail />} />
            <Route path="/flows/*" element={<Flows />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/pe" element={<PE />} />
            <Route path="/pe/:id" element={<PEFundDetail />} />
            <Route path="/abs" element={<ABS />} />
            <Route path="/pros" element={<PROs />} />
            <Route path="/pros/:id" element={<PRODetail />} />
            <Route path="/dsps" element={<DSPs />} />
            <Route path="/catalogs" element={<Catalogs />} />
            <Route path="/news" element={<News />} />
            {has('consulting') && <Route path="/consulting" element={<Consulting />} />}
            {has('consulting') && <Route path="/consulting/:id" element={<ConsultingCategory />} />}
            {has('deliverables') && <Route path="/deliverables" element={<Deliverables />} />}
            <Route path="/market/catalogs" element={<CatalogScan />} />
            <Route path="/market/buyers" element={<BuyerMatch />} />
            <Route path="/prospecting" element={<Prospecting />} />
            <Route path="/prospecting/:accountId" element={<ProspectAccount />} />
            {has('lab') && <Route path="/lab" element={<Suspense fallback={<div className="t-small text-ink-3">Loading…</div>}><Lab /></Suspense>} />}
            <Route path="/about" element={<Suspense fallback={<div className="t-small text-ink-3">Loading…</div>}><About /></Suspense>} />
            <Route path="/glossary" element={<Suspense fallback={<div className="t-small text-ink-3">Loading…</div>}><Glossary /></Suspense>} />
            <Route path="/lab/glossary" element={<Suspense fallback={<div className="t-small text-ink-3">Loading…</div>}><Glossary /></Suspense>} />
            {has('lab') && <Route path="/lab/:caseId" element={<Suspense fallback={<div className="t-small text-ink-3">Loading…</div>}><LabCase /></Suspense>} />}
            <Route path="/design" element={<DesignSystem />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <EditionNotice />
        </div>
      </main>
    </div>
    </ThemeContext.Provider>
  )
}
