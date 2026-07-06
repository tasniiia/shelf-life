// Logic for the Currently Reading hero widget, kept separate from the
// component so it's unit-testable without React.

/**
 * Newest addition first, per spec. Books without a Date Added (rare, but
 * possible on a messy export) sort to the end rather than crashing or
 * floating to the top on a null comparison.
 */
export function sortByDateAddedDescending(books) {
  return [...books].sort((a, b) => {
    if (!a.dateAdded && !b.dateAdded) return 0;
    if (!a.dateAdded) return 1;
    if (!b.dateAdded) return -1;
    return b.dateAdded.getTime() - a.dateAdded.getTime();
  });
}

/**
 * Goodreads' CSV has no "date moved to currently-reading" field — Date
 * Added is when the book first entered your account on *any* shelf, which
 * could be long before you actually started reading it. This is the best
 * available proxy, but the label says "on your shelf for," not "started,"
 * to stay honest about what's actually being measured rather than imply
 * a start date the data can't support.
 */
export function daysOnShelfLabel(dateAdded) {
  if (!dateAdded) return null;

  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const rawDays = Math.floor((now.getTime() - dateAdded.getTime()) / msPerDay);
  const days = Math.max(0, rawDays); // clamp — a future Date Added is a data anomaly, not a negative day count

  if (days === 0) return 'Added today';
  if (days === 1) return 'On your shelf for 1 day';
  return `On your shelf for ${days} days`;
}
