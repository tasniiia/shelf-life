import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { coverUrlForBook, getBookMetadata } from '../../lib/bookMetadata';
import { daysOnShelfLabel } from '../../lib/currentlyReading';

export default function CurrentlyReadingCard({ book }) {
  // Not every Goodreads entry has an ISBN — Kindle editions especially
  // often don't — so this needs the same graceful placeholder fallback
  // used everywhere else covers are shown in this app, not an assumption
  // that a cover URL always resolves to something real.
  const [coverFailed, setCoverFailed] = useState(false);
  const [fallbackCover, setFallbackCover] = useState(null);
  const isbnCoverUrl = coverUrlForBook(book, 'L');

  // This widget doesn't go through the Deep Match pipeline the way What's
  // Next candidates do, so it never gets Google Books/Open Library's
  // title-matched cover fallback unless it's fetched here directly. Only
  // bothers with the lookup when the direct ISBN guess isn't available or
  // fails to load — most currently-reading shelves are a handful of books
  // at most, so this is a trivial number of requests, and getBookMetadata
  // already caches results persistently across sessions.
  useEffect(() => {
    if (isbnCoverUrl && !coverFailed) return;
    let cancelled = false;
    getBookMetadata(book).then((meta) => {
      if (!cancelled && meta?.coverUrl) setFallbackCover(meta.coverUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [book, isbnCoverUrl, coverFailed]);

  const coverUrl = coverFailed || !isbnCoverUrl ? fallbackCover : isbnCoverUrl;
  const shelfLabel = daysOnShelfLabel(book.dateAdded);

  return (
    <div className="w-full sm:w-96 shrink-0 catalog-card p-5 flex gap-5 snap-start">
      <div className="w-24 h-36 shrink-0 rounded-sm bg-line overflow-hidden flex items-center justify-center">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            loading="lazy"
            onError={() => setCoverFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <BookOpen className="w-7 h-7 text-ink/25" />
        )}
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <h3 className="font-display text-lg font-semibold leading-snug mb-1">{book.title}</h3>
        <p className="text-sm text-ink/60 truncate mb-2">{book.author}</p>
        {shelfLabel && <p className="text-xs text-ink/45">{shelfLabel}</p>}
      </div>
    </div>
  );
}
