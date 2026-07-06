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
 * definition + an optional source book.
 */
export function buildVocabEntry({ word, definitionResult, sourceBook }) {
  const isTracked = sourceBook && sourceBook.id !== null;
  return {
    id: crypto.randomUUID(),
    word: word.trim(),
    definition: definitionResult.definition,
    partOfSpeech: definitionResult.partOfSpeech,
    phonetic: definitionResult.phonetic,
    sourceBookId: isTracked ? sourceBook.isbn || sourceBook.title : null,
    sourceBookTitle: isTracked ? sourceBook.title : 'Untracked',
    sourceBookAuthor: isTracked ? sourceBook.author : null,
    dateLearned: new Date().toISOString(),
    inheritedReadDate: isTracked ? inheritedReadDateForBook(sourceBook) : null,
  };
}

export function exportVocabularyToJson(entries) {
  return JSON.stringify(entries, null, 2);
}

export function exportVocabularyToCsv(entries) {
  const headers = [
    'word',
    'partOfSpeech',
    'phonetic',
    'definition',
    'sourceBookTitle',
    'sourceBookAuthor',
    'dateLearned',
    'inheritedReadDate',
  ];
  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const rows = entries.map((e) => headers.map((h) => escape(e[h])).join(','));
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
