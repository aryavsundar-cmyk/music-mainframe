/**
 * aliases.js — the words people actually use, mapped to the records they mean.
 *
 * "Different people use different terms … ensuring that users can use different words to find what they're
 * looking for is a content strategy challenge" (50 UX Best Practices, 36). Someone looking for the majors types
 * "majors", not "Universal Music Group"; someone looking for a society types "PRO", "CMO" or "collecting
 * society" depending on where they trained; British spellings differ from American ones.
 *
 * Only what the records do not already say belongs here. A company's own name, short name and ticker are already
 * searched, so "Warner" needs no alias; "the majors" does. Every id is checked against the canvas by
 * `npm run test:search`, so an alias can never point at a record that does not exist.
 */

/** `ids` are entity ids; `paths` are routes; `tags` match glossary tags. At least one must be present. */
export const ALIASES = [
  // Who people mean by a group name
  { term: 'majors', label: 'The three majors', ids: ['umg', 'sony-music-group', 'wmg'], note: 'Universal, Sony and Warner' },
  { term: 'big three', ids: ['umg', 'sony-music-group', 'wmg'] },
  { term: 'major labels', ids: ['umg', 'sony-music-group', 'wmg'] },
  { term: 'indies', label: 'Independent labels', paths: ['/entities?type=label&tier=2'], note: 'labels outside the majors' },

  // The vocabulary of collective management
  { term: 'pro', label: 'Performing-rights organisations', paths: ['/pros'], ids: ['ascap', 'bmi', 'sesac', 'prs', 'gema', 'sacem'] },
  { term: 'pros', paths: ['/pros'] },
  { term: 'cmo', label: 'Collective management organisations', paths: ['/pros'] },
  { term: 'collecting society', paths: ['/pros'] },
  { term: 'collection society', paths: ['/pros'] },
  { term: 'societies', paths: ['/pros'] },
  { term: 'neighbouring rights', paths: ['/pros'], tags: ['rights'] },
  { term: 'neighboring rights', paths: ['/pros'], tags: ['rights'] },
  { term: 'mechanicals', paths: ['/pros'], tags: ['rights'] },

  // Platforms
  { term: 'dsp', label: 'Streaming services and platforms', paths: ['/dsps'] },
  { term: 'dsps', paths: ['/dsps'] },
  { term: 'streaming services', paths: ['/dsps'] },
  { term: 'platforms', paths: ['/dsps'] },

  // Money
  { term: 'catalogue', label: 'Catalogue sales', paths: ['/catalogs', '/market/catalogs'], note: 'British spelling' },
  { term: 'catalogues', paths: ['/catalogs', '/market/catalogs'] },
  { term: 'securitisation', label: 'Music-royalty ABS', paths: ['/abs'], note: 'British spelling' },
  { term: 'securitization', paths: ['/abs'] },
  { term: 'royalty bonds', paths: ['/abs'] },
  { term: 'asset-backed', paths: ['/abs'] },
  { term: 'm&a', label: 'Deals on record', paths: ['/deals'] },
  { term: 'transactions', paths: ['/deals'] },
  { term: 'acquisitions', paths: ['/deals'] },
  { term: 'sponsors', label: 'PE funds and capital', paths: ['/pe'] },
  { term: 'private equity', paths: ['/pe'] },
  { term: 'buyers', paths: ['/market/buyers', '/pe'] },

  // The app's own vocabulary, in the words a newcomer would use
  { term: 'five forces', label: 'The Five Forces tracker', paths: ['/deals'] },
  { term: 'porter', paths: ['/deals'], note: 'the five forces view' },
  { term: 'watchlist', label: 'What changed', paths: ['/changes'] },
  { term: 'alerts', paths: ['/changes'] },
  { term: 'recent', paths: ['/changes'] },
  { term: 'filings', label: 'SEC filings', paths: ['/changes?kind=filing'] },
  { term: 'sec', paths: ['/changes?kind=filing'] },
  { term: 'financials', label: 'Companies by freshness', paths: ['/entities?fresh=due'] },
  { term: 'glossary', label: 'Finance, explained', paths: ['/glossary'] },
  { term: 'definitions', paths: ['/glossary'] },
  { term: 'jargon', paths: ['/glossary'] },
  { term: 'sitemap', label: 'Every page, and what it is for', paths: ['/about'] },
  { term: 'help', paths: ['/about'] },
  { term: 'how to use', paths: ['/about'] },
  { term: 'sources', label: 'Where the figures come from', paths: ['/about'] },
  { term: 'map', label: 'Entity map', paths: ['/entities/map'] },
  { term: 'ecosystem', paths: ['/entities/map'] },
  { term: 'value chain', paths: ['/entities/map'] },
  { term: 'benchmark', label: 'Compare companies', paths: ['/compare'] },
  { term: 'peers', paths: ['/compare'] },
  { term: 'side by side', paths: ['/compare'] },
]

/** Ready-made comparisons and views worth offering by name, so a known question is one keystroke from an answer. */
export const SAVED_VIEWS = [
  { term: 'the three majors compared', label: 'Compare · the three majors', path: '/compare?ids=umg,sony-music-group,wmg' },
  { term: 'listed streaming compared', label: 'Compare · listed streaming', path: '/compare?ids=spotify,tencent-music,deezer,netease-cloud-music' },
  { term: 'needs refresh', label: 'Companies whose figures are due', path: '/entities?fresh=due' },
  { term: 'this week', label: 'What changed · last 7 days', path: '/changes?w=7' },
]
