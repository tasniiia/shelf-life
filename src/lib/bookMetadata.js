// Free, key-less book metadata lookups used by What's Next.
// Both APIs are public, support CORS from the browser, and need no signup:
//   - Open Library: https://openlibrary.org/dev/docs/api
//   - Google Books: https://developers.google.com/books (anonymous queries
//     work but are rate-limited more tightly than with a key — fine for
//     personal use, not for heavy traffic).

const cache = new Map(); // cache key -> resolved metadata (or null if lookup failed this session)
const REQUEST_TIMEOUT_MS = 6000;
const STORAGE_KEY = 'shelflife.metadataCache.v1';

// Genre/keyword data for a given book essentially never changes, so once
// we've successfully looked it up there's no reason to ever fetch it again
// — that's the whole fix for "every search re-fetches the same 18 books
// from scratch and is slow every single time." Failed lookups are NOT
// persisted here (only cached in-memory for this session) since a failure
// is often transient (rate limit, network blip) and permanently caching
// "no data" would prevent ever recovering once the real cause clears.

function serializeCache() {
  const obj = {};
  cache.forEach((value, key) => {
    if (!value) return; // never persist failures
    // buyInfo (price/buy-link) is deliberately excluded here — unlike
    // genre/cover data, a price can change at any time, and this cache has
    // no per-field expiry. Persisting it would mean showing a stale price
    // forever once a book's metadata is cached. It stays in-memory for the
    // current session only; a fresh session re-fetches it along with
    // everything else for any book not yet cached.
    obj[key] = {
      genres: [...value.genres],
      keywords: [...value.keywords],
      rating: value.rating,
      coverUrl: value.coverUrl ?? null,
    };
  });
  return obj;
}

function hydrateCacheFromStorage() {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    let count = 0;
    Object.entries(obj).forEach(([key, value]) => {
      cache.set(key, {
        genres: new Set(value.genres),
        keywords: new Set(value.keywords),
        rating: value.rating,
        coverUrl: value.coverUrl ?? null,
        buyInfo: null, // not persisted — see serializeCache comment
      });
      count += 1;
    });
    if (count) console.info(`[ShelfLife] Loaded ${count} cached book(s) from a previous session.`);
  } catch (err) {
    console.warn('[ShelfLife] Could not read metadata cache, starting fresh:', err.message || err);
  }
}

let persistTimer = null;
function schedulePersist() {
  if (typeof localStorage === 'undefined') return;
  clearTimeout(persistTimer);
  // Debounced — a whole prefetch batch triggers one write at the end
  // instead of one write per book.
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeCache()));
    } catch (err) {
      console.warn('[ShelfLife] Could not save metadata cache (storage may be full):', err.message || err);
    }
  }, 1000);
}

