/**
 * edition-loader.mjs — runs the Node test suites against the work edition's module shape.
 *
 * The browser build swaps the authored modules for stubs in vite.config.js. Node needs the same swap to prove the
 * engines still work without them, so this resolve hook maps the same paths when MM_EDITION=work.
 * Used by `npm run test:work`.
 */
import { register } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const SWAPS = [
  ['src/data/consulting.js', 'src/editions/stubs/consulting.js'],
  ['src/data/siblings.js', 'src/editions/stubs/siblings.js'],
  ['src/data/rateCard.js', 'src/editions/stubs/rateCard.js'],
  ['src/data/personas.js', 'src/editions/stubs/personas.js'],
  ['src/data/playbooks.js', 'src/editions/stubs/playbooks.js'],
  ['src/data/cases/index.js', 'src/editions/stubs/cases.js'],
  ['src/utils/gammaExport.js', 'src/editions/stubs/gammaExport.js'],
]

if (process.env.MM_EDITION === 'work') {
  const map = new Map(SWAPS.map(([from, to]) => [pathToFileURL(path.join(root, from)).href, pathToFileURL(path.join(root, to)).href]))
  register(new URL('./edition-hooks.mjs', import.meta.url), pathToFileURL('./'), { data: { map: Object.fromEntries(map) } })
}
