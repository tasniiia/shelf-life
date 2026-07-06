import { getBookMetadata, getBookMetadataBatch } from './bookMetadata';
import { parseSeriesInfo } from './metrics';

function jaccard(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union ? intersection / union : 0;
}

/**
 * Computes a specificity weight for every genre word that appears anywhere
 * in this search (the finished book + every candidate). A word that shows
 * up in most of the pool (a broad category, or a stopword that slipped
 * through) gets a low weight; a word that shows up in only one or two books
 * (a specific, distinctive descriptor) gets a high weight. This is the
 * actual fix for "two books both tagged 'north' scored as a genre match" —
 * a coincidental shared generic word now barely moves the needle, while a
 * shared specific one (e.g. "necromancy", "epistolary", "heist") dominates,
 * much closer to how a person would judge two books as "actually similar."
 */
function computeGenreWeights(allMetas) {
  const docFreq = new Map();
  const totalDocs = allMetas.filter((m) => m?.genres.size).length || 1;
  allMetas.forEach((meta) => {
    if (!meta) return;
    meta.genres.forEach((word) => {
      docFreq.set(word, (docFreq.get(word) || 0) + 1);
    });
  });
  const weights = new Map();
  docFreq.forEach((freq, word) => {
    // Smoothed inverse-document-frequency — always positive, higher for
    // rarer words. A word in every book scores just above 1; a word in
    // only one book out of ~20 scores roughly 3-4x that.
    weights.set(word, Math.log((totalDocs + 1) / (freq + 0.5)) + 1);
  });
  return weights;
}

/**
 * Weighted overlap between two genre sets: shared words are summed by
 * specificity weight and divided by the weighted union, so this behaves
 * like Jaccard similarity but with rare/specific words counting far more
 * than common/generic ones. Also returns the shared words ranked most-
 * specific-first, so the explanation text can lead with whatever's actually
 * meaningful instead of an arbitrary generic word.
 */
function weightedGenreOverlap(setA, setB, weights) {
  const shared = [...setA].filter((w) => setB.has(w));
  if (!shared.length) return { score: 0, shared: [] };
  const weightOf = (w) => weights.get(w) ?? 1;
  const sharedWeight = shared.reduce((sum, w) => sum + weightOf(w), 0);
  const unionWords = new Set([...setA, ...setB]);
  const unionWeight = [...unionWords].reduce((sum, w) => sum + weightOf(w), 0);
  const rankedShared = [...shared].sort((a, b) => weightOf(b) - weightOf(a));
  return { score: unionWeight ? sharedWeight / unionWeight : 0, shared: rankedShared, weightOf };
}

function pageSimilarity(a, b) {
  if (!a || !b) return null;
  const diff = Math.abs(a - b);
  const scale = Math.max(a, b, 1);
  return Math.max(0, 1 - diff / scale);
}

function eraSimilarity(a, b) {
  if (!a || !b) return null;
  const diff = Math.abs(a - b);
  return Math.max(0, 1 - diff / 60); // ~60 years apart or more counts as unrelated eras
}

/**
 * Builds a map of seriesName -> Set of entry numbers the reader has
 * already finished, from their "read" shelf. Used to avoid recommending
 * book 2+ (or a prequel numbered #0) of a series the reader hasn't
 * actually started yet.
 */
export function buildSeriesReadHistory(readBooks) {
  const history = new Map();
  readBooks.forEach((book) => {
    const info = parseSeriesInfo(book.title);
    if (!info) return;
    if (!history.has(info.seriesName)) history.set(info.seriesName, new Set());
    history.get(info.seriesName).add(info.entryNumber);
  });
  return history;
}

/**
 * A series entry is a sensible recommendation if it's the series' actual
 * first book (#1 — safe to suggest as a fresh start), OR the reader has
 * already read something else in that series. Otherwise it's book 2+ (or a
 * prequel like "#0") of a series they haven't actually started, which reads
 * as a broken recommendation no matter how well the genre matches —
 * e.g. suggesting "The Ballad of Songbirds and Snakes" (Hunger Games, #0)
 * to someone who has never read The Hunger Games itself.
 */