/** Wipes both the in-memory and persisted metadata cache. */
export function clearMetadataCache() {
  cache.clear();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

hydrateCacheFromStorage();

// A single slow or hung request shouldn't stall the whole batch — cap every
// network call so one bad lookup can't drag out the total wait.
async function fetchWithTimeout(url, ms = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const STOPWORDS = new Set(
  `a an the of and or but in on at to for from with without into onto over under
   is are was were be been being have has had do does did will would could should
   this that these those it its his her their our your my i you he she we they them
   as by not no yes if then than so such very just also more most other some any all
   about after before between during through while when where which who whom whose
   what how why can may might must shall novel book story tale set finds must own
   life world time way one two first new own`.split(/\s+/)
);

// Words that show up in almost every book's subject/category list and carry
// no real genre signal — left in, they'd make nearly every pair of books
// look "similar" just because they both say "fiction".
const GENRE_STOPWORDS = new Set([
  'fiction', 'nonfiction', 'non-fiction', 'general', 'literature', 'literary',
  'stories', 'novel', 'novels', 'novela', 'roman', 'fictional', 'juvenile',
  'young', 'adult', 'adults', 'american', 'english', 'people', 'life',
  'accessible', 'book', 'books', 'reading', 'large', 'print', 'text',
  'memoir', 'memoirs', 'biography', 'biographies', 'personal', 'essays',
  'essay', 'man', 'woman', 'relationships', 'open', 'type', 'level',
  'grade', 'grades', 'best', 'north', 'south', 'east', 'west', 'northern',
  'southern', 'northeast', 'northwest', 'southeast', 'southwest',
  // Binding/format tags — describe the physical edition, not the genre.
  'trade', 'paperback', 'hardcover', 'hardback', 'softcover', 'boardbook',
  'spiral', 'binding', 'massmarket', 'edition',
  // Common translations of the generic LCSH "Man-woman relationships"
  // heading — Open Library tags translated bestsellers with this same
  // administrative heading in the edition's own language, so an
  // English-only filter misses it entirely.
  'relaciones', 'hombre', 'mujer', 'relacion', 'homme', 'femme', 'amour',
  'relations', 'mann', 'frau', 'liebe', 'beziehungen',
  // Accolade/bestseller-list fragments — these describe a book's reception,
  // not its genre, and would otherwise make unrelated books look "similar"
  // just because both happened to be bestsellers.
  'nyt', 'york', 'times', 'bestseller', 'bestsellers', 'bestselling',
  'award', 'awards', 'winner', 'winners', 'notable', 'national', 'prize',
  'recommended', 'acclaimed', 'critically', 'international',
]);

// Whole subject phrases to drop entirely before tokenizing, rather than
// letting them break apart into individual junk words. These are library
// cataloging/administrative tags, not genre information — e.g. Open
// Library and Goodreads both tag huge swaths of romance-adjacent fiction
// with the generic LCSH heading "Man-woman relationships", and school/library
// systems tag reading-level metadata like "Accelerated Reader" or
// "Large type books" the same way they'd tag an actual genre.
const NON_GENRE_PHRASE_PATTERNS = [
  /large type/i,
  /large print/i,
  /accelerated reader/i,
  /reading level/i,
  /lexile/i,
  /grade level/i,
  /\bgrades?\s*\d/i,
  /man-woman relationships/i,
  /relaciones hombre-mujer/i,
  /new york times/i,
  /bestseller/i,
  /staff pick/i,
  /book club/i,
  /open library/i,
  /overdrive/i,
  /protected daisy/i,
  /in library/i,
  /trade paperback/i,
  /mass market/i,
  /library binding/i,
  /board book/i,
  /spiral bound/i,
];

function isAdministrativeSubject(phrase) {
  return NON_GENRE_PHRASE_PATTERNS.some((re) => re.test(phrase));
}

function extractKeywords(text, max = 25) {
  if (!text) return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
  const counts = {};
  words.forEach((w) => {
    counts[w] = (counts[w] || 0) + 1;
  });
  return new Set(
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, max)
      .map(([w]) => w)
  );
}

/**
 * Turns raw subject/category phrases (e.g. "Fantasy fiction", "Epic fantasy",
 * "Magic — Fiction") into a set of individual genre words (e.g. "fantasy",
 * "magic"), filtering out generic filler. This lets "Epic fantasy" and
 * "Fantasy fiction" register as related instead of two unrelated phrases
 * that happen to share zero exact-string overlap.
 */
function tokenizeGenres(phrases) {
  const words = new Set();
  phrases
    .filter((phrase) => !isAdministrativeSubject(phrase))
    .forEach((phrase) => {
      phrase
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .forEach((w) => {
          if (w.length > 2 && !STOPWORDS.has(w) && !GENRE_STOPWORDS.has(w)) words.add(w);
        });
    });
  return words;
}

// Goodreads titles very often carry a series annotation Open Library and
// Google Books don't use in their own title field, e.g. Goodreads exports
// "Fourth Wing (The Empyrean, #1)" while the catalog title is just
// "Fourth Wing". An exact-phrase search including that suffix reliably
// returns zero results.
function cleanTitleForSearch(title) {
  return title.replace(/\s*\([^()]*,\s*#[\d.]+\)\s*$/, '').trim();
}

async function runOpenLibraryQuery(q) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(
    q
  )}&fields=title,author_name,subject,first_sentence,ratings_average&limit=1`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.docs?.[0] || null;
  } catch (err) {
    console.warn(`[ShelfLife] Open Library search failed for query "${q}":`, err.message || err);
    throw err;
  }
}

/**
 * Open Library's SEARCH index (as opposed to its per-edition/ISBN records)
 * is built around aggregated "work" documents, which is where subject/genre
 * tags actually live in useful numbers. Tries title+author first; if that
 * comes up empty, retries title-only, since author name formatting
 * (middle names, punctuation) sometimes differs between Goodreads and
 * Open Library enough to break an exact match.
 */
async function fetchOpenLibraryBySearch(title, author) {
  const cleanTitle = cleanTitleForSearch(title);
  let doc = await runOpenLibraryQuery(`${cleanTitle} ${author || ''}`.trim()).catch(() => null);
  if (!doc && author) {
    doc = await runOpenLibraryQuery(cleanTitle).catch(() => null);
  }
  if (!doc) return null;
  const firstSentence = Array.isArray(doc.first_sentence) ? doc.first_sentence[0] : doc.first_sentence;
  return {
    subjects: (doc.subject || []).slice(0, 60),
    description: firstSentence || '',
    rating: doc.ratings_average || null,
  };
}

/**
 * Open Library's per-ISBN "embeddable data" endpoint. Only called as a
 * fallback when the search-based lookup above comes up empty, to avoid
 * firing an extra request for the (common) case where search alone
 * already found good data.
 */
async function fetchOpenLibraryByIsbn(isbn) {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(
    isbn
  )}&jscmd=data&format=json`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const entry = data[`ISBN:${isbn}`];
    if (!entry) return null;
    const subjects = (entry.subjects || []).map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean);
    const description = entry.excerpts?.[0]?.text || entry.notes || '';
    return { subjects, description, rating: null };
  } catch (err) {
    console.warn(`[ShelfLife] Open Library ISBN lookup failed for ${isbn}:`, err.message || err);
    throw err;
  }
}

