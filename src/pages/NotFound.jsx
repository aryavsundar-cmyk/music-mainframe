import { Link } from 'react-router-dom'
import { PageHeader } from '../components/primitives/index.js'
export default function NotFound() {
  return (
    <>
      <PageHeader eyebrow="404" tone="muted" title="No such page." lede="The route you asked for isn't wired." />
      <Link to="/" className="t-small text-accent">Back to overview</Link>
    </>
  )
}
