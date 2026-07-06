// Cross-feature insights connecting Vocabulary Vault data back into Shelf
// Awareness. Kept separate from vocabulary.js since these functions need
// both a VocabularyEntry array AND the parsed library (for cross-
// referencing), whereas vocabulary.js's functions only ever need one or
// the other.

// Standard English Scrabble tile point values.
const SCRABBLE_VALUES = {
  a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1, m: 3,
  n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10,
};

export function scrabbleScoreForWord(word) {
  return String(word)
    .toLowerCase()
    .split('')
    .reduce((sum, ch) => sum + (SCRABBLE_VALUES[ch] || 0), 0);
}

/**
 * Filters entries to a year scope the same way the rest of Shelf Awareness
 * does — 'all' or a specific year — using dateLearned as the anchor, since
 * that's the one date every entry always has (inheritedReadDate is only
 * present for tracked books on the read shelf).
 */
function filterEntriesByScope(entries, yearScope) {
  if (yearScope === 'all') return entries;
  return entries.filter((e) => e.dateLearned && new Date(e.dateLearned).getFullYear() === yearScope);
}

const MIN_WORDS_FOR_SCRABBLE = 3;

/**
 * "Scrabble Power" — a purely gamified, deliberately arbitrary score. Not
 * trying to measure anything real about vocabulary quality, just fun and
 * shareable, same spirit as everything else in the free-form insight deck.
 */
export function computeScrabblePower(entries, yearScope) {
  const scoped = filterEntriesByScope(entries, yearScope);
  if (scoped.length < MIN_WORDS_FOR_SCRABBLE) return null;

  let totalScore = 0;
  let topWord = null;
  for (const entry of scoped) {
    const score = scrabbleScoreForWord(entry.word);
    totalScore += score;
    if (!topWord || score > topWord.score) topWord = { word: entry.word, score };
  }
  return { totalScore, topWord, wordCount: scoped.length };
}

const MIN_WORDS_FOR_ERA = 3;

/**
 * Cross-references each entry's stored sourceBookTitle/sourceBookAuthor
 * against the CURRENT library to find that book's Original Publication
 * Year — deliberately not stored on the entry itself at save time, so this
 * works retroactively for every existing entry rather than only ones
 * saved after this feature shipped, and doesn't need a schema migration.
 *
 * Real limitation worth being upfront about: this only works for entries
 * whose source book is still findable in your current library. Untracked
 * words ("Not from a tracked book") have no book to look up at all, and if
 * you've since uploaded a different CSV where that title/author no longer
 * appears, that entry's era can't be determined either. Both are excluded
 * from this calculation rather than guessed at.
 */
function findPublicationYear(entry, library) {
  if (!entry.sourceBookTitle || entry.sourceBookTitle === 'Untracked') return null;
  const match = (library.all || []).find(
    (b) =>
      b.title === entry.sourceBookTitle && (!entry.sourceBookAuthor || b.author === entry.sourceBookAuthor)
  );
  return match?.originalPublicationYear || null;
}

function eraLabelForYear(year) {
  if (year < 1900) {
    const century = Math.floor(year / 100) + 1;
    const ordinal = century === 19 ? '19th' : century === 18 ? '18th' : `${century}th`;
    return `${ordinal}-Century`;
  }
  if (year < 2000) return '20th-Century';
  return 'Modern-Era';
}

