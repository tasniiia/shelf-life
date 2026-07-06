import { useMemo, useState } from 'react';
import { ExternalLink, BookOpen, Clock, ShoppingCart, Library } from 'lucide-react';
import Card from '../ui/Card';
import { coverUrlForBook } from '../../lib/bookMetadata';
import { amazonSearchUrl, worldCatUrl, isAffiliateConfigured } from '../../lib/affiliateLinks';

export default function MatchCard({ match, rank }) {
  // Try Open Library's ISBN-guess cover first, then fall back to Google
  // Books' thumbnail (already fetched alongside genre data during Deep
  // Match, so this costs nothing extra) — Open Library's cover coverage is
  // patchy even when it has full catalog data for a book, so this fallback
  // meaningfully improves how often a real cover actually shows up.
  const sources = useMemo(
    () => [coverUrlForBook(match), match.coverUrl].filter(Boolean),
    [match]
  );
  const [sourceIdx, setSourceIdx] = useState(0);
  const currentSrc = sources[sourceIdx];

  return (
    <Card className="relative">
      <div className="flex items-start gap-3 mb-3">
        {/* Cover art loads asynchronously and never blocks the card from
            rendering — falls back to a plain placeholder once every
            available source has failed. */}
        <div className="w-14 h-20 shrink-0 rounded-sm bg-line overflow-hidden flex items-center justify-center">
          {currentSrc ? (
            <img
              src={currentSrc}
              alt=""
              loading="lazy"
              onError={() => setSourceIdx((i) => i + 1)}
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen className="w-5 h-5 text-ink/25" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="ledger-label mb-1">Match No. {String(rank).padStart(2, '0')}</p>
              <h3 className="font-display text-lg font-semibold leading-snug">{match.title}</h3>
              <p className="text-sm text-ink/60">{match.author}</p>
            </div>
            <a
              href={match.goodreadsUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 flex items-center gap-1.5 text-xs font-medium border border-ink/30 rounded-full px-3 py-1.5 hover:border-stamp hover:text-stamp transition-colors"
            >
              Goodreads <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {(match.pages || match.estimatedDays) && (
            <div className="flex items-center gap-3 mt-2 text-xs text-ink/50">
              {match.pages && <span>{match.pages} pages</span>}
              {match.estimatedDays && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> ~{match.estimatedDays}-day commitment at your pace
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="hairline pt-3 text-sm text-ink/80 leading-relaxed">{match.why}</p>

      <div className="hairline pt-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {match.buyInfo && (
            <a
              href={match.buyInfo.buyLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium bg-ink text-paper rounded-full px-3 py-1.5 hover:bg-stamp transition-colors"
            >
              <ShoppingCart className="w-3 h-3" />
              {match.buyInfo.price != null
                ? `${match.buyInfo.currency === 'USD' ? '$' : ''}${match.buyInfo.price} on Google Play`
                : 'Buy on Google Play'}
            </a>
          )}
          <a
            href={amazonSearchUrl(match)}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-ink/50 hover:text-ink underline underline-offset-2"
          >
            Amazon
          </a>
          <a
            href={worldCatUrl(match)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-ink/50 hover:text-ink underline underline-offset-2"
          >
            <Library className="w-3 h-3" /> Find at a library
          </a>
        </div>
      </div>
      {isAffiliateConfigured() && (
        <p className="text-[10px] text-ink/35 mt-2 leading-relaxed">
          Amazon purchases made via this link may earn ShelfLife a commission at zero extra cost to you.
        </p>
      )}
    </Card>
  );
}
