import { useState } from 'react';
import { RotateCw, Lock, BookOpen } from 'lucide-react';
import Stamp from '../ui/Stamp';
import { Donut, Histogram, RankedBars } from '../ui/charts';
import LockedTeaser from './LockedTeaser';

export default function FlipCard({ slide, index, isProUnlocked, onRequestUnlock }) {
  const [flipped, setFlipped] = useState(false);
  const cardNumber = String(index + 1).padStart(3, '0');
  const isLocked = slide.locked && !isProUnlocked;

  // Locked cards no longer tease-then-flip — the point of blurring instead
  // of a plain "flip to find out" was to make the gate visible immediately,
  // on both what would've been the front and the back, without requiring
  // an interaction to discover it's locked at all.
  if (isLocked) {
    return (
      <div className="relative aspect-[3/4] catalog-card p-4 flex flex-col overflow-hidden">
        <div className="flex items-start justify-between mb-3">
          <p className="ledger-label leading-tight pr-2">{slide.eyebrow}</p>
          <Lock className="w-3.5 h-3.5 text-ink/30 shrink-0" />
        </div>
        <div className="flex-1 relative">
          <LockedTeaser slide={slide} onUnlock={onRequestUnlock} compact />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative aspect-[3/4] [perspective:1400px] cursor-pointer group"
      onClick={() => setFlipped((f) => !f)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
      aria-label={`${slide.eyebrow} card — tap to flip`}
    >
      <div
        className="relative w-full h-full transition-transform duration-500 ease-out [transform-style:preserve-3d]"
        style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* FRONT */}
        <div className="absolute inset-0 [backface-visibility:hidden] catalog-card p-4 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <p className="ledger-label leading-tight pr-2">{slide.eyebrow}</p>
            <span className="font-mono text-[10px] text-ink/30 shrink-0">No. {cardNumber}</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {slide.kind === 'donut' ? (
              <div className="mb-2 scale-90 origin-left">
                <Donut segments={slide.donut.segments} centerLabel={slide.donut.centerLabel} size={72} strokeWidth={11} />
              </div>
            ) : slide.kind === 'histogram' ? (
              <div className="mb-2">
                <Histogram buckets={slide.histogram} color={slide.histogramColor} height={40} />
              </div>
            ) : slide.kind === 'timeline' ? (
              <p className="font-mono text-sm text-stamp mb-2">
                {slide.timeline.fromYear} {'\u2192'} {slide.timeline.toYear}
              </p>
            ) : slide.stat ? (
              <>
                <p className="font-mono text-3xl font-medium text-stamp leading-none mb-1">{slide.stat}</p>
                {slide.statLabel && <p className="ledger-label mb-2">{slide.statLabel}</p>}
              </>
            ) : slide.kind === 'book' ? (
              <div className="flex flex-col items-center text-center py-4">
                <BookOpen className="w-8 h-8 text-ink/20 mb-3" />
                <h3 className="font-display text-lg font-semibold leading-snug">The Longest Wait</h3>
                <p className="text-xs text-ink/50 mt-1">Flip to find out which book.</p>
              </div>
            ) : slide.kind === 'pageBars' ? (
              <div className="mb-2 space-y-2">
                {slide.pageBars.map((b, i) => (
                  <div key={i} className="h-2.5 bg-line rounded-full overflow-hidden">
                    <div className="h-full bg-stamp rounded-full" style={{ width: `${b.pct}%` }} />
                  </div>
                ))}
              </div>
            ) : null}
            {slide.kind !== 'book' && slide.id !== 'devotedFan' && (
              <>
                <h3 className="font-display text-lg font-semibold leading-snug">{slide.headline}</h3>
                {slide.author && <p className="text-xs text-ink/50 mt-1">{slide.author}</p>}
              </>
            )}
            {slide.id === 'devotedFan' && (
              <p className="text-xs text-ink/50 mt-1">Flip to find out who.</p>
            )}
          </div>

          <div className="hairline pt-2 flex items-center justify-between">
            <span className="font-display text-xs italic text-ink/30">ShelfLife</span>
            <RotateCw className="w-3.5 h-3.5 text-ink/25 group-hover:text-stamp transition-colors" />
          </div>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 [backface-visibility:hidden] catalog-card p-4 flex flex-col"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <div className="flex items-start justify-between mb-3">
            <p className="ledger-label leading-tight pr-2">{slide.eyebrow}</p>
            <Stamp size="sm">{cardNumber}</Stamp>
          </div>

          <div className="flex-1 flex flex-col justify-center overflow-hidden">
            {slide.kind === 'bars' && (
              <div className="space-y-2.5 mb-3">
                {slide.bars.map((bar) => (
                  <div key={bar.label}>
                    <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-ink/50 mb-1">
                      <span className="truncate pr-2">{bar.label}</span>
                      <span>{bar.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-line rounded-full overflow-hidden">
                      <div className="h-full bg-stamp rounded-full" style={{ width: `${bar.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {slide.kind === 'rankedBars' && (
              <div className="mb-3">
                <RankedBars items={slide.rankedBars} />
              </div>
            )}
            {slide.kind === 'histogram' && (
              <div className="mb-3">
                <Histogram buckets={slide.histogram} color={slide.histogramColor} height={56} />
              </div>
            )}
            {slide.kind === 'timeline' && (
              <div className="space-y-1.5 mb-3">
                <div className="border border-line rounded-sm p-2 bg-paper">
                  <p className="font-mono text-[10px] text-ink/40">{slide.timeline.fromYear}</p>
                  <p className="font-display text-sm font-semibold leading-snug truncate">{slide.timeline.fromTitle}</p>
                </div>
                <div className="text-center text-stamp text-sm leading-none">{'\u2193'}</div>
                <div className="border border-line rounded-sm p-2 bg-paper">
                  <p className="font-mono text-[10px] text-ink/40">{slide.timeline.toYear}</p>
                  <p className="font-display text-sm font-semibold leading-snug truncate">{slide.timeline.toTitle}</p>
                </div>
              </div>
            )}
            {slide.kind === 'pageBars' && (
              <div className="space-y-3 mb-3">
                {slide.pageBars.map((b, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-baseline mb-1 gap-2">
                      <span className="font-display text-sm font-semibold truncate">{b.title}</span>
                      <span className="font-mono text-xs text-stamp shrink-0">{b.pages}pg</span>
                    </div>
                    <div className="h-2.5 bg-line rounded-full overflow-hidden">
                      <div className="h-full bg-stamp rounded-full" style={{ width: `${b.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {slide.kind === 'bookList' && (
              <div className="space-y-1.5 mb-3">
                {slide.bookList.map((b, i) => (
                  <div key={i} className="border border-line rounded-sm p-2 bg-paper flex items-baseline justify-between gap-2">
                    <p className="font-display text-sm font-semibold leading-snug truncate">{b.title}</p>
                    <span className="font-mono text-[10px] text-stamp shrink-0">{b.sublabel}</span>
                  </div>
                ))}
              </div>
            )}
            {slide.kind === 'book' && (
              <div className="mb-3">
                <p className="font-display text-lg font-semibold leading-snug">{slide.headline}</p>
                {slide.author && <p className="text-xs text-ink/50 mt-1">{slide.author}</p>}
              </div>
            )}
            <p className="text-sm text-ink/80 leading-relaxed">{slide.body}</p>
          </div>

          <div className="hairline pt-2 flex items-center justify-center">
            <RotateCw className="w-3.5 h-3.5 text-ink/25" />
          </div>
        </div>
      </div>
    </div>
  );
}
