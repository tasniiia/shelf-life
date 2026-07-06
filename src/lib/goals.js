// Pure logic for Reading Goals — period math, progress calculation, and
// the streak rollover check. Kept free of IndexedDB calls so it's fully
// unit-testable, same split as vocabulary.js / vocabularyDb.js.

/**
 * Computes the start/end bounds and a stable string key for the CURRENT
 * instance of a recurring period, as of `referenceDate`. Goals are
 * recurring by design — a "quarterly books goal" always tracks whichever
 * quarter it currently is, the way a fitness app's weekly step goal
 * resets every week, rather than being a one-off target for a single
 * fixed date range.
 */
export function getPeriodBounds(period, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0-11

  if (period === 'month') {
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 0, 23, 59, 59, 999),
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
    };
  }
  if (period === 'quarter') {
    const q = Math.floor(month / 3); // 0-3
    return {
      start: new Date(year, q * 3, 1),
      end: new Date(year, q * 3 + 3, 0, 23, 59, 59, 999),
      key: `${year}-Q${q + 1}`,
    };
  }
  if (period === 'year') {
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31, 23, 59, 59, 999),
      key: `${year}`,
    };
  }
  // 'all' — no bound at all, tracks everything ever
  return { start: null, end: null, key: 'all' };
}

function inRange(date, start, end) {
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

const PERIOD_LABELS = {
  month: 'this month',
  quarter: 'this quarter',
  year: 'this year',
  all: 'all time',
};

export function periodLabel(period) {
  return PERIOD_LABELS[period] || period;
}

const GOAL_TYPE_LABELS = {
  books: 'books read',
  pages: 'pages read',
  authors: 'new authors',
  genres: 'genres explored',
  vocab: 'words logged',
};

export function goalTypeLabel(type) {
  return GOAL_TYPE_LABELS[type] || type;
}

/**
 * Progress for the 4 goal types that need no network data at all — books,
 * pages, and vocab words are straightforward period counts; "new authors"
 * compares the period's authors against every author read BEFORE the
 * period started, which is free since author name is already in the CSV
 * for every book, past or present.
 */
export function computeLocalGoalProgress(goal, library, vocabEntries) {
  const { start, end } = getPeriodBounds(goal.period);

  if (goal.type === 'books') {
    const current = library.read.filter((b) => inRange(b.dateRead, start, end)).length;
    return { current, target: goal.target };
  }

  if (goal.type === 'pages') {
    const current = library.read
      .filter((b) => inRange(b.dateRead, start, end))
      .reduce((sum, b) => sum + (b.pages || 0), 0);
    return { current, target: goal.target };
  }

  if (goal.type === 'vocab') {
    const current = vocabEntries.filter((e) => inRange(e.dateLearned ? new Date(e.dateLearned) : null, start, end))
      .length;
    return { current, target: goal.target };
  }

  if (goal.type === 'authors') {
    const periodBooks = library.read.filter((b) => inRange(b.dateRead, start, end));
    const priorAuthors = new Set(
      library.read.filter((b) => b.dateRead && (!start || b.dateRead < start)).map((b) => b.author)
    );
    const newAuthors = new Set(periodBooks.filter((b) => !priorAuthors.has(b.author)).map((b) => b.author));
    return { current: newAuthors.size, target: goal.target };
  }

  return null; // 'genres' needs async data — see computeGenreGoalProgress
}

/**
 * Genre diversity within the period — see the chat note on why this
 * measures "how many different genres this period" rather than "genres
 * truly new to you," which would need a much larger fetch across your
 * entire reading history just to establish a baseline.
 *
 * Takes pre-fetched genre data (a Map of "title::author" -> genre Set) so
 * the actual network layer stays in the component, same split used for
 * the Genre Dialect Pro card.
 */
export function computeGenreGoalProgress(goal, library, genreByBook) {
  const { start, end } = getPeriodBounds(goal.period);
  const periodBooks = library.read.filter((b) => inRange(b.dateRead, start, end));

  const genres = new Set();
  periodBooks.forEach((book) => {
    const key = `${book.title}::${book.author}`;
    const bookGenres = genreByBook.get(key);
    const topGenre = bookGenres && bookGenres.size ? [...bookGenres][0] : null;
    if (topGenre) genres.add(topGenre);
  });

  return { current: genres.size, target: goal.target };
}

/**
 * Returns the unique read-shelf books from the CURRENT period only — for
 * a targeted genre fetch, not the whole read shelf.
 */
export function booksNeedingGenreForGoal(goal, library) {
  const { start, end } = getPeriodBounds(goal.period);
  return library.read.filter((b) => inRange(b.dateRead, start, end));
}

/**
 * Checks whether a goal's tracked period has rolled over since it was
 * last checked, and if so, updates its streak: +1 if the just-finished
 * period's target was met, reset to 0 if not. Returns the goal unchanged
 * if the period hasn't rolled over yet. This is what makes "3 quarters in
 * a row" possible without a separate history store — each goal just
 * remembers the last period it checked and its running streak.
 *
 * `getPastProgress` is a callback the caller provides to compute progress
 * for the *previous* period specifically (genre goals need their own
 * async fetch for that older period, so this can't be fully self-
 * contained the way the rest of this file is).
 */
export function checkStreakRollover(goal, currentPeriodKey, pastProgress) {
  if (goal.lastCheckedPeriodKey === currentPeriodKey) {
    return goal; // no rollover — still the same period as last check
  }
  if (!goal.lastCheckedPeriodKey) {
    // First time this goal has ever been checked — nothing to roll over yet.
    return { ...goal, lastCheckedPeriodKey: currentPeriodKey };
  }
  const met = pastProgress != null && pastProgress.current >= pastProgress.target;
  return {
    ...goal,
    streak: met ? (goal.streak || 0) + 1 : 0,
    lastCheckedPeriodKey: currentPeriodKey,
  };
}

export function buildGoal({ type, target, period, label }) {
  return {
    id: crypto.randomUUID(),
    type,
    target: Number(target),
    period,
    label: label?.trim() || '',
    createdAt: new Date().toISOString(),
    streak: 0,
    lastCheckedPeriodKey: null,
  };
}
