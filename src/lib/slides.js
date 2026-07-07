// Turns raw metrics (from metrics.js) into an ordered list of
// slide descriptors that <Slide /> knows how to render. Keeping this as
// data (rather than one component per metric) keeps the story deck easy
// to reorder or extend.

/**
 * Joins a list of names naturally for prose — "A", "A & B", or
 * "A, B & C" — used for acknowledging ties rather than silently picking
 * one name to feature.
 */
function joinNames(names) {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

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
  return stats;
}

export function buildSlides({ metrics, library, year = 'all' }) {
  const slides = [];
  const heroStats = buildHeroStats(metrics, library);

  slides.push({
    id: 'intro',
    kind: 'intro',
    eyebrow: year === 'all' ? 'Shelf Awareness' : `Shelf Awareness · ${year}`,
    headline: 'Your reading life, decoded.',
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

  if (metrics.pageExtremes) {
    const { shortest, longest, ratio } = metrics.pageExtremes;
    slides.push({
      id: 'bookends',
      kind: 'pageBars',
      eyebrow: 'The Bookends',
      headline: `${ratio}x the length`,
      pageBars: [
        {
          title: shortest.title,
          author: shortest.author,
          pages: shortest.pages,
          // Always keep a minimum sliver visible even at a huge ratio, so
          // the shorter bar never disappears entirely.
          pct: Math.max(6, Math.round((100 * shortest.pages) / longest.pages)),
        },
        { title: longest.title, author: longest.author, pages: longest.pages, pct: 100 },
      ],
      body: `"${shortest.title}" was a quick one at ${shortest.pages} pages. "${longest.title}" took ${ratio}x as long to get through at ${longest.pages} pages — same reader, wildly different commitments.`,
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
    const { author, count, topAuthors, isTie, tiedAuthors } = metrics.devotedFan;
    const headline = isTie ? `${tiedAuthors.length}-way tie` : author;
    const body = isTie
      ? `${joinNames(tiedAuthors)} are tied at ${count} books each — nobody's pulled ahead yet.`
      : `Nobody else on your shelf gets this much of your time. ${author} has your loyalty.`;
    slides.push({
      id: 'devotedFan',
      kind: 'rankedBars',
      eyebrow: 'The devoted fan',
      headline,
      stat: String(count),
      statLabel: 'books read',
      rankedBars: topAuthors,
      body,
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
      locked: true, // ShelfLife Pro bonus card
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
      locked: true, // ShelfLife Pro bonus card
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
      locked: true, // ShelfLife Pro bonus card
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
      locked: true, // ShelfLife Pro bonus card
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
    const dominant =
      pct.snacks >= pct.meals && pct.snacks >= pct.foodComas
        ? 'snacks'
        : pct.meals >= pct.foodComas
        ? 'meals'
        : 'foodComas';
    const dietComment = {
      snacks:
        "You're a grazer, not a glutton — quick bites are your comfort zone, and there's no shame in a light literary snack.",
      meals: "A balanced plate. Most of your reading sits in that satisfying, three-course kind of length.",
      foodComas:
        "You don't really do small portions. Once you commit to a book, you commit to the whole feast.",
    }[dominant];
    slides.push({
      id: 'diet',
      locked: true, // ShelfLife Pro bonus card
      kind: 'bars',
      eyebrow: 'Literary diet',
      headline: 'Your page-count breakdown',
      bars: [
        { label: 'Snacks (<250pg)', pct: pct.snacks },
        { label: 'Meals (250–450pg)', pct: pct.meals },
        { label: 'Food comas (450pg+)', pct: pct.foodComas },
      ],
      body: dietComment,
    });
  }

  if (metrics.documentarian) {
    const { reviewed, notReviewed, pct, verdict } = metrics.documentarian;
    slides.push({
      id: 'documentarian',
      locked: true, // ShelfLife Pro bonus card
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
      locked: true, // ShelfLife Pro bonus card
      kind: 'book',
      eyebrow: 'To-read graveyard',
      headline: book.title,
      body: `Added ${yearsWaiting} year${yearsWaiting === 1 ? '' : 's'} ago and still waiting. It's not going anywhere — but neither, apparently, are you.`,
      author: book.author,
    });
  }

  if (metrics.backlogClear) {
    const { totalBooks, years, days } = metrics.backlogClear;
    slides.push({
      id: 'backlogClear',
      locked: true, // ShelfLife Pro bonus card
      kind: 'stat',
      eyebrow: 'Backlog clear time',
      headline: `${totalBooks} books waiting`,
      stat: years >= 1 ? `${years}y` : `${days}d`,
      statLabel: 'at your current pace',
      body:
        years >= 3
          ? `At your reading speed, clearing your whole to-read shelf would take about ${years} years — assuming you never add another book, which, let's be honest.`
          : `At your reading speed, you could clear your entire to-read shelf in about ${years < 1 ? `${days} days` : `${years} years`}. Not bad.`,
    });
  }

  if (metrics.backlogAverageAge) {
    const { avgYears, avgDays, count, persona } = metrics.backlogAverageAge;
    slides.push({
      id: 'backlogAverageAge',
      locked: true, // ShelfLife Pro bonus card
      kind: 'stat',
      eyebrow: 'Backlog average age',
      headline: persona,
      stat: `${avgYears}y`,
      statLabel: `average age across ${count} to-read books`,
      body: `The average book on your to-read shelf has been waiting ${avgDays} days — about ${avgYears} years. ${
        persona === 'The Eternal Procrastinator'
          ? "It's not a race, but it might be time to actually start some of these."
          : persona === 'Fresh Off the Shelf'
          ? "You're adding books faster than they can age — a shelf in constant motion."
          : "A healthy middle ground between impulse and neglect."
      }`,
    });
  }

  if (metrics.backlogTrend) {
    const { addedLastYear, readLastYear, net, verdict } = metrics.backlogTrend;
    slides.push({
      id: 'backlogTrend',
      locked: true, // ShelfLife Pro bonus card
      kind: 'stat',
      eyebrow: 'Backlog trend',
      headline: verdict,
      stat: net > 0 ? `+${net}` : String(net),
      statLabel: `net books added \u2014 ${addedLastYear} added, ${readLastYear} read`,
      body:
        verdict === 'The Collector'
          ? "You're adding books faster than you're reading them — a healthy backlog, or a losing battle, depending on your outlook."
          : verdict === 'The Depleter'
          ? "You're clearing books faster than you're adding them — your to-read shelf is actually shrinking."
          : 'Your to-read shelf is holding roughly steady — what comes in is about what goes out.',
    });
  }

  slides.push({
    id: 'outro',
    kind: 'intro',
    eyebrow: year === 'all' ? 'Shelf Awareness' : `Shelf Awareness · ${year}`,
    headline: year === 'all' ? 'That\u2019s your shelf.' : `That\u2019s your ${year}.`,
    body: 'Screenshot your favorite slide and pass it on.',
  });

  // Notability score per card (0-1) — how far its number sits from a
  // "boring middle." This is NOT used to hide cards in the main story/grid
  // (every card always shows there) — it's purely so the shareable Shelf Awareness summary
  // card (see pickTopInsights below) can pick the 3-4 most surprising
  // facts to feature, without recomputing everything from scratch.
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const NOTABILITY_SCORERS = {
    commitment: () =>
      metrics.commitment?.finishRate != null ? clamp01(Math.abs(metrics.commitment.finishRate - 0.5) * 2) : 0.3,
    bookends: () => (metrics.pageExtremes ? clamp01(metrics.pageExtremes.ratio / 15) : 0),
    timeJump: () => (metrics.biggestTimeJump ? clamp01(0.5 + metrics.biggestTimeJump.gap / 100) : 0),
    seriesCommitment: () => (metrics.seriesCommitment ? clamp01(Math.abs(metrics.seriesCommitment.pct - 50) / 50) : 0),
    devotedFan: () => (metrics.devotedFan ? clamp01(metrics.devotedFan.count / 8) : 0),
    formatLoyalist: () =>
      metrics.formatLoyalist ? clamp01(Math.abs(metrics.formatLoyalist.entries[0].pct - 40) / 60) : 0,
    earlyAdopter: () => (metrics.earlyAdopter ? clamp01(Math.abs(metrics.earlyAdopter.avgGap - 4) / 16) : 0),
    pace: () => (metrics.pace ? clamp01((metrics.pace.variationCoefficient ?? 0.5) / 1.5) : 0),
    seasonalVelocity: () => (metrics.seasonalVelocity ? 0.5 : 0),
    gradeCurve: () => (metrics.gradeCurve ? clamp01(Math.abs(metrics.gradeCurve.pctFiveStar - 25) / 60) : 0),
    pageRatingRoi: () => (metrics.pageRatingRoi ? 0.55 : 0),
    diet: () =>
      metrics.diet
        ? clamp01((Math.max(metrics.diet.pct.snacks, metrics.diet.pct.meals, metrics.diet.pct.foodComas) - 40) / 55)
        : 0,
    documentarian: () => (metrics.documentarian ? clamp01(Math.abs(metrics.documentarian.pct - 30) / 70) : 0),
    graveyard: () => (metrics.graveyard ? clamp01(0.5 + metrics.graveyard.yearsWaiting / 10) : 0),
    backlogClear: () => (metrics.backlogClear ? clamp01(metrics.backlogClear.years / 10) : 0),
    backlogAverageAge: () => (metrics.backlogAverageAge ? clamp01(metrics.backlogAverageAge.avgYears / 3) : 0),
    backlogTrend: () => (metrics.backlogTrend ? clamp01(Math.abs(metrics.backlogTrend.net) / 30) : 0),
  };
  slides.forEach((s) => {
    if (s.id === 'intro' || s.id === 'outro') return;
    s.notability = NOTABILITY_SCORERS[s.id]?.() ?? 0;
  });

  return slides;
}

/**
 * Picks the `count` most notable content cards (excludes intro/outro) for
 * the shareable Shelf Awareness summary card — the highlight reel, not the full deck.
 */
export function pickTopInsights(slides, count = 4) {
  const content = slides.filter((s) => s.id !== 'intro' && s.id !== 'outro');
  return [...content].sort((a, b) => (b.notability ?? 0) - (a.notability ?? 0)).slice(0, count);
}

/**
 * Pro feature: lets someone choose exactly which cards surface in their
 * summary instead of relying on automatic notability-based selection.
 * Falls back to automatic selection if there's no custom selection, or if
 * every ID in it fails to resolve — which matters concretely, not just in
 * theory: if a metric is ever renamed or retired (TBR Declutter List
 * became Backlog Average Age, for instance), anyone who'd customized
 * their summary around the old card shouldn't end up with a broken or
 * empty one.
 */
export function resolveSummaryInsights(slides, customSelection, count = 3) {
  if (customSelection && customSelection.length) {
    const resolved = customSelection.map((id) => slides.find((s) => s.id === id)).filter(Boolean);
    if (resolved.length) return resolved;
  }
  return pickTopInsights(slides, count);
}
