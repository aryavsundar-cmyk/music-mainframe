import { Briefcase, FileOutput, GraduationCap } from 'lucide-react'

/** Navigation for the authored modules. Swapped for an empty list in the work build, labels and all. */
export const PRIVATE_NAV = [
  { group: 'Overlay', items: [
    { to: '/consulting', label: 'Consulting lens', icon: Briefcase },
    { to: '/deliverables', label: 'Deliverables', icon: FileOutput },
  ] },
  { group: 'Academy', items: [
    { to: '/lab', label: 'Valuation lab', icon: GraduationCap },
  ] },
]
