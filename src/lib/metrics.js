// Pure-JS metrics for the "Shelf Awareness" summary. No network calls here —
// these run entirely on the parsed CSV in the browser.

function mean(nums) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stddev(nums) {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  return Math.sqrt(mean(nums.map((n) => (n - m) ** 2)));
}

function daysBetween(a, b) {
  return Math.abs((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

// 1. Commitment Phobe vs Monogamist — finished vs abandoned/stalled
export function commitmentRatio({ read, dnf, currentlyReading }) {
  const finished = read.length;
  const abandoned = dnf.length;
  const stalled = currentlyReading.length;
  const total = finished + abandoned;
  const finishRate = total ? finished / total : null;
  let verdict = 'The Monogamist';
  if (finishRate !== null && finishRate < 0.6) verdict = 'The Commitment-Phobe';
  return { finished, abandoned, stalled, finishRate, verdict };
}

// 2. Temporal Whiplash — spread of original publication years read
export function temporalWhiplash(read) {
  const years = read.map((b) => b.originalPublicationYear).filter(Boolean);
  if (!years.length) return null;
  const min = Math.min(...years);
  const max = Math.max(...years);
  const spread = max - min;
  const sd = Math.round(stddev(years));

  const decadeCounts = {};
  years.forEach((y) => {
    const decade = Math.floor(y / 10) * 10;
    decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
  });
  let decades = Object.entries(decadeCounts)
    .map(([decade, count]) => ({ label: `${decade}s`, count, decade: Number(decade) }))
    .sort((a, b) => a.decade - b.decade);

  // A card is only wide enough for ~6 legible bars — merge everything
  // before the most recent 5 decades into one "Before Xs" bucket rather
  // than truncating labels down to unreadable fragments.
  const MAX_BARS = 6;
  if (decades.length > MAX_BARS) {
    const keepCount = MAX_BARS - 1;
    const recent = decades.slice(-keepCount);
    const older = decades.slice(0, -keepCount);
    const olderTotal = older.reduce((sum, d) => sum + d.count, 0);
    const cutoffLabel = `Before ${recent[0].label}`;
    decades = [{ label: cutoffLabel, count: olderTotal, decade: older[0].decade }, ...recent];
  }

  return { min, max, spread, stddev: sd, decades };
}

// 4a. The Devoted Fan — the author you've read the most books by.
export function devotedFan(read) {
  if (!read.length) return null;
  const counts = {};
  read.forEach((b) => {
    if (!b.author) return;
    const key = b.author.trim();
    counts[key] = (counts[key] || 0) + 1;
  });
  const ranked = Object.entries(counts)
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count);

  if (!ranked.length || ranked[0].count < 2) return null; // no repeat authors — nothing to spotlight

  const top5 = ranked.slice(0, 5);
  const maxCount = top5[0].count;
  const topAuthors = top5.map((a) => ({ label: a.author, count: a.count, pct: Math.round((a.count / maxCount) * 100) }));

  return { author: ranked[0].author, count: ranked[0].count, topAuthors };
}

// 4b. The Format Loyalist — breakdown of Binding (Kindle/Paperback/Hardcover/etc).
function normalizeBinding(raw) {
  const b = raw.toLowerCase();
  if (b.includes('kindle') || b.includes('ebook') || b.includes('e-book')) return 'Kindle';
  if (b.includes('audio')) return 'Audiobook';
  if (b.includes('hardcover') || b.includes('hardback')) return 'Hardcover';
  if (b.includes('paperback')) return 'Paperback';
  return 'Other';
}

export function formatLoyalist(read) {
  const withBinding = read.filter((b) => b.binding);
  if (!withBinding.length) return null;
  const counts = {};
  withBinding.forEach((b) => {
    const label = normalizeBinding(b.binding);
    counts[label] = (counts[label] || 0) + 1;
  });
  const total = withBinding.length;
  const entries = Object.entries(counts)
    .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
  const top = entries[0];
  const verdict = top.pct >= 60 ? `The ${top.label} Loyalist` : 'The Format Omnivore';
  return { entries, verdict, topLabel: top.label, topPct: top.pct };
}

// 4c. Early Adopter vs Archive Digger — how close Date Read tends to land
// to a book's publication year.
export function earlyAdopterProfile(read) {
  const gaps = read
    .filter((b) => b.dateRead && (b.originalPublicationYear || b.yearPublished))
    .map((b) => b.dateRead.getFullYear() - (b.originalPublicationYear || b.yearPublished))
    .filter((gap) => gap >= 0 && gap < 300); // drop obviously bad data (pre-release / bad OCR years)
  if (gaps.length < 3) return null;
  const avgGap = mean(gaps);
  let verdict = 'The Balanced Reader';
  if (avgGap <= 1.5) verdict = 'The Early Adopter';
  else if (avgGap >= 8) verdict = 'The Archive Digger';

  const bucketDefs = [
    { label: '0-2y', test: (g) => g <= 2 },
    { label: '3-5y', test: (g) => g > 2 && g <= 5 },
    { label: '6-10y', test: (g) => g > 5 && g <= 10 },
    { label: '10y+', test: (g) => g > 10 },
  ];
  const buckets = bucketDefs.map((d) => ({ label: d.label, count: gaps.filter(d.test).length }));

  return { avgGap: Number(avgGap.toFixed(1)), verdict, buckets };
}

// 5. Weekend Warrior vs Night Shift — consistency of Date Added -> Date Read gaps
export function readingPaceProfile(read) {
  const gaps = read
    .filter((b) => b.dateAdded && b.dateRead && b.dateRead >= b.dateAdded)
    .map((b) => daysBetween(b.dateAdded, b.dateRead));
  if (gaps.length < 3) return null;
  const avgGap = mean(gaps);
  const sd = stddev(gaps);
  const coefficientOfVariation = avgGap ? sd / avgGap : 0;
  // High variation = bursty binge reading ("Weekend Warrior");
  // low variation = a steady, similar-length cadence every time ("Night Shift").
  const verdict = coefficientOfVariation > 0.75 ? 'The Weekend Warrior' : 'The Night Shift';

  const bucketDefs = [
    { label: '<30d', test: (g) => g < 30 },
    { label: '30-90d', test: (g) => g >= 30 && g < 90 },
    { label: '90-180d', test: (g) => g >= 90 && g < 180 },
    { label: '180d+', test: (g) => g >= 180 },
  ];
  const buckets = bucketDefs.map((d) => ({ label: d.label, count: gaps.filter(d.test).length }));

  return {
    avgGapDays: Math.round(avgGap),
    variationCoefficient: Number(coefficientOfVariation.toFixed(2)),
    verdict,
    buckets,
  };
}

// 6. The Grade Curve — shape of your own star-rating distribution (no
// external "world average" needed, since Goodreads exports no longer
// include one). Are you generous with 5 stars, or stingy with them?
export function gradeCurve(read) {
  const rated = read.filter((b) => b.myRating);
  if (rated.length < 3) return null;
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  rated.forEach((b) => {
    counts[b.myRating] = (counts[b.myRating] || 0) + 1;
  });
  const total = rated.length;
  const avg = mean(rated.map((b) => b.myRating));
  const pctFiveStar = Math.round((counts[5] / total) * 100);
  const pctLowStar = Math.round(((counts[1] + counts[2]) / total) * 100);

  let verdict = 'The Fair Grader';
  if (pctFiveStar >= 45) verdict = 'The Easy Grader';
  else if (pctFiveStar <= 15 || pctLowStar >= 25) verdict = 'The Tough Critic';

  return { avg: Number(avg.toFixed(2)), pctFiveStar, pctLowStar, counts, verdict };
}

// 7. Literary Diet — page-count buckets
export function literaryDiet(read) {
  const withPages = read.filter((b) => b.pages);
  if (!withPages.length) return null;
  const buckets = { snacks: 0, meals: 0, foodComas: 0 };
  withPages.forEach((b) => {
    if (b.pages < 250) buckets.snacks += 1;
    else if (b.pages <= 450) buckets.meals += 1;
    else buckets.foodComas += 1;
  });
  const total = withPages.length;
  return {
    ...buckets,
    total,
    pct: {
      snacks: Math.round((buckets.snacks / total) * 100),
      meals: Math.round((buckets.meals / total) * 100),
      foodComas: Math.round((buckets.foodComas / total) * 100),
    },
  };
}

// 8. Series Commitment — parses Title for series notation like
// "(Mistborn, #1)" to see what share of your reading is series vs. standalone.
const SERIES_PATTERN = /\([^()]*,\s*#[\d.]+\)\s*$/;
const SERIES_CAPTURE_PATTERN = /\(([^()]+),\s*#([\d.]+)\)\s*$/;

/**
 * Extracts { seriesName, entryNumber } from a Goodreads-style title like
 * "Mistborn: The Final Empire (Mistborn, #1)" -> { seriesName: "Mistborn",
 * entryNumber: 1 }. Returns null for titles with no series notation.
 * entryNumber can be fractional (novellas are often "#0.5", "#2.5", etc)
 * or 0 (prequels are commonly numbered "#0").
 */
export function parseSeriesInfo(title) {
  const match = SERIES_CAPTURE_PATTERN.exec(title);
  if (!match) return null;
  const entryNumber = Number(match[2]);
  if (!Number.isFinite(entryNumber)) return null;
  return { seriesName: match[1].trim().toLowerCase(), entryNumber };
}

export function seriesCommitment(read) {
  if (!read.length) return null;
  const inSeries = read.filter((b) => SERIES_PATTERN.test(b.title)).length;
  const standalone = read.length - inSeries;
  const pct = Math.round((inSeries / read.length) * 100);
  let verdict = 'The Mix-It-Upper';
  if (pct >= 60) verdict = 'The Series Binger';
  else if (pct <= 15) verdict = 'The Standalone Purist';
  return { inSeries, standalone, pct, verdict };
}

// 9. The Documentarian — how often you actually leave a review, however short.
export function documentarian(read) {
  if (!read.length) return null;
  const reviewed = read.filter((b) => b.review && b.review.trim().length > 0).length;
  const notReviewed = read.length - reviewed;
  const pct = Math.round((reviewed / read.length) * 100);
  let verdict = 'The Occasional Annotator';
  if (pct >= 50) verdict = 'The Documentarian';
  else if (pct <= 10) verdict = 'The Silent Reader';
  return { reviewed, notReviewed, pct, verdict };
}

// 10. To-Read Graveyard — oldest untouched book on the TBR shelf
export function toReadGraveyard(toRead) {
  const withDates = toRead.filter((b) => b.dateAdded);
  if (!withDates.length) return null;
  const oldest = withDates.reduce((o, b) => (b.dateAdded < o.dateAdded ? b : o));
  const daysWaiting = Math.round(daysBetween(oldest.dateAdded, new Date()));
  return { book: oldest, daysWaiting, yearsWaiting: Number((daysWaiting / 365).toFixed(1)) };
}

// Top N rated books, used for display
export function topRated(read, n = 5) {
  return [...read]
    .filter((b) => b.myRating)
    .sort((a, b) => b.myRating - a.myRating || (b.dateRead ?? 0) - (a.dateRead ?? 0))
    .slice(0, n);
}

// Distinct years the person has finished a book in, most recent first —
// powers the "Annual Recap" year picker.
export function getAvailableYears(library) {
  const years = new Set();
  library.read.forEach((b) => {
    if (b.dateRead) years.add(b.dateRead.getFullYear());
  });
  return [...years].sort((a, b) => b - a);
}

/**
 * Scopes a library to a single reading year (or returns it unchanged for
 * 'all'). Only `read`, `dnf`, and `currentlyReading` are scoped — `toRead`
 * (used for the To-Read Graveyard) always reflects your current backlog
 * regardless of which year's reading you're recapping, since "oldest unread
 * book" isn't really a per-year question.
 *
 * DNF/currently-reading entries usually have no Date Read, so they're
 * matched to a year by Date Added instead, as the closest available signal.
 */
export function filterLibraryByYear(library, year) {
  if (year === 'all') return library;
  const y = Number(year);
  const read = library.read.filter((b) => b.dateRead && b.dateRead.getFullYear() === y);
  const dnf = library.dnf.filter((b) =>
    b.dateRead ? b.dateRead.getFullYear() === y : b.dateAdded && b.dateAdded.getFullYear() === y
  );
  const currentlyReading = library.currentlyReading.filter(
    (b) => b.dateAdded && b.dateAdded.getFullYear() === y
  );
  return { ...library, read, dnf, currentlyReading };
}

// 11. The Page-to-Rating ROI — do you actually rate long books higher, or
// is that just a story people tell themselves?
export function pageRatingRoi(read) {
  const buckets = { short: [], medium: [], long: [] };
  read.forEach((b) => {
    if (!b.pages || !b.myRating) return;
    if (b.pages < 250) buckets.short.push(b.myRating);
    else if (b.pages <= 450) buckets.medium.push(b.myRating);
    else buckets.long.push(b.myRating);
  });
  const defs = [
    { key: 'short', label: 'Short (<250pg)' },
    { key: 'medium', label: 'Medium (250\u2013450pg)' },
    { key: 'long', label: 'Long (450pg+)' },
  ];
  // Require at least 3 rated books in a bucket before trusting its average —
  // a single 5-star outlier shouldn't drive the whole comparison.
  const entries = defs
    .map((d) => ({ label: d.label, count: buckets[d.key].length, avg: buckets[d.key].length ? mean(buckets[d.key]) : null }))
    .filter((e) => e.count >= 3);
  if (entries.length < 2) return null;
  const best = entries.reduce((a, b) => (b.avg > a.avg ? b : a));
  const worst = entries.reduce((a, b) => (b.avg < a.avg ? b : a));
  return { entries, best, worst };
}

// 12. Seasonal Velocity — pages read per calendar month, regardless of year,
// to see if reading pace has a seasonal rhythm.
export function seasonalVelocity(read) {
  const monthTotals = new Array(12).fill(0);
  let any = false;
  read.forEach((b) => {
    if (!b.dateRead || !b.pages) return;
    monthTotals[b.dateRead.getMonth()] += b.pages;
    any = true;
  });
  if (!any) return null;

  const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const buckets = monthTotals.map((pages, i) => ({ label: monthLabels[i], count: pages }));

  const monthsWithReading = monthTotals.filter((v) => v > 0);
  if (!monthsWithReading.length) return null;
  const peakIdx = monthTotals.indexOf(Math.max(...monthTotals));
  let troughIdx = -1;
  let troughVal = Infinity;
  monthTotals.forEach((v, i) => {
    if (v > 0 && v < troughVal) {
      troughVal = v;
      troughIdx = i;
    }
  });

  const winterTotal = [11, 0, 1].reduce((s, m) => s + monthTotals[m], 0); // Dec/Jan/Feb
  const summerTotal = [5, 6, 7].reduce((s, m) => s + monthTotals[m], 0); // Jun/Jul/Aug
  let persona = 'The Steady Reader';
  if (winterTotal > summerTotal * 1.3) persona = 'The Winter Hibernator';
  else if (summerTotal > winterTotal * 1.3) persona = 'The Summer Sprinter';

  return {
    buckets,
    peakMonth: monthNames[peakIdx],
    peakPages: monthTotals[peakIdx],
    troughMonth: troughIdx >= 0 ? monthNames[troughIdx] : null,
    troughPages: troughIdx >= 0 ? troughVal : null,
    persona,
  };
}

// 13. The Time Jump — the single biggest gap in publication year between
// two books read back-to-back (distinct from Temporal Whiplash, which
// measures the spread across the whole shelf rather than one dramatic
// consecutive-read jump).
export function biggestTimeJump(read) {
  const sorted = read
    .filter((b) => b.dateRead && b.originalPublicationYear)
    .sort((a, b) => a.dateRead - b.dateRead);
  if (sorted.length < 2) return null;

  let maxGap = -1;
  let pair = null;
  for (let i = 1; i < sorted.length; i++) {
    const gap = Math.abs(sorted[i].originalPublicationYear - sorted[i - 1].originalPublicationYear);
    if (gap > maxGap) {
      maxGap = gap;
      pair = [sorted[i - 1], sorted[i]];
    }
  }
  if (!pair || maxGap <= 0) return null;
  return { gap: maxGap, from: pair[0], to: pair[1] };
}

// Total pages read — simple sum, used as a "hero" stat.
export function totalPagesRead(read) {
  return read.reduce((sum, b) => sum + (b.pages || 0), 0);
}

/**
 * Median pages-per-day reading velocity, estimated from gaps between
 * consecutive Date Read entries (the CSV has no "date started," so the
 * previous book's finish date is the closest available proxy for "when did
 * I start this one"). Gaps over 45 days are excluded so a long pause between
 * books doesn't get misread as "45 days to read one book." Used by the Vibe
 * Matcher's "at your usual pace" estimate.
 */
export function computeReadingVelocity(read) {
  const sorted = read.filter((b) => b.dateRead && b.pages).sort((a, b) => a.dateRead - b.dateRead);
  const rates = [];
  for (let i = 1; i < sorted.length; i++) {
    const days = daysBetween(sorted[i - 1].dateRead, sorted[i].dateRead);
    if (days > 0 && days <= 45) rates.push(sorted[i].pages / days);
  }
  if (rates.length < 3) return null;
  rates.sort((a, b) => a - b);
  return rates[Math.floor(rates.length / 2)]; // median, robust to outlier binges
}

export function computeAllMetrics(library) {
  const { read, toRead, dnf, currentlyReading } = library;
  return {
    commitment: commitmentRatio({ read, dnf, currentlyReading }),
    temporalWhiplash: temporalWhiplash(read),
    devotedFan: devotedFan(read),
    formatLoyalist: formatLoyalist(read),
    earlyAdopter: earlyAdopterProfile(read),
    pace: readingPaceProfile(read),
    gradeCurve: gradeCurve(read),
    seriesCommitment: seriesCommitment(read),
    documentarian: documentarian(read),
    diet: literaryDiet(read),
    graveyard: toReadGraveyard(toRead),
    topRated: topRated(read, 5),
    pageRatingRoi: pageRatingRoi(read),
    seasonalVelocity: seasonalVelocity(read),
    biggestTimeJump: biggestTimeJump(read),
    totalPages: totalPagesRead(read),
  };
}