function isSensibleSeriesEntry(candidate, seriesHistory) {
  const info = parseSeriesInfo(candidate.title);
  if (!info) return true; // not part of a series — no constraint
  if (info.entryNumber === 1) return true; // starting fresh is always fine
  const readEntries = seriesHistory.get(info.seriesName);
  return !!(readEntries && readEntries.size > 0);
}

/**
 * Filters a to-read pool down to books that make sense to recommend given
 * reading history — dropping book 2+ (or a prequel like "#0") of any series
 * the reader hasn't actually started. Meant to run BEFORE random sampling,
 * so excluded books don't eat into the sample size or waste a metadata
 * lookup on a book we'd never recommend anyway.
 */
export function filterSensibleCandidates(toReadBooks, readBooks) {
  const seriesHistory = buildSeriesReadHistory(readBooks);
  const eligible = toReadBooks.filter((book) => isSensibleSeriesEntry(book, seriesHistory));
  const excludedCount = toReadBooks.length - eligible.length;
  if (excludedCount > 0) {
    console.info(
      `[ShelfLife] Excluded ${excludedCount} book(s) from What's Next candidates — later entries or prequels ` +
        `in a series you haven't started yet.`
    );
  }
  return eligible;
}

/**
 * Builds a Goodreads link for a book — a direct ISBN redirect when we have
 * one (reliable, lands on the exact edition), otherwise a Goodreads search
 * for title + author.
 */
export function goodreadsUrl(book) {
  if (book.isbn) {
    return `https://www.goodreads.com/book/isbn/${encodeURIComponent(book.isbn)}`;
  }
  const q = encodeURIComponent(`${book.title} ${book.author}`.trim());
  return `https://www.goodreads.com/search?q=${q}`;
}

/**
 * Scores a candidate against the finished book on a fixed 100-point scale:
 * genre 60, keywords 15, author 15, length 5, era 5. Critically, a signal
 * we don't have data for contributes exactly 0 toward that total — it does
 * NOT shrink the denominator the way a renormalized average would. That
 * distinction matters a lot in practice: renormalizing let a candidate with
 * almost no data (say, just a matching page count) score deceptively high,
 * because dividing by a tiny denominator inflates the average of whatever
 * little is left. A candidate with real (if partial) genre overlap could
 * then lose to one with zero genre data at all, which is backwards from
 * "prioritize genre." Fixing the denominator at 100 means missing data can
 * only cost points, never manufacture them.
 */
function scoreComponent(sim, present, direction) {
  if (!present) return 0;
  return direction === 'different' ? 1 - sim : sim;
}

function scorePair(finished, finishedMeta, candidate, candidateMeta, direction, genreWeights) {
  const hasGenres = !!(finishedMeta?.genres.size && candidateMeta?.genres.size);
  const hasKeywords = !!(finishedMeta?.keywords.size && candidateMeta?.keywords.size);
  const sameAuthorKnown = !!(finished.author && candidate.author);
  const pagesSim = pageSimilarity(finished.pages, candidate.pages);
  const eraSim = eraSimilarity(finished.originalPublicationYear, candidate.originalPublicationYear);

  const genreScore = scoreComponent(
    hasGenres ? weightedGenreOverlap(finishedMeta.genres, candidateMeta.genres, genreWeights).score : 0,
    hasGenres,
    direction
  );
  const keywordScore = scoreComponent(
    hasKeywords ? jaccard(finishedMeta.keywords, candidateMeta.keywords) : 0,
    hasKeywords,
    direction
  );
  const authorScore = scoreComponent(
    sameAuthorKnown ? (finished.author === candidate.author ? 1 : 0) : 0,
    sameAuthorKnown,
    direction
  );
  const pagesScore = scoreComponent(pagesSim ?? 0, pagesSim != null, direction);
  const eraScore = scoreComponent(eraSim ?? 0, eraSim != null, direction);

  const raw = genreScore * 60 + keywordScore * 15 + authorScore * 15 + pagesScore * 5 + eraScore * 5;
  return Math.round(raw);
}

