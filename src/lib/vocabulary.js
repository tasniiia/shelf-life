// Pure logic for the Vocabulary Vault — kept separate from vocabularyDb.js
// specifically so this half is unit-testable without a browser (no
// IndexedDB calls in here at all).

/**
 * Looks up a word via the Free Dictionary API (api.dictionaryapi.dev) —
 * free, key-less, no rate-limit tier to configure. A 404 (common for
 * fantasy/sci-fi coinages or obscure slang) is treated as a soft miss, not
 * an error: the word still gets saved, just with blank definition fields
 * the person can fill in themselves later.
 *
 * Worth flagging: this hits a third-party API I can't exercise from this
 * sandbox (no network access here), so the parsing below is built strictly
 * against the documented response shape rather than a live-verified one —
 * worth a real check once this is running in a browser.
 */
export async function fetchWordDefinition(word) {
  const empty = { definition: '', partOfSpeech: '', phonetic: '' };
  const cleaned = word.trim().toLowerCase();
  if (!cleaned) return empty;

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleaned)}`);
    if (!res.ok) return empty; // 404 = no definition found, not a failure
    const data = await res.json();
    return parseDictionaryResponse(data);
  } catch (err) {
    console.warn('[ShelfLife] Dictionary lookup failed:', err.message || err);
    return empty;
  }
}

/**
 * Extracted separately from fetchWordDefinition so the parsing logic can
 * be unit-tested against a mocked response, without needing a real network
 * call.
 */
export function parseDictionaryResponse(data) {
  const empty = { definition: '', partOfSpeech: '', phonetic: '' };
  const entry = Array.isArray(data) ? data[0] : null;
  if (!entry) return empty;

  const phonetic = entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || '';
  const firstMeaning = entry.meanings?.[0];
  const definition = firstMeaning?.definitions?.[0]?.definition || '';
  const partOfSpeech = firstMeaning?.partOfSpeech || '';

  return { definition, partOfSpeech, phonetic };
}

/**
 * Searches the parsed Goodreads library (read + to-read + currently
 * reading) by title/author for the source-book autocomplete. Always
 * returns the "Not from a tracked book" option first, per spec, regardless
 * of query.
 */
export function searchBooksForAutocomplete(library, query) {
  const notTracked = { id: null, title: 'Not from a tracked book', author: '', isTrackedOption: true };
  const pool = [...(library.read || []), ...(library.toRead || []), ...(library.currentlyReading || [])];

  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [notTracked, ...pool.slice(0, 20)];

  const matches = pool.filter(
    (b) => b.title.toLowerCase().includes(trimmed) || b.author.toLowerCase().includes(trimmed)
  );
  return [notTracked, ...matches.slice(0, 20)];
}

/**
 * Per spec: only books actually on the 'read' shelf carry over their real
 * Date Read as the entry's timeline anchor. To-read/currently-reading
 * books leave this null — dateLearned (today) anchors the timeline
 * instead, since there's no meaningful "read date" yet.
 */
export function inheritedReadDateForBook(book) {
  if (!book || book.exclusiveShelf !== 'read' || !book.dateRead) return null;
  return book.dateRead.toISOString();
}

/**
 * Builds a complete VocabularyEntry from user input + a fetched
 * definition + an optional source book. sourceBooks is an array, not a
 * single book — a word can be tagged from more than one book over time
 * (see findDuplicateEntry/addSourceBookToEntry below), so even a
 * brand-new entry starts with an array, just one item long (or empty for
 * an untracked word).
 */
export function buildVocabEntry({ word, definitionResult, sourceBook }) {
  const isTracked = sourceBook && sourceBook.id !== null;
  return {
    id: crypto.randomUUID(),
    word: word.trim(),
    definition: definitionResult.definition,
    partOfSpeech: definitionResult.partOfSpeech,
    phonetic: definitionResult.phonetic,
    sourceBooks: isTracked
      ? [
          {
            title: sourceBook.title,
            author: sourceBook.author,
            isbn: sourceBook.isbn || sourceBook.title,
            inheritedReadDate: inheritedReadDateForBook(sourceBook),
          },
        ]
      : [],
    dateLearned: new Date().toISOString(),
  };
}

/**
 * Backward-compatible read: any entry saved before sourceBooks existed
 * had singular sourceBookTitle/sourceBookAuthor/sourceBookId/
 * inheritedReadDate fields instead. Wraps those into the new array shape
 * on the way in, rather than requiring a one-time migration script —
 * existing entries just get normalized the first time they're loaded.
 */
export function normalizeEntry(entry) {
  if (entry.sourceBooks) return entry;
  const hasSource = entry.sourceBookTitle && entry.sourceBookTitle !== 'Untracked';
  return {
    ...entry,
    sourceBooks: hasSource
      ? [
          {
            title: entry.sourceBookTitle,
            author: entry.sourceBookAuthor,
            isbn: entry.sourceBookId,
            inheritedReadDate: entry.inheritedReadDate,
          },
        ]
      : [],
  };
}

/**
 * Case-insensitive match — "Ephemeral" and "ephemeral" are the same word
 * for this purpose, so logging it a second time (even from an entirely
 * different book) finds the existing card instead of creating a
 * duplicate.
 */
export function findDuplicateEntry(entries, word) {
  const cleaned = word.trim().toLowerCase();
  return entries.find((e) => e.word.trim().toLowerCase() === cleaned) || null;
}

/**
 * Appends a new source book to an existing entry, used when a duplicate
 * word is logged from a different book than the one(s) already linked.
 * Skips appending if the exact same book is already linked (matching by
 * title+author), and does nothing at all for an untracked ("Not from a
 * tracked book") selection, since there's no book to add.
 */
export function addSourceBookToEntry(entry, sourceBook) {
  const isTracked = sourceBook && sourceBook.id !== null;
  if (!isTracked) return entry;

  const newBook = {
    title: sourceBook.title,
    author: sourceBook.author,
    isbn: sourceBook.isbn || sourceBook.title,
    inheritedReadDate: inheritedReadDateForBook(sourceBook),
  };

  const alreadyLinked = entry.sourceBooks.some((b) => b.title === newBook.title && b.author === newBook.author);
  if (alreadyLinked) return entry;

  return { ...entry, sourceBooks: [...entry.sourceBooks, newBook] };
}

export function exportVocabularyToJson(entries) {
  return JSON.stringify(entries, null, 2);
}

export function exportVocabularyToCsv(entries) {
  const headers = ['word', 'partOfSpeech', 'phonetic', 'definition', 'sourceBooks', 'dateLearned'];
  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const rows = entries.map((e) => {
    const sourceBooksStr = e.sourceBooks?.length ? e.sourceBooks.map((b) => b.title).join('; ') : 'Untracked';
    return [e.word, e.partOfSpeech, e.phonetic, e.definition, sourceBooksStr, e.dateLearned]
      .map(escape)
      .join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

import { scrabbleScoreForWord } from './vocabularyInsights';

export function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Three sort orders for the vault dashboard: 'recent' (default, matches
 * the order words were actually added), 'alphabetical', and 'scrabble' —
 * reuses the same scoring already built for the Scrabble Power card, so
 * "most impressive word first" is free to add here.
 */
export function sortVocabEntries(entries, sortBy) {
  const sorted = [...entries];
  if (sortBy === 'alphabetical') {
    sorted.sort((a, b) => a.word.localeCompare(b.word));
  } else if (sortBy === 'scrabble') {
    sorted.sort((a, b) => scrabbleScoreForWord(b.word) - scrabbleScoreForWord(a.word));
  } else {
    sorted.sort((a, b) => new Date(b.dateLearned) - new Date(a.dateLearned));
  }
  return sorted;
}

/**
 * Surfaces words that got a 404 from the dictionary lookup and still have
 * a blank definition — the ones the spec always intended someone to
 * eventually define themselves, but with no way to find just those before
 * now, they'd have been buried among everything else.
 */
export function filterVocabEntries(entries, { missingDefinitionOnly }) {
  if (!missingDefinitionOnly) return entries;
  return entries.filter((e) => !e.definition);
}
