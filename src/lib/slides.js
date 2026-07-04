// Turns raw metrics (from metrics.js) into an ordered list of
// slide descriptors that <Slide /> knows how to render. Keeping this as
// data (rather than one component per metric) keeps the story deck easy
// to reorder or extend.

/**
 * A handful of "hero" numbers meant to be scannable in a couple of seconds,
 * before diving into the full set of detailed insight cards below them.
 */
export function buildHeroStats(metrics, library) {
  const stats = [];
  stats.push({ label: 'Books Read', value: String(library.read.length) });
  if (metrics.totalPages) {
    stats.push({ label: 'Pages Read', value: metrics.totalPages.toLocaleString() });
  }
  if (metrics.gradeCurve) {
    stats.push({ label: 'Avg Rating', value: `${metrics.gradeCurve.avg.toFixed(2)}\u2605` });
  }
  if (metrics.commitment?.finishRate != null) {
    stats.push({ label: 'Finish Rate', value: `${Math.round(metrics.commitment.finishRate * 100)}%` });
  }
  if (metrics.devotedFan) {
    stats.push({ label: 'Top Author', value: metrics.devotedFan.author });
  }
  return stats;
}

export function buildSlides({ metrics, library, year = 'all' }) {
  const slides = [];
  const scopeLabel = year === 'all' ? '' : ` in ${year}`;
  const heroStats = buildHeroStats(metrics, library);

  slides.push({
    id: 'intro',
    kind: 'intro',
    eyebrow: year === 'all' ? 'Shelf Awareness' : `Shelf Awareness · ${year}`,
    headline: `${library.read.length} books read${scopeLabel}.`,
    body:
      year === 'all'
        ? "Here's what your shelf says about you."
        : `Here's what your ${year} reading says about you.`,
    heroStats,
  });

  if (metrics.commitment) {
    const { finished, abandoned, stalled, finishRate, verdict } = metrics.commitment;
    slides.push({
      id: 'commitment',
      kind: 'donut',
      eyebrow: 'Reading commitment',
      headline: verdict,
      donut: {
        segments: [
          { label: 'Finished', value: finished, color: 'ledger' },
          { label: 'Abandoned', value: abandoned, color: 'stamp' },
          { label: 'In progress', value: stalled, color: 'gold' },
        ].filter((s) => s.value > 0),
        centerLabel: finishRate != null ? `${Math.round(finishRate * 100)}%` : '—',
      },
      body: `${finished} finished vs. ${abandoned} abandoned. ${
        verdict === 'The Commitment-Phobe'
          ? "You keep options open — a lot of first dates with books that didn't make it to the end."
          : 'When you start a book, you see it through.'
      }`,
    });
  }

  if (metrics.temporalWhiplash) {
    const { min, max, spread, decades } = metrics.temporalWhiplash;
    slides.push({
      id: 'whiplash',
      kind: 'histogram',
      eyebrow: 'Temporal whiplash',
      headline: `${spread}-year spread`,
      histogram: decades,
      histogramColor: 'gold',
      statLabel: `${min}–${max} publication range`,
      body: `Your reading jumps between eras — from ${min} to ${max} — without much regard for chronology.`,
    });
  }

  if (metrics.biggestTimeJump) {
    const { gap, from, to } = metrics.biggestTimeJump;
    slides.push({
      id: 'timeJump',
      kind: 'timeline',
      eyebrow: 'The time jump',
      headline: `${gap}-year leap`,
      timeline: {
        fromTitle: from.title,
        fromYear: from.originalPublicationYear,
        toTitle: to.title,
        toYear: to.originalPublicationYear,
      },
      body: `Right after finishing "${from.title}" (${from.originalPublicationYear}), you picked up "${to.title}" (${to.originalPublicationYear}) — a ${gap}-year jump back-to-back.`,
    });
  }

  if (metrics.seriesCommitment) {
    const { inSeries, standalone, pct, verdict } = metrics.seriesCommitment;
    slides.push({
      id: 'seriesCommitment',
      kind: 'donut',
      eyebrow: 'Series commitment',
      headline: verdict,
      donut: {
        segments: [
          { label: 'Series', value: inSeries, color: 'stamp' },
          { label: 'Standalone', value: standalone, color: 'ledger' },
        ],
        centerLabel: `${pct}%`,
      },
      body:
        verdict === 'The Series Binger'
          ? "Once you're in, you're in — you keep showing up for the next installment."
          : verdict === 'The Standalone Purist'
          ? 'You like a story that starts and ends in one book. No cliffhangers, no waiting a year for book two.'
          : "You'll follow a series if it's good, but you're just as happy with a one-and-done.",
    });
  }

  if (metrics.devotedFan) {
    const { author, count, topAuthors } = metrics.devotedFan;
    slides.push({
      id: 'devotedFan',
      kind: 'rankedBars',
      eyebrow: 'The devoted fan',
      headline: author,
      stat: String(count),
      statLabel: 'books read',
      rankedBars: topAuthors,
      body: `Nobody else on your shelf gets this much of your time. ${author} has your loyalty.`,
    });
  }

  if (metrics.formatLoyalist) {
    const { entries, verdict } = metrics.formatLoyalist;
    slides.push({
      id: 'formatLoyalist',
      kind: 'donut',
      eyebrow: 'The format loyalist',
      headline: verdict,
      donut: {
        segments: entries.map((e, i) => ({
          label: e.label,
          value: e.count,
          color: ['stamp', 'ledger', 'gold', 'ink'][i % 4],
        })),
        centerLabel: `${entries[0].pct}%`,
      },
      body:
        verdict === 'The Format Omnivore'
          ? "You don't discriminate by format — print, digital, audio, whatever gets the story into your head."
          : `${entries[0].pct}% of what you read comes in one format. You know what works for you.`,
    });
  }

  if (metrics.earlyAdopter) {
    const { avgGap, verdict, buckets } = metrics.earlyAdopter;
    slides.push({
      id: 'earlyAdopter',
      kind: 'histogram',
      eyebrow: 'Early adopter or archive digger',
      headline: verdict,
      histogram: buckets,
      histogramColor: 'stamp',
      statLabel: `${avgGap}y avg. after publication`,
      body:
        verdict === 'The Early Adopter'
          ? "You read things close to when they come out — buzz reaches you fast, and you're already on it."
          : verdict === 'The Archive Digger'
          ? 'You dig into the backlist — decades-old books are just as fair game as this year\u2019s releases.'
          : 'You mix new releases with older reads, no strong pull either way.',
    });
  }

  if (metrics.pace) {
    const { avgGapDays, verdict, buckets } = metrics.pace;
    slides.push({
      id: 'pace',
      kind: 'histogram',
      eyebrow: 'Reading rhythm',
      headline: verdict,
      histogram: buckets,
      histogramColor: 'ledger',
      statLabel: `${avgGapDays}d avg. shelf-to-finish`,
      body:
        verdict === 'The Weekend Warrior'
          ? 'Your reading comes in bursts — long stretches, then a book devoured in a weekend.'
          : 'You read at a steady, predictable clip, book after book.',
    });
  }

  if (metrics.seasonalVelocity) {
    const { buckets, peakMonth, peakPages, troughMonth, persona } = metrics.seasonalVelocity;
    slides.push({
      id: 'seasonalVelocity',
      kind: 'histogram',
      eyebrow: 'Seasonal velocity',
      headline: persona,
      histogram: buckets,
      histogramColor: 'gold',
      statLabel: `peak: ${peakMonth} (${peakPages.toLocaleString()}pg)`,
      body:
        persona === 'The Winter Hibernator'
          ? `You read the most in ${peakMonth} and the least in ${troughMonth} — cold weather means more pages.`
          : persona === 'The Summer Sprinter'
          ? `You read the most in ${peakMonth} and the least in ${troughMonth} — summer is your reading season.`
          : `Your reading pace holds fairly steady year-round, peaking slightly in ${peakMonth}.`,
    });
  }

  if (metrics.gradeCurve) {
    const { avg, pctFiveStar, verdict, counts } = metrics.gradeCurve;
    slides.push({
      id: 'gradeCurve',
      kind: 'histogram',
      eyebrow: 'The grade curve',
      headline: verdict,
      histogram: [1, 2, 3, 4, 5].map((star) => ({ label: `${star}\u2605`, count: counts[star] || 0 })),
      histogramColor: 'gold',
      statLabel: `${pctFiveStar}% five-star · ${avg.toFixed(2)} avg`,
      body:
        verdict === 'The Easy Grader'
          ? "Nearly half your ratings are 5 stars. You read for love, not for grading on a curve."
          : verdict === 'The Tough Critic'
          ? 'Five stars are rare from you — when you hand one out, it means something.'
          : 'Your ratings spread out evenly across the scale — a genuinely balanced reader.',
    });
  }

  if (metrics.pageRatingRoi) {
    const { entries, best } = metrics.pageRatingRoi;
    const microcopy = /Long/.test(best.label)
      ? `Slow burns are your sweet spot — your average rating for books over 450 pages is ${best.avg.toFixed(1)} stars.`
      : /Short/.test(best.label)
      ? `Quick reads are where you shine — your average rating for books under 250 pages is ${best.avg.toFixed(1)} stars.`
      : `Medium-length books are your comfort zone — averaging ${best.avg.toFixed(1)} stars.`;
    slides.push({
      id: 'pageRatingRoi',
      kind: 'rankedBars',
      eyebrow: 'The page-to-rating ROI',
      headline: 'Length vs. rating',
      stat: `${best.avg.toFixed(1)}\u2605`,
      statLabel: `best: ${best.label}`,
      rankedBars: entries.map((e) => ({
        label: e.label,
        count: `${e.avg.toFixed(1)}\u2605 (${e.count})`,
        pct: (e.avg / 5) * 100,
      })),
      body: microcopy,
    });
  }

  if (metrics.diet) {
    const { pct } = metrics.diet;
    slides.push({
      id: 'diet',
      kind: 'bars',
      eyebrow: 'Literary diet',
      headline: 'Your page-count breakdown',
      bars: [
        { label: 'Snacks (<250pg)', pct: pct.snacks },
        { label: 'Meals (250–450pg)', pct: pct.meals },
        { label: 'Food comas (450pg+)', pct: pct.foodComas },
      ],
      body: `${pct.snacks}% snacks, ${pct.meals}% meals, ${pct.foodComas}% food comas.`,
    });
  }

  if (metrics.documentarian) {
    const { reviewed, notReviewed, pct, verdict } = metrics.documentarian;
    slides.push({
      id: 'documentarian',
      kind: 'donut',
      eyebrow: 'The documentarian',
      headline: verdict,
      donut: {
        segments: [
          { label: 'Reviewed', value: reviewed, color: 'stamp' },
          { label: 'No review', value: notReviewed, color: 'line' },
        ],
        centerLabel: `${pct}%`,
      },
      body:
        verdict === 'The Documentarian'
          ? 'You leave a trail — thoughts jotted down while the book is still fresh.'
          : verdict === 'The Silent Reader'
          ? 'You read and move on, no written record needed. The book was the point, not the paper trail.'
          : 'You write a review here and there — usually for the ones that really land.',
    });
  }

  if (metrics.graveyard) {
    const { book, yearsWaiting } = metrics.graveyard;
    slides.push({
      id: 'graveyard',
      kind: 'book',
      eyebrow: 'To-read graveyard',
      headline: book.title,
      body: `Added ${yearsWaiting} year${yearsWaiting === 1 ? '' : 's'} ago and still waiting. It's not going anywhere — but neither, apparently, are you.`,
      author: book.author,
    });
  }

  slides.push({
    id: 'outro',
    kind: 'intro',
    eyebrow: year === 'all' ? 'Shelf Awareness' : `Shelf Awareness · ${year}`,
    headline: year === 'all' ? 'That\u2019s your shelf.' : `That\u2019s your ${year}.`,
    body: 'Screenshot your favorite slide and pass it on.',
  });

  return slides;
}
