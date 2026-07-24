import { useEffect, useMemo, useState } from 'react';
import CurrentlyReadingCard from './CurrentlyReadingCard';
import { sortByDateAddedDescending } from '../../lib/currentlyReading';
import { computeReadingVelocity } from '../../lib/metrics';
import { bookProgressKey } from '../../lib/readingProgress';
import { getAllProgress, setProgress } from '../../lib/progressDb';

export default function CurrentlyReadingHero({ library, onMarkFinished }) {
  const books = useMemo(
    () => sortByDateAddedDescending(library.currentlyReading || []),
    [library.currentlyReading]
  );
  const readingVelocity = useMemo(() => computeReadingVelocity(library.read), [library.read]);

  // Loaded once for the whole widget rather than per-card, so a handful
  // of currently-reading books don't each independently hit IndexedDB.
  const [progressByKey, setProgressByKey] = useState({});
  useEffect(() => {
    let cancelled = false;
    getAllProgress()
      .then((entries) => {
        if (cancelled) return;
        const map = {};
        entries.forEach((e) => {
          map[e.bookKey] = e.pct;
        });
        setProgressByKey(map);
      })
      .catch((err) => {
        console.warn('[ShelfLife] Could not load reading progress:', err.message || err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleProgressChange(book, pct) {
    const bookKey = bookProgressKey(book);
    setProgressByKey((prev) => ({ ...prev, [bookKey]: pct }));
    setProgress({ bookKey, pct, updatedAt: new Date().toISOString() }).catch((err) => {
      console.warn('[ShelfLife] Could not save reading progress:', err.message || err);
    });
  }

  function handleMarkFinished(book) {
    if (
      !window.confirm(
        `Mark "${book.title}" as finished? It'll move to your read shelf here in ShelfLife — this doesn't update Goodreads itself.`
      )
    ) {
      return;
    }
    onMarkFinished(book);
  }

  if (books.length === 0) return null;

  const hasMultiple = books.length > 1;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-10 sm:pt-14">
      <p className="ledger-label mb-2">Currently Reading</p>
      <h2 className="font-display text-2xl font-semibold tracking-tight mb-5">
        Pick up where you left off.
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {books.map((book) => {
          const bookKey = bookProgressKey(book);
          return (
            <CurrentlyReadingCard
              key={bookKey}
              book={book}
              readingVelocity={readingVelocity}
              peek={hasMultiple}
              progress={progressByKey[bookKey]}
              onProgressChange={(pct) => handleProgressChange(book, pct)}
              onMarkFinished={() => handleMarkFinished(book)}
            />
          );
        })}
      </div>
    </div>
  );
}