const GENRE_MATCH_TEMPLATES = [
  (genres, finishedTitle) =>
    `It shares the genre${genres.length > 1 ? 's' : ''} "${genres.join('", "')}" with ${finishedTitle} — the strongest signal we have for a similar feel.`,
  (genres, finishedTitle) =>
    `Genre-wise, this lines up closely with ${finishedTitle} — both are tagged "${genres.join('", "')}".`,
  (genres, finishedTitle) =>
    `The clearest overlap here is genre: "${genres.join('", "')}," same as ${finishedTitle}.`,
];
const GENRE_NO_OVERLAP_TEMPLATES = [
  () => `We found genre data for both books, but it doesn't actually overlap, so this ranking leans on the other factors below.`,
  () => `Genre tags didn't line up between these two, so author, length, and era carried more weight here.`,
  () => `No real genre overlap turned up — this one earned its spot on the strength of the other signals below.`,
];
const KEYWORD_FALLBACK_TEMPLATES = [
  (kws) => `We couldn't find structured genre tags for one or both titles, but their descriptions share the themes "${kws.join('", "')}," which is what's driving this match.`,
  (kws) => `No formal genre tags here, but the descriptions both touch on "${kws.join('", "')}" — that's the real thread connecting them.`,
  (kws) => `Genre tags were thin, but shared description themes ("${kws.join('", "')}") point to a real connection.`,
];
const NO_DATA_TEMPLATES = [
  () => `We couldn't find genre or description data for one or both titles (likely a thin catalog entry for a newer or less common release), so this ranking leans on author, length, and era instead.`,
  () => `Genre and description data came up empty for one of these titles, so author, length, and era are doing the work here.`,
  () => `Catalog data was thin for one of these — author, length, and publication era are the basis for this one.`,
];
const SAME_AUTHOR_TEMPLATES = [
  (t) => `It's also by the same author as ${t}, so the voice and style should feel familiar.`,
  (t) => `Same author as ${t} — expect a familiar voice.`,
  (t) => `Written by the same author as ${t}.`,
];
const LENGTH_SIMILAR_TEMPLATES = [
  (c, f) => `At ${c} pages vs. ${f}, it's a similar length commitment.`,
  (c, f) => `Length-wise, it's close to what you just read (${c} vs. ${f} pages).`,
  (c, f) => `A comparable page count too — ${c} vs. ${f}.`,
];
const LENGTH_DIFFERENT_TEMPLATES = [
  (c, f) => `At ${c} pages vs. ${f}, expect a noticeably different length.`,
  (c, f) => `It's a different kind of time commitment — ${c} pages vs. ${f}.`,
  (c, f) => `Page count is a real departure here: ${c} vs. ${f}.`,
];
const ERA_SIMILAR_TEMPLATES = [
  (c, f) => `It was published around the same time (${c} vs. ${f}).`,
  (c, f) => `Same era, roughly — ${c} vs. ${f}.`,
  (c, f) => `Publication dates land close together (${c} vs. ${f}).`,
];
const ERA_DIFFERENT_TEMPLATES = [
  (c, f) => `It comes from a different era (${c} vs. ${f}).`,
  (c, f) => `Published in a different time period (${c} vs. ${f}).`,
  (c, f) => `A different publication era — ${c} vs. ${f}.`,
];
const RATING_TEMPLATES = [
  (r) => `Other readers rate it ${r}/5 elsewhere.`,
  (r) => `It holds a ${r}/5 average rating elsewhere.`,
  (r) => `Elsewhere, it's rated ${r}/5.`,
];
const DIFF_NO_OVERLAP_TEMPLATES = [
  (t) => `It shares no genre overlap with ${t} — a clean break from what you just read.`,
  (t) => `Genre-wise this has nothing in common with ${t}, which is exactly the point.`,
  (t) => `No genre overlap with ${t} at all — a real palate cleanser.`,
];
const DIFF_NO_DATA_TEMPLATES = [
  () => `We couldn't find genre data for one or both titles, so this "different" pick leans on author, length, and era instead.`,
  () => `Genre data was unavailable for one of these, so the contrast here is based on author, length, and era.`,
  () => `Catalog data was thin, so author, length, and era are what set this one apart.`,
];
const DIFF_AUTHOR_TEMPLATES = [
  (c, f) => `It's also by a different author (${c} vs. ${f}).`,
  (c, f) => `Different author too — ${c} vs. ${f}.`,
  (c, f) => `Not the same author: ${c} vs. ${f}.`,
];