async function fetchOpenLibrary(book) {
  const bySearch = await fetchOpenLibraryBySearch(book.title, book.author).catch(() => null);
  const hasUsableData = bySearch && (bySearch.subjects.length || bySearch.description);
  if (hasUsableData || !book.isbn) return bySearch;
  // Search came up empty (or too thin) and we have an ISBN — worth the
  // extra request to try the per-edition data as a last resort.
  return fetchOpenLibraryByIsbn(book.isbn).catch(() => bySearch);
}

// Google Books' unauthenticated quota is much stricter than Open Library's.
// Once it starts returning 429, retrying per-request just spams more
// requests at an endpoint that isn't going to un-block itself in the next
// few hundred milliseconds — so instead of retrying, we trip a circuit
// breaker: one 429 pauses ALL Google Books lookups for a cooldown window,
// and every book in that window skips Google Books instantly (no network
// call, no console spam) and falls back to Open Library alone, which isn't
// affected by this at all.
const GOOGLE_BOOKS_CONCURRENCY = 2;
const GOOGLE_BOOKS_COOLDOWN_MS = 60_000;
let googleBooksActive = 0;
let googleBooksCooldownUntil = 0;
let googleBooksCooldownWarned = false;
const googleBooksQueue = [];

function acquireGoogleBooksSlot() {
  return new Promise((resolve) => {
    const tryAcquire = () => {
      if (googleBooksActive < GOOGLE_BOOKS_CONCURRENCY) {
        googleBooksActive += 1;
        resolve();
      } else {
        googleBooksQueue.push(tryAcquire);
      }
    };
    tryAcquire();
  });
}

function releaseGoogleBooksSlot() {
  googleBooksActive -= 1;
  const next = googleBooksQueue.shift();
  if (next) next();
}

