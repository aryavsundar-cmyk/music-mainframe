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
}
export const LIMIT_LIST = Object.values(LIMITS)
/** One line for document notices, so exports and screens never drift apart. */
export const limitNotice = (...ids) => (ids.length ? ids : Object.keys(LIMITS)).map((id) => LIMITS[id].claim).join(' ')
