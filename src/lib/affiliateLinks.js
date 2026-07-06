// Real, ToS-safe links — no scraping, no deal-detection cron, no mock
// data. These are just normal search URLs, functional immediately even
// before any affiliate account exists.

const AMAZON_ASSOCIATE_TAG = ''; // TODO: your Amazon Associates tracking ID, e.g. 'yourtag-20'

// Only Amazon is an affiliate relationship — WorldCat is a nonprofit
// library service with no commission of any kind, so it must never affect
// this flag or the "may earn a commission" disclaimer it gates.
export function isAffiliateConfigured() {
  return !!AMAZON_ASSOCIATE_TAG;
}

/**
 * Amazon product search — appends the Associates tag if configured.
 * Search-based rather than trying to link a specific ASIN, since we don't
 * have Amazon's product IDs, only title/author/ISBN.
 */
export function amazonSearchUrl(book) {
  const url = new URL('https://www.amazon.com/s');
  url.searchParams.set('k', `${book.title} ${book.author}`.trim());
  if (AMAZON_ASSOCIATE_TAG) url.searchParams.set('tag', AMAZON_ASSOCIATE_TAG);
  return url.toString();
}

/**
 * WorldCat — "find this book at a library near you," aggregated across
 * many library systems worldwide. Chosen over a Libby link specifically
 * because Libby has no library-agnostic search URL — its catalog is tied
 * to each person's individual library system, so a single universal link
 * that works the same for everyone isn't really possible without asking
 * every user to first configure their home library. WorldCat's basic
 * keyword search works identically for anyone, no configuration needed.
 * Built against WorldCat's documented search pattern — not something
 * verifiable live from this environment, so worth a real click-through
 * once deployed.
 */
export function worldCatUrl(book) {
  const url = new URL('https://www.worldcat.org/search');
  url.searchParams.set('q', `${book.title} ${book.author}`.trim());
  return url.toString();
}