function pick(pool, variant) {
  return pool[variant % pool.length];
}

function buildWhy(finished, finishedMeta, candidate, candidateMeta, direction, variant = 0, genreWeights) {
  const sentences = [];
  const sameAuthor = finished.author === candidate.author;
  const hasGenreData = !!(finishedMeta?.genres.size && candidateMeta?.genres.size);
  const overlap = hasGenreData
    ? weightedGenreOverlap(finishedMeta.genres, candidateMeta.genres, genreWeights)
    : { shared: [], weightOf: () => 1 };
  // A single coincidental shared word (especially a fairly common one) isn't
  // a meaningful match on its own — require either multiple shared words,
  // or one that's genuinely specific (rare across this search's pool).
  const meaningfulSharedGenres =
    overlap.shared.length >= 2 || (overlap.shared.length === 1 && overlap.weightOf(overlap.shared[0]) > 1.5)
      ? overlap.shared
      : [];
  const hasKeywordData = !!(finishedMeta?.keywords.size && candidateMeta?.keywords.size);
  const sharedKeywords = hasKeywordData
    ? [...finishedMeta.keywords].filter((k) => candidateMeta.keywords.has(k))
    : [];
  const lengthDiff =
    finished.pages && candidate.pages ? Math.abs(finished.pages - candidate.pages) : null;
  const eraDiff =
    finished.originalPublicationYear && candidate.originalPublicationYear
      ? Math.abs(finished.originalPublicationYear - candidate.originalPublicationYear)
      : null;

  if (direction === 'similar') {
    if (meaningfulSharedGenres.length) {
      sentences.push(pick(GENRE_MATCH_TEMPLATES, variant)(meaningfulSharedGenres.slice(0, 4), finished.title));
    } else if (hasGenreData) {
      sentences.push(pick(GENRE_NO_OVERLAP_TEMPLATES, variant)());
    } else if (sharedKeywords.length) {
      sentences.push(pick(KEYWORD_FALLBACK_TEMPLATES, variant)(sharedKeywords.slice(0, 3)));
    } else {
      sentences.push(pick(NO_DATA_TEMPLATES, variant)());
    }
    if (sameAuthor) {
      sentences.push(pick(SAME_AUTHOR_TEMPLATES, variant)(finished.title));
    }
    if (lengthDiff != null) {
      const pool = lengthDiff <= 60 ? LENGTH_SIMILAR_TEMPLATES : LENGTH_DIFFERENT_TEMPLATES;
      sentences.push(pick(pool, variant)(candidate.pages, finished.pages));
    }
    if (eraDiff != null) {
      const pool = eraDiff <= 10 ? ERA_SIMILAR_TEMPLATES : ERA_DIFFERENT_TEMPLATES;
      sentences.push(pick(pool, variant)(candidate.originalPublicationYear, finished.originalPublicationYear));
    }
    if (candidateMeta?.rating) {
      sentences.push(pick(RATING_TEMPLATES, variant)(candidateMeta.rating.toFixed(1)));
    }
  } else {
    if (hasGenreData && !meaningfulSharedGenres.length) {
      sentences.push(pick(DIFF_NO_OVERLAP_TEMPLATES, variant)(finished.title));
    } else if (!hasGenreData) {
      sentences.push(pick(DIFF_NO_DATA_TEMPLATES, variant)());
    }
    if (!sameAuthor && finished.author && candidate.author) {
      sentences.push(pick(DIFF_AUTHOR_TEMPLATES, variant)(candidate.author, finished.author));
    }
    if (lengthDiff != null) {
      sentences.push(
        lengthDiff > 150
          ? pick(LENGTH_DIFFERENT_TEMPLATES, variant)(candidate.pages, finished.pages)
          : `Length is fairly close (${candidate.pages} vs. ${finished.pages} pages) — the contrast here is more about genre and era.`
      );
    }
    if (eraDiff != null) {
      sentences.push(
        eraDiff > 30
          ? pick(ERA_DIFFERENT_TEMPLATES, variant)(candidate.originalPublicationYear, finished.originalPublicationYear)
          : `Published around the same time, so the contrast is more about content than context.`
      );
    }
    if (!sentences.length) {
      sentences.push(`A change of pace from ${finished.title} — pulled from your to-read shelf as a palate cleanser.`);
    }
  }

  return sentences.join(' ');
}

