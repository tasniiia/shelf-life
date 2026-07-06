import { X } from 'lucide-react';
import FlipCard from './FlipCard';

export default function ShelfAwarenessGrid({ slides, onClose, isProUnlocked, onRequestUnlock }) {
  const heroStats = slides.find((s) => s.id === 'intro')?.heroStats;

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
          {slides.map((slide, i) => (
            <FlipCard
              key={slide.id}
              slide={slide}
              index={i}
              isProUnlocked={isProUnlocked}
              onRequestUnlock={onRequestUnlock}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
