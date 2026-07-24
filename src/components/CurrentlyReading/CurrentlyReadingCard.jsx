import { useEffect, useRef, useState } from 'react';
import { BookOpen, ExternalLink, Clock, CheckCircle2 } from 'lucide-react';
import { coverUrlForBook, getBookMetadata } from '../../lib/bookMetadata';
import { daysOnShelfLabel } from '../../lib/currentlyReading';
import { goodreadsUrl } from '../../lib/metadataMatcher';
import { percentToPage, estimateDaysRemaining } from '../../lib/readingProgress';

export default function CurrentlyReadingCard({ book, readingVelocity, peek, progress, onProgressChange, onMarkFinished }) {
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

  // Live slider value, separate from the persisted `progress` prop, so
  // dragging feels instant rather than waiting on a round-trip to
  // IndexedDB on every tick. Falls back to 0 if nothing's been entered
  // yet — the slider itself always needs *some* numeric position, even
  // though the time estimate below treats "never set" differently from
  // "explicitly set to 0%" (see the null-check in estimateDaysRemaining).
  const [sliderValue, setSliderValue] = useState(progress ?? 0);
  useEffect(() => setSliderValue(progress ?? 0), [progress]);

  const saveTimeout = useRef(null);
  function handleSliderChange(pct) {
    setSliderValue(pct);
    clearTimeout(saveTimeout.current);
    // Debounced rather than saving on every drag tick — keyboard arrow
    // presses and pointer drags can both fire many onChange events per
    // second, and there's no need to hit IndexedDB that often for a value
    // that's just going to keep changing for the next moment anyway.
    saveTimeout.current = setTimeout(() => onProgressChange(pct), 400);
  }

  const hasProgress = progress != null;
  const remainingDays = hasProgress ? estimateDaysRemaining(book, progress, readingVelocity) : null;
  const wholeBookDays =
    readingVelocity && book.pages ? Math.max(1, Math.ceil(book.pages / readingVelocity)) : null;
  const pageEquivalent = book.pages ? percentToPage(sliderValue, book.pages) : null;

  return (
    <div
      className={`shrink-0 catalog-card p-5 flex gap-5 snap-start ${peek ? 'w-[88%] sm:w-96' : 'w-full sm:w-96'}`}
    >
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
        {shelfLabel && <p className="text-xs text-ink/45 mb-2">{shelfLabel}</p>}

        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-ink/50 mb-1">
            <span>
              {sliderValue}% done{pageEquivalent ? ` \u00b7 page ${pageEquivalent} of ${book.pages}` : ''}
            </span>
          </div>
          <div className="relative h-6 flex items-center">
            {/* Visual track + fill, sitting behind the (now invisible) native
                input — this is what's actually seen; the range input itself
                still handles all drag/keyboard interaction, its thumb just
                has no visible fill/border of its own anymore. */}
            <div className="absolute inset-x-0 h-2 bg-line rounded-full overflow-hidden pointer-events-none">
              <div className="h-full bg-stamp/30 rounded-full transition-all" style={{ width: `${sliderValue}%` }} />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="relative w-full appearance-none bg-transparent cursor-pointer
                [&::-webkit-slider-runnable-track]:bg-transparent
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                [&::-webkit-slider-thumb]:bg-transparent [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:shadow-none
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-track]:bg-transparent
                [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6
                [&::-moz-range-thumb]:bg-transparent [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-none
                [&::-moz-range-thumb]:cursor-pointer"
              aria-label={`Reading progress for ${book.title}`}
            />
            {/* The emoji rides exactly where the (now invisible) native thumb
                sits, using the same percentage math — this is the visible
                "thumb" now. */}
            <span
              className="absolute text-xl leading-none pointer-events-none transition-all"
              style={{ left: `calc(${sliderValue}% - 11px)` }}
              aria-hidden="true"
            >
              📖
            </span>
          </div>
        </div>

        {(remainingDays != null || wholeBookDays) && (
          <p className="flex items-center gap-1 text-xs text-ink/45 mb-2">
            <Clock className="w-3 h-3" />
            {remainingDays != null
              ? `~${remainingDays === 0 ? 'less than a' : remainingDays}-day${remainingDays === 1 ? '' : 's'} left at your pace`
              : `~${wholeBookDays}-day read at your pace`}
          </p>
        )}

        <div className="flex items-center gap-3">
          <a
            href={goodreadsUrl(book)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-stamp hover:underline w-fit"
          >
            Goodreads <ExternalLink className="w-3 h-3" />
          </a>
          {onMarkFinished && (
            <button
              onClick={onMarkFinished}
              className="flex items-center gap-1 text-xs font-medium text-ledger hover:underline w-fit"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Finished
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
