// Pure logic for applying and reconciling "manually marked finished"
// overrides against the library — kept free of IndexedDB calls so it's
// unit-testable, same split as every other lib/*Db.js pair in this app.

import { bookProgressKey } from './readingProgress';

/**
 * Produces the "effective" library — the raw CSV-derived one, with every
 * active override applied: the book moves out of currentlyReading and
 * into read, with dateRead set to whenever it was marked finished. Every
 * part of the app (Shelf Awareness, Reading Goals, What's Next, the
 * Currently Reading widget itself) should consume THIS, not the raw
 * library directly, or a manually-finished book would keep showing as
 * still in progress everywhere except the one screen that moved it.
 */
export function applyCompletedOverrides(library, overrides) {
  if (!overrides.length) return library;

  const overrideByKey = new Map(overrides.map((o) => [o.bookKey, o]));

  const stillCurrentlyReading = [];
  const newlyCompleted = [];

  library.currentlyReading.forEach((book) => {
    const override = overrideByKey.get(bookProgressKey(book));
    if (override) {
      newlyCompleted.push({ ...book, exclusiveShelf: 'read', dateRead: new Date(override.completedDate) });
    } else {
      stillCurrentlyReading.push(book);
    }
  });

  if (!newlyCompleted.length) return library; // no override actually matched anything in this library

  const completedKeys = new Set(newlyCompleted.map((b) => bookProgressKey(b)));
  const updatedAll = library.all.map((book) => {
    if (book.exclusiveShelf === 'currently-reading' && completedKeys.has(bookProgressKey(book))) {
      const override = overrideByKey.get(bookProgressKey(book));
      return { ...book, exclusiveShelf: 'read', dateRead: new Date(override.completedDate) };
    }
    return book;
  });

  return {
    ...library,
    all: updatedAll,
    currentlyReading: stillCurrentlyReading,
    read: [...library.read, ...newlyCompleted],
  };
}

/**
 * Call this after a fresh CSV upload — checks whether Goodreads itself
 * has now caught up to each override (the book shows as 'read' in the
 * newly-uploaded data), and splits overrides into ones still needed vs.
 * ones now redundant. Doesn't touch storage itself; the caller deletes
 * the retired ones. An override whose book is missing entirely from the
 * fresh CSV (rather than shown as read) is treated as still needed —
 * absence isn't evidence Goodreads caught up, just that the export
 * doesn't mention it.
 */
export function reconcileOverrides(freshRawLibrary, overrides) {
  const freshByKey = new Map(freshRawLibrary.all.map((book) => [bookProgressKey(book), book]));

  const stillNeeded = [];
  const retired = [];

  overrides.forEach((override) => {
    const freshBook = freshByKey.get(override.bookKey);
    if (freshBook && freshBook.exclusiveShelf === 'read') {
      retired.push(override);
    } else {
      stillNeeded.push(override);
    }
  });

  return { stillNeeded, retired };
}
