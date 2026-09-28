/**
 * limits.js — what the scores in this app mean, and what they do not.
 *
 * These sentences are the single source of truth: the market and prospecting pages render them, every exported
 * document carries them, and scripts/test-market.mjs asserts they are present in both. Change them here or nowhere.
 */
export const LIMITS = {
  match: {
    id: 'match',
    claim: 'A match score means a buyer has done deals like yours, not that they are interested.',
    detail: 'Profiles are built only from transactions on record: what a buyer actually bought, how big, how recently, and how they paid for it. Appetite today is a conversation, not a calculation.',
    enforced: 'No buyer can be credited with a deal they did not make — the tests check every deal against its acquirer.',
  },
  availability: {
    id: 'availability',
    claim: 'An availability score is a prompt to do work, not a claim that an asset is for sale.',
    detail: 'It reads how that kind of owner behaves, how long they have held the asset, refinancing dates ahead, whether they have sold before, and sale-intent language in the live feed. None of that is a mandate.',
    enforced: 'No genre tag can exist without the word appearing in the source — the tests check each tag against the text it came from.',
  },
  force: {
    id: 'force',
    claim: 'A force tag says what an event is evidence of, not what will happen next.',
    detail: 'Each tag is read from the record itself — its deal type and structure, the companies involved, and the words in its title and summary — and keeps the evidence that produced it. Direction says whether the event supports or pushes against the thesis as written; it is not a forecast, and a count of events is not a measure of their size.',
    enforced: 'No force can be assigned without evidence in the record — the tests check every tag against the field or phrase it came from.',
  },
  flow: {
    id: 'flow',
    claim: 'A flow waterfall divides one dollar at published rates. It is not an estimate of what anyone earns.',
    detail: 'The splits are published ranges, statutory schedules and industry rules of thumb, read from the stage economics on the flows page — never the terms of a particular deal, and never anybody\u2019s actual statement. An artist\u2019s royalty arrives only after the advance is recouped, a distribution deal may be a flat fee rather than a percentage, and every one of these rates is negotiated in practice.',
    enforced: 'No rate is written into a scenario \u2014 every one is read from the stage that publishes it; a branch whose children do not add up to it fails the tests; a published range is drawn as a range and never as a midpoint; and a step nobody discloses says so rather than carrying an estimate.',
  },
  comparison: {
    id: 'comparison',
    claim: 'A comparison lines up reported figures, not like-for-like businesses.',
    detail: 'Each company defines its own revenue and closes its year on its own date; a label group, a streaming service and a promoter earn money in ways that no single table makes equivalent. Figures are converted to US dollars at one dated rate so they can be set side by side, with each company\u2019s reported figure beside them, and none of it adjusts for accounting policy, acquisitions or one-off items.',
    // This said “no figure is ranked against a figure in another currency” until Sprint 42 started converting
    // them, two paragraphs below a caveat explaining the conversion. What actually protects the reader now is
    // that a converted figure never appears without the reported one, and that a stale balance is never ranked.
    enforced: 'A converted figure is never shown without the figure the company reported, a balance the company stopped updating is never ranked or used in a ratio, and no trend is drawn across a gap in the years — the tests check all three.',
  },
}
export const LIMIT_LIST = Object.values(LIMITS)
/** One line for document notices, so exports and screens never drift apart. */
export const limitNotice = (...ids) => (ids.length ? ids : Object.keys(LIMITS)).map((id) => LIMITS[id].claim).join(' ')
