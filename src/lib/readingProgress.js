// Pure logic for manual reading progress — kept free of IndexedDB calls
// so it's unit-testable, same split as vocabulary.js / vocabularyDb.js.

/**
 * A stable key for matching a progress entry back to a book. ISBN when
 * available (most reliable), falling back to title+author — same
 * fallback pattern used for the source-book matching in Vocabulary Vault,
 * since plenty of Goodreads entries (Kindle editions especially) have a
 * blank ISBN.
 */
export function bookProgressKey(book) {
  return book.isbn || `${book.title}::${book.author}`;
}

/**
 * Converts a page number into a percentage, clamped to a sane 0-100
 * range — defensive against someone typing a page number larger than the
 * book's actual length.
 */
export function pageToPercent(page, totalPages) {
  if (!totalPages) return 0;
  return Math.max(0, Math.min(100, Math.round((page / totalPages) * 100)));
}

export function percentToPage(pct, totalPages) {
  if (!totalPages) return null;
  return Math.round((pct / 100) * totalPages);
}

/**
 * The upgraded version of the "at your pace" estimate — once we know how
 * far into the book someone actually is, this is genuinely "time left,"
 * not just "time for the whole book." Falls back to null (caller should
 * show the old whole-book estimate instead) when there's no progress
 * entry yet, since defaulting to 0% would make an unstarted-looking
 * estimate for a book someone might already be halfway through.
 */
export function estimateDaysRemaining(book, pct, readingVelocity) {
  if (pct == null || !readingVelocity || !book.pages) return null;
  const pagesRemaining = Math.max(0, book.pages * (1 - pct / 100));
  return Math.max(0, Math.ceil(pagesRemaining / readingVelocity));
}
