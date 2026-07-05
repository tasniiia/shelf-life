// Real, ToS-safe affiliate links — no scraping, no deal-detection cron, no
// mock data. These are just normal search/product URLs with an affiliate
// tag appended when one is configured. Until then, they're still perfectly
// functional links (they just don't earn anything), so the feature never
// looks broken while waiting on a real affiliate account.

const AMAZON_ASSOCIATE_TAG = ''; // TODO: your Amazon Associates tracking ID, e.g. 'yourtag-20'
const BOOKSHOP_AFFILIATE_ID = ''; // TODO: your Bookshop.org affiliate ID

export function isAffiliateConfigured() {
  return !!(AMAZON_ASSOCIATE_TAG || BOOKSHOP_AFFILIATE_ID);
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
 * Bookshop.org — an indie-bookstore-supporting alternative to Amazon.
 * Their real affiliate links use a path-based format (bookshop.org/a/{id}/{isbn}),
 * not a query parameter — this is based on their publicly documented format,
 * but I can't verify it live from this environment, so it's worth a direct
 * test once a real affiliate ID is in place. Falls back to a plain
 * (non-affiliate) search when there's no ISBN, since their affiliate format
 * needs one.
 */
export function bookshopUrl(book) {
  if (BOOKSHOP_AFFILIATE_ID && book.isbn) {
    return `https://bookshop.org/a/${encodeURIComponent(BOOKSHOP_AFFILIATE_ID)}/${encodeURIComponent(book.isbn)}`;
  }
  const url = new URL('https://bookshop.org/search');
  url.searchParams.set('keywords', `${book.title} ${book.author}`.trim());
  return url.toString();
}