async function runGoogleBooksQuery(q) {
  if (Date.now() < googleBooksCooldownUntil) {
    return null; // breaker is open — skip the network call entirely
  }

  await acquireGoogleBooksSlot();
  let res;
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}`;
    res = await fetchWithTimeout(url);
  } catch (err) {
    releaseGoogleBooksSlot();
    console.warn(`[ShelfLife] Google Books query failed for "${q}":`, err.message || err);
    return null;
  }
  releaseGoogleBooksSlot();

  if (res.status === 429) {
    googleBooksCooldownUntil = Date.now() + GOOGLE_BOOKS_COOLDOWN_MS;
    if (!googleBooksCooldownWarned) {
      googleBooksCooldownWarned = true;
      console.warn(
        `[ShelfLife] Google Books is rate-limiting this session (HTTP 429). Pausing Google Books lookups ` +
          `for ${GOOGLE_BOOKS_COOLDOWN_MS / 1000}s — Open Library lookups are unaffected and will continue ` +
          `to provide genre data in the meantime.`
      );
    }
    return null;
  }
  if (!res.ok) {
    console.warn(`[ShelfLife] Google Books query failed for "${q}": HTTP ${res.status}`);
    return null;
  }
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return null;
  // saleInfo is a sibling of volumeInfo in Google's response, not nested
  // inside it — easy to lose track of if you're only reaching for
  // volumeInfo, which is what this used to do before real buy-link/price
  // data was added.
  return { volumeInfo: item.volumeInfo || {}, saleInfo: item.saleInfo || {} };
}

async function fetchGoogleBooksByIsbn(isbn) {
  return runGoogleBooksQuery(`isbn:${isbn}`);
}

async function fetchGoogleBooksBySearch(title, author) {
  const cleanTitle = cleanTitleForSearch(title);
  let result = await runGoogleBooksQuery(`intitle:${cleanTitle}${author ? `+inauthor:${author}` : ''}`).catch(
    () => null
  );
  if (!result && author) {
    result = await runGoogleBooksQuery(`intitle:${cleanTitle}`).catch(() => null);
  }
  return result;
}

async function fetchGoogleBooks(book) {
  const result = book.isbn
    ? await fetchGoogleBooksByIsbn(book.isbn).catch(() => null)
    : await fetchGoogleBooksBySearch(book.title, book.author).catch(() => null);
  if (!result) return null;
  const { volumeInfo: info, saleInfo } = result;
  // Upgrade Google's occasionally-http thumbnail URLs to https to avoid
  // mixed-content blocking.
  const rawCover = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;

  // Real, live buy-link + price data — not mock, not scraped. Only present
  // when Google actually has the ebook for sale with a valid link.
  let buyInfo = null;
  if (saleInfo?.saleability === 'FOR_SALE' && saleInfo.buyLink) {
    const price = saleInfo.retailPrice || saleInfo.listPrice;
    buyInfo = {
      price: price?.amount ?? null,
      currency: price?.currencyCode ?? null,
      buyLink: saleInfo.buyLink,
    };
  }

  return {
    subjects: info.categories || [],
    description: info.description || '',
    rating: info.averageRating || null,
    ratingsCount: info.ratingsCount || 0,
    coverUrl: rawCover ? rawCover.replace(/^http:/, 'https:') : null,
    buyInfo,
  };
}

/**
 * Looks up combined metadata for a book. Works with or without an ISBN —
 * title+author search is the primary path for both providers. Returns
 * { genres: Set<string>, keywords: Set<string>, rating: number|null } or
 * null if nothing could be found at all. Results are cached in-memory for
 * the session, keyed by ISBN when available, otherwise title+author.
 */
export async function getBookMetadata(book) {
  if (!book.title) return null;
  const cacheKey = book.isbn || `${book.title}::${book.author}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let openLib = null;
  let googleBooks = null;
  try {
    [openLib, googleBooks] = await Promise.all([
      fetchOpenLibrary(book).catch(() => null),
      fetchGoogleBooks(book).catch(() => null),
    ]);
  } catch {
    // both failed — fall through to null result below
  }

  if (!openLib && !googleBooks) {
    cache.set(cacheKey, null);
    return null;
  }

  const rawSubjects = [...(openLib?.subjects || []), ...(googleBooks?.subjects || [])];
  const genres = tokenizeGenres(rawSubjects);
  const descriptionText = [openLib?.description, googleBooks?.description].filter(Boolean).join(' ');
  const keywords = extractKeywords(descriptionText);
  const rating = googleBooks?.rating ?? openLib?.rating ?? null;
  const coverUrl = googleBooks?.coverUrl ?? null;
  const buyInfo = googleBooks?.buyInfo ?? null;

  const result = { genres, keywords, rating, coverUrl, buyInfo };
  cache.set(cacheKey, result);
  schedulePersist();
  return result;
}