/**
 * Scores every candidate against whatever metadata is currently available
 * (some entries may be null/undefined if their lookup hasn't resolved yet)
 * and returns the top N as fully-built match objects. Shared by both the
 * live "so far" ranking during a search and the final authoritative result.
 */
function rankAndBuildMatches(finishedBook, finishedMeta, candidates, candidateMetas, direction, topN, readingVelocity) {
  const genreWeights = computeGenreWeights([finishedMeta, ...candidateMetas]);
  const scored = candidates.map((candidate, i) => ({
    candidate,
    candidateMeta: candidateMetas[i],
    score: scorePair(finishedBook, finishedMeta, candidate, candidateMetas[i], direction, genreWeights),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map(({ candidate, candidateMeta }, rank) => ({
    title: candidate.title,
    author: candidate.author,
    isbn: candidate.isbn,
    pages: candidate.pages || null,
    coverUrl: candidateMeta?.coverUrl || null,
    buyInfo: candidateMeta?.buyInfo || null,
    estimatedDays:
      readingVelocity && candidate.pages ? Math.max(1, Math.round(candidate.pages / readingVelocity)) : null,
    why: buildWhy(finishedBook, finishedMeta, candidate, candidateMeta, direction, rank, genreWeights),
    goodreadsUrl: goodreadsUrl(candidate),
  }));
}

/**
 * Ranks `candidates` against `finishedBook` using real external metadata
 * (Open Library + Google Books genre tags, descriptions, ratings) plus CSV
 * fields (author, page count, publication era). Genre overlap is the
 * dominant signal — see scorePair for the weighting.
 *
 * `direction`:
 *   'similar'   — closest match to what you just finished (default)
 *   'different' — a deliberate change of pace / polar opposite
 *
 * `readingVelocity` (pages/day, from computeReadingVelocity) is optional —
 * when provided, each match gets an `estimatedDays` "at your pace" figure.
 *
 * `onPartialUpdate(matches, isComplete)`, if provided, fires every time a
 * candidate's lookup resolves with the current best-guess top N — so the
 * UI can show and refine live results instead of a blank wait for the
 * entire batch. The final return value is always the fully-resolved,
 * authoritative ranking regardless of what partial updates showed.
 */
export async function matchBooksMetadata({
  finishedBook,
  candidates,
  topN = 3,
  direction = 'similar',
  onProgress,
  onPartialUpdate,
  readingVelocity,
}) {
  const finishedMeta = await getBookMetadata(finishedBook);

  if (!finishedMeta || !finishedMeta.genres.size) {
    console.info(
      `[ShelfLife] No genre data found for the book you just finished ("${finishedBook.title}" by ${finishedBook.author}). ` +
        `Since genre matching needs both sides to have data, every result will fall back to author/length/era until this ` +
        `one resolves. Check the warnings above for why the lookup failed.`
    );
  }

  const candidateMetas = await getBookMetadataBatch(candidates, 6, (done, total, partialResults) => {
    onProgress?.(done, total);
    if (onPartialUpdate) {
      const partialMatches = rankAndBuildMatches(
        finishedBook,
        finishedMeta,
        candidates,
        partialResults,
        direction,
        topN,
        readingVelocity
      );
      onPartialUpdate(partialMatches, done >= total);
    }
  });

  const matches = rankAndBuildMatches(finishedBook, finishedMeta, candidates, candidateMetas, direction, topN, readingVelocity);
  return { matches, usedExternalData: !!finishedMeta };
}
