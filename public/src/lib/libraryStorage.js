// Persists the parsed Goodreads library across page refreshes. A single
// cohesive blob rather than a growing collection of independent records
// (unlike vocabulary entries), so localStorage is the right fit here —
// IndexedDB's advantages (structured queries, better for large/growing
// collections) don't really apply to "store one object, retrieve it
// wholesale on load."
//
// For virtually all real Goodreads exports (even a few thousand books)
// this comfortably fits within localStorage's typical 5-10MB limit — a
// realistic library is well under a megabyte of JSON. An extremely large
// export could theoretically approach that ceiling; save() reports back
// whether it actually succeeded rather than failing silently, so the app
// can at least log a warning and keep working in-memory-only for that
// session if it doesn't.

const STORAGE_KEY = 'shelflife.library';

// The only two Date-typed fields on a parsed book record (see csv.js).
// JSON.stringify already turns real Date objects into ISO strings
// automatically on the way out; reviving them back into actual Date
// objects on the way in has to be explicit, or every date-arithmetic call
// elsewhere in the app (reading velocity, backlog trend, etc.) would
// silently break against plain strings instead of failing loudly.
const DATE_FIELDS = new Set(['dateRead', 'dateAdded']);

export function saveLibraryToStorage(library) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
    return true;
  } catch (err) {
    console.warn('[ShelfLife] Could not save library to localStorage:', err.message || err);
    return false;
  }
}

export function loadLibraryFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw, (key, value) => {
      if (DATE_FIELDS.has(key) && typeof value === 'string') {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
      }
      return value;
    });
  } catch (err) {
    console.warn('[ShelfLife] Could not load saved library, starting fresh:', err.message || err);
    return null;
  }
}

export function clearStoredLibrary() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[ShelfLife] Could not clear stored library:', err.message || err);
  }
}
