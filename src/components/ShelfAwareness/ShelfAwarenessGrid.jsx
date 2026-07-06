import { X, Share2 } from 'lucide-react';
import FlipCard from './FlipCard';

export default function ShelfAwarenessGrid({ slides, onClose, isProUnlocked, onRequestUnlock, onOpenSummary }) {
  const heroStats = slides.find((s) => s.id === 'intro')?.heroStats;

  // The intro/outro cards work as narrative bookends on mobile's swipeable
  // story, but they're redundant here — the hero stats banner already
  // does the intro's "here's your overview" job above the grid, and a
  // grid you can already see all of at once doesn't need a sign-off card.
  // Renumbered cleanly from the filtered list rather than keeping each
  // card's original position, so cards don't display as e.g. "No. 002"
  // through "No. 018" with 1 and 19 mysteriously missing.
  const contentSlides = slides.filter((s) => s.id !== 'intro' && s.id !== 'outro');

  return (
    <div className="fixed inset-0 z-40 bg-ink overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="ledger-label text-paper/50 mb-2">Shelf Awareness</p>
            <h2 className="font-display text-3xl text-paper font-semibold tracking-tight">
              Tap a card to flip it.
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-paper/70 hover:text-paper transition-colors mt-1"
          >
            <X className="w-5 h-5" /> Close
          </button>
        </div>

        {heroStats && heroStats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
            {heroStats.map((s) => (
              <div key={s.label} className="catalog-card p-4">
                <p className="font-mono text-2xl font-medium text-stamp leading-none truncate">{s.value}</p>
                <p className="ledger-label mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {contentSlides.map((slide, i) => (
            <FlipCard
              key={slide.id}
              slide={slide}
              index={i}
              isProUnlocked={isProUnlocked}
              onRequestUnlock={onRequestUnlock}
            />
          ))}

          {/* Capstone tile — deliberately not a numbered insight card, just
              a clean conclusion to browsing the deck. Opens the exact same
              summary modal as the pre-generate screen's button; that
              button stays too, since it serves a genuinely different
              moment (a fast path to the summary for someone who hasn't
              browsed the deck at all), not a redundant duplicate of this. */}
          <button
            onClick={onOpenSummary}
            className="aspect-[3/4] catalog-card p-4 flex flex-col items-center justify-center text-center gap-3 border-2 border-dashed border-stamp/40 hover:border-stamp hover:bg-card/80 transition-colors"
          >
            <Share2 className="w-6 h-6 text-stamp" />
            <div>
              <p className="font-display text-base font-semibold leading-snug mb-1">See Your Summary</p>
              <p className="text-xs text-ink/50">Download and share your recap</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
