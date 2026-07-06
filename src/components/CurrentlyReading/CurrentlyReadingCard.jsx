import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { coverUrlForBook } from '../../lib/bookMetadata';
import { daysOnShelfLabel } from '../../lib/currentlyReading';

export default function CurrentlyReadingCard({ book }) {
  // Not every Goodreads entry has an ISBN — Kindle editions especially
  // often don't — so this needs the same graceful placeholder fallback
  // used everywhere else covers are shown in this app, not an assumption
  // that a cover URL always resolves to something real.
  const [coverFailed, setCoverFailed] = useState(false);
  const coverUrl = coverUrlForBook(book, 'L');
  const showCover = coverUrl && !coverFailed;
  const shelfLabel = daysOnShelfLabel(book.dateAdded);

  return (
    <div className="shrink-0 w-64 sm:w-72 catalog-card p-4 flex gap-4 snap-start">
      <div className="w-20 h-28 shrink-0 rounded-sm bg-line overflow-hidden flex items-center justify-center">
        {showCover ? (
          <img
            src={coverUrl}
            alt=""
            loading="lazy"
            onError={() => setCoverFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <BookOpen className="w-6 h-6 text-ink/25" />
        )}
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <p className="ledger-label mb-1">Currently reading</p>
        <h3 className="font-display text-base font-semibold leading-snug truncate">{book.title}</h3>
        <p className="text-sm text-ink/60 truncate mb-2">{book.author}</p>
        {shelfLabel && <p className="text-xs text-ink/45">{shelfLabel}</p>}
      </div>
    </div>
  );
}
