import Papa from 'papaparse';

/**
 * Goodreads export columns we care about (header names as Goodreads writes them):
 * Title, Author, ISBN, My Rating, Average Rating, Publisher, Binding,
 * Number of Pages, Year Published, Original Publication Year,
 * Date Read, Date Added, Bookshelves, Exclusive Shelf, My Review, Read Count
 */

function toNumber(value) {
  const raw = String(value ?? '').replace(/["=]/g, '').trim();
  if (!raw) return null; // Number('') is 0, not NaN — guard against a false "0" for missing fields
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function toDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeRow(row) {
  const bookshelves = String(row['Bookshelves'] ?? '').toLowerCase();
  const exclusiveShelf = String(row['Exclusive Shelf'] ?? '').toLowerCase().trim();
  const isDnf = bookshelves.includes('dnf') || bookshelves.includes('did-not-finish');

  return {
    title: String(row['Title'] ?? '').trim(),
    author: String(row['Author'] ?? '').trim(),
    isbn: String(row['ISBN13'] ?? row['ISBN'] ?? '').replace(/["=]/g, '').trim(),
    myRating: toNumber(row['My Rating']) || null,
    avgRating: toNumber(row['Average Rating']),
    publisher: String(row['Publisher'] ?? '').trim(),
    binding: String(row['Binding'] ?? '').trim(),
    pages: toNumber(row['Number of Pages']),
    yearPublished: toNumber(row['Year Published']),
    originalPublicationYear: toNumber(row['Original Publication Year']) ?? toNumber(row['Year Published']),
    dateRead: toDate(row['Date Read']),
    dateAdded: toDate(row['Date Added']),
    bookshelves,
    exclusiveShelf, // 'read' | 'currently-reading' | 'to-read'
    isDnf,
    review: String(row['My Review'] ?? '').trim(),
    readCount: toNumber(row['Read Count']) || 0,
  };
}

/**
 * Parses a Goodreads CSV export (as text) into a normalized library object.
 * Returns { all, read, toRead, currentlyReading, dnf, warnings }
 */
export function parseGoodreadsCsv(fileText) {
  const result = Papa.parse(fileText, {
    header: true,
    skipEmptyLines: true,
  });

  const warnings = [];
  if (result.errors?.length) {
    result.errors.forEach((e) => warnings.push(`Row ${e.row}: ${e.message}`));
  }

  const requiredCols = ['Title', 'Author', 'Exclusive Shelf'];
  const headers = result.meta?.fields ?? [];
  const missing = requiredCols.filter((c) => !headers.includes(c));
  if (missing.length) {
    throw new Error(
      `This doesn't look like a Goodreads export. Missing column(s): ${missing.join(', ')}.`
    );
  }

  const all = result.data
    .map(normalizeRow)
    .filter((b) => b.title); // drop blank rows

  const read = all.filter((b) => b.exclusiveShelf === 'read' && !b.isDnf);
  const toRead = all.filter((b) => b.exclusiveShelf === 'to-read');
  const currentlyReading = all.filter((b) => b.exclusiveShelf === 'currently-reading');
  const dnf = all.filter((b) => b.isDnf);

  return { all, read, toRead, currentlyReading, dnf, warnings };
}

export function pickRandomSample(list, n) {
  if (list.length <= n) return list;
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