export function computeLinguisticEra(entries, library, yearScope) {
  const scoped = filterEntriesByScope(entries, yearScope);
  const withYears = scoped
    .map((e) => ({ entry: e, year: findPublicationYear(e, library) }))
    .filter((x) => x.year != null);

  if (withYears.length < MIN_WORDS_FOR_ERA) return null;

  const counts = {};
  withYears.forEach(({ year }) => {
    const label = eraLabelForYear(year);
    counts[label] = (counts[label] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [dominantEra, dominantCount] = sorted[0];
  const pct = Math.round((dominantCount / withYears.length) * 100);
  const modernCount = counts['Modern-Era'] || 0;

  return {
    era: dominantEra,
    pct,
    dominantCount,
    totalWithYear: withYears.length,
    modernCount,
    persona: `${dominantEra} Scholar`,
  };
}

const MIN_BOOKS_FOR_GENRE = 2;

/**
 * Returns the unique tracked source books referenced by in-scope entries,
 * for a targeted metadata fetch — deliberately NOT the whole read shelf,
 * see the note in the chat about why that would be a much larger, slower
 * fetch than this single card justifies.
 */
export function uniqueSourceBooksForGenre(entries, library, yearScope) {
  const scoped = filterEntriesByScope(entries, yearScope);
  const seen = new Set();
  const books = [];
  for (const entry of scoped) {
    if (!entry.sourceBookTitle || entry.sourceBookTitle === 'Untracked') continue;
    const key = `${entry.sourceBookTitle}::${entry.sourceBookAuthor || ''}`;
    if (seen.has(key)) continue;
    const match = (library.all || []).find(
      (b) => b.title === entry.sourceBookTitle && (!entry.sourceBookAuthor || b.author === entry.sourceBookAuthor)
    );
    if (match) {
      seen.add(key);
      books.push(match);
    }
  }
  return books;
}

/**
 * Takes pre-fetched genre data (a Map of "title::author" -> genre Set, built
 * by the caller using getBookMetadata for each book from
 * uniqueSourceBooksForGenre) and computes word-density per top genre tag.
 * Kept as a separate, synchronous, pure/testable function rather than
 * doing the fetching in here, so the actual network layer stays entirely
 * in the component.
 */
export function computeGenreDialect(entries, library, yearScope, genreByBook) {
  const scoped = filterEntriesByScope(entries, yearScope);
  const counts = {};

  for (const entry of scoped) {
    if (!entry.sourceBookTitle || entry.sourceBookTitle === 'Untracked') continue;
    const match = (library.all || []).find(
      (b) => b.title === entry.sourceBookTitle && (!entry.sourceBookAuthor || b.author === entry.sourceBookAuthor)
    );
    if (!match) continue;
    const key = `${match.title}::${match.author}`;
    const genres = genreByBook.get(key);
    const topGenre = genres && genres.size ? [...genres][0] : null;
    if (!topGenre) continue;
    counts[topGenre] = (counts[topGenre] || 0) + 1;
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length < MIN_BOOKS_FOR_GENRE || sorted.length === 0) return null;

  const [topGenre, topCount] = sorted[0];
  const runnerUp = sorted[1] || null;
  return { topGenre, topCount, runnerUp: runnerUp ? { genre: runnerUp[0], count: runnerUp[1] } : null };
}

/**
 * Converts whichever insights actually had enough data into slide objects
 * matching the shape every other Shelf Awareness card already uses — so
 * they render through the exact same FlipCard/Slide/LockedTeaser
 * components with zero new UI code. All three are Pro-gated, per the
 * "Vocabulary Vault premium metrics" request.
 */
export function buildVocabInsightSlides({ scrabblePower, linguisticEra, genreDialect, scopeLabel }) {
  const slides = [];
  const periodWord = scopeLabel === 'All Time' ? 'all-time' : `${scopeLabel}`;

  if (scrabblePower) {
    const { totalScore, topWord, wordCount } = scrabblePower;
    slides.push({
      id: 'scrabblePower',
      kind: 'stat',
      locked: true,
      eyebrow: 'Vocabulary power score',
      headline: 'Your Scrabble Power',
      stat: String(totalScore),
      statLabel: `across ${wordCount} logged word${wordCount === 1 ? '' : 's'}`,
      body: `Your ${periodWord} vocabulary growth is worth ${totalScore} Scrabble points. Your highest-value word was "${topWord.word}" (${topWord.score} points).`,
    });
  }

  if (linguisticEra) {
    const { era, pct, dominantCount, totalWithYear, modernCount, persona } = linguisticEra;
    const eraPhrase = era.replace('-', ' ').toLowerCase();
    slides.push({
      id: 'linguisticEra',
      kind: 'stat',
      locked: true,
      eyebrow: 'Your linguistic era',
      headline: persona,
      stat: `${pct}%`,
      statLabel: `of ${totalWithYear} traceable words came from the ${eraPhrase}`,
      body: `${dominantCount} of ${totalWithYear} words you can trace to a specific book came from the ${eraPhrase}.${
        modernCount ? ` Only ${modernCount} came from the modern era.` : ''
      }`,
    });
  }

  if (genreDialect) {
    const { topGenre, topCount, runnerUp } = genreDialect;
    slides.push({
      id: 'genreDialect',
      kind: 'stat',
      locked: true,
      eyebrow: 'Where your words come from',
      headline: `${topGenre} books taught you the most.`,
      stat: String(topCount),
      statLabel: `new words from ${topGenre}`,
      body: runnerUp
        ? `${topGenre} gave you ${topCount} new words — more than any other category you've logged. ${runnerUp.genre} came in second with ${runnerUp.count}.`
        : `${topGenre} gave you ${topCount} new words this period — more than any other category you've logged.`,
    });
  }

  return slides;
}