/**
 * Fetches metadata for a list of books with limited concurrency, so we
 * don't fire dozens of simultaneous requests at once. Returns an array of
 * metadata (or null) in the same order as the input.
 */
export async function getBookMetadataBatch(books, concurrency = 6, onProgress) {
  const results = new Array(books.length);
  let next = 0;
  let completed = 0;

  async function worker() {
    while (next < books.length) {
      const i = next++;
      try {
        results[i] = await getBookMetadata(books[i]);
      } catch {
        results[i] = null;
      }
      completed += 1;
      onProgress?.(completed, books.length, results.slice());
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, books.length) }, worker);
  await Promise.all(workers);

  // One summary line makes it obvious at a glance whether lookups are
  // actually failing at the network level vs. just coming back thin —
  // open the browser console after a search to see this.
  const withGenres = results.filter((r) => r?.genres.size).length;
  const withKeywords = results.filter((r) => r?.keywords.size).length;
  const withNothing = results.filter((r) => !r).length;
  console.info(
    `[ShelfLife] Metadata lookup for ${books.length} books: ${withGenres} had genre data, ` +
      `${withKeywords} had description keywords, ${withNothing} returned nothing at all.` +
      (withNothing === books.length
        ? ' Every lookup failed — check the warnings above for the actual network error (likely CORS, an ad-blocker, or a firewall blocking openlibrary.org / googleapis.com).'
        : '')
  );

  return results;
}

function getCacheKeyForBook(book) {
  return book.isbn || `${book.title}::${book.author}`;
}

/**
 * Builds an Open Library cover image URL for a book's ISBN — no key, no
 * lookup required, just a direct image URL. `?default=false` makes Open
 * Library return a real 404 for missing covers instead of its own generic
 * placeholder graphic, so the caller can detect "no cover" via the image's
 * onError handler and show its own fallback instead.
 */
export function coverUrlForBook(book, size = 'M') {
  const isbn = String(book.isbn ?? '').replace(/["=]/g, '').trim();
  if (!isbn) return null;
  return `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-${size}.jpg?default=false`;
}

export function isBookCached(book) {
  return cache.has(getCacheKeyForBook(book));
}

/**
 * Warms the metadata cache for a list of books in the background, skipping
 * anything already cached (from this session or a previous one). Meant to
 * run once, right after a CSV upload, so that by the time someone actually
 * clicks "Find Matches" most of their to-read shelf is already resolved and
 * the search feels close to instant instead of waiting on 18 fresh lookups.
 * Uses a gentler concurrency than an active search since this is passive,
 * unrequested background work — no reason to compete aggressively with
 * whatever the person might actually be doing.
 */
export async function prefetchLibraryMetadata(books, { concurrency = 3, onProgress } = {}) {
  const uncachedBooks = books.filter((b) => !isBookCached(b));
  if (!uncachedBooks.length) {
    onProgress?.(books.length, books.length);
    return;
  }
  const alreadyCached = books.length - uncachedBooks.length;
  await getBookMetadataBatch(uncachedBooks, concurrency, (done) => {
    onProgress?.(alreadyCached + done, books.length);
  });
}
