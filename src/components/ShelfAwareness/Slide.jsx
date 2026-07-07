import { forwardRef } from 'react';
import { Share2 } from 'lucide-react';
import Stamp from '../ui/Stamp';
import { Donut, Histogram, RankedBars } from '../ui/charts';
import LockedTeaser, { LockBadge } from './LockedTeaser';

const Slide = forwardRef(function Slide({ slide, index, total, isProUnlocked, onRequestUnlock, onOpenSummary }, ref) {
  const isLocked = slide.locked && !isProUnlocked;

  return (
    <div
      ref={ref}
      className="relative w-full h-full flex flex-col justify-between p-8 sm:p-10 bg-card bg-grain overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <p className="ledger-label">{slide.eyebrow}</p>
        {isLocked ? (
          <LockBadge className="w-4 h-4 text-ink/30" />
        ) : (
          <Stamp size="sm">{`${index + 1}/${total}`}</Stamp>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center py-8">
        {isLocked ? (
          <LockedTeaser slide={slide} onUnlock={onRequestUnlock} />
        ) : (
          <>
        {slide.kind === 'intro' && (
          <>
            <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-tight mb-4">
              {slide.headline}
            </h2>
            <p className="text-ink/70 text-lg leading-relaxed mb-6">{slide.body}</p>
            {slide.heroStats && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                {slide.heroStats.map((s) => (
                  <div key={s.label} className="catalog-card p-3">
                    <p className="font-mono text-xl font-medium text-stamp leading-none truncate">{s.value}</p>
                    <p className="ledger-label mt-1 text-[10px]">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
            {slide.id === 'outro' && onOpenSummary && (
              <button
                onClick={onOpenSummary}
                className="flex items-center justify-center gap-2 w-full catalog-card p-4 mt-2 border-2 border-dashed border-stamp/40 hover:border-stamp transition-colors"
              >
                <Share2 className="w-4 h-4 text-stamp" />
                <span className="font-display text-sm font-semibold">See Your Summary</span>
              </button>
            )}
          </>
        )}

        {slide.kind === 'verdict' && (
          <>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight leading-tight mb-4">
              {slide.headline}
            </h2>
            <p className="text-ink/70 leading-relaxed">{slide.body}</p>
          </>
        )}

        {slide.kind === 'stat' && (
          <>
            <div className="mb-6">
              <p className="font-mono text-5xl sm:text-6xl font-medium text-stamp leading-none">
                {slide.stat}
              </p>
              <p className="ledger-label mt-2">{slide.statLabel}</p>
            </div>
            <h2 className="font-display text-2xl font-semibold mb-3">{slide.headline}</h2>
            <p className="text-ink/70 leading-relaxed">{slide.body}</p>
          </>
        )}

        {slide.kind === 'book' && (
          <>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight leading-tight mb-1">
              {slide.headline}
            </h2>
            {slide.author && <p className="text-ink/50 mb-4">{slide.author}</p>}
            <p className="text-ink/70 leading-relaxed">{slide.body}</p>
          </>
        )}

        {slide.kind === 'bars' && (
          <>
            <h2 className="font-display text-2xl font-semibold mb-6">{slide.headline}</h2>
            <div className="space-y-4 mb-6">
              {slide.bars.map((bar) => (
                <div key={bar.label}>
                  <div className="flex justify-between text-xs font-mono uppercase tracking-wider text-ink/50 mb-1.5">
                    <span>{bar.label}</span>
                    <span>{bar.pct}%</span>
                  </div>
                  <div className="h-2 bg-line rounded-full overflow-hidden">
                    <div className="h-full bg-stamp rounded-full" style={{ width: `${bar.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-ink/70 leading-relaxed">{slide.body}</p>
          </>
        )}

        {slide.kind === 'donut' && (
          <>
            <h2 className="font-display text-2xl font-semibold mb-6">{slide.headline}</h2>
            <div className="mb-6">
              <Donut segments={slide.donut.segments} centerLabel={slide.donut.centerLabel} />
            </div>
            <p className="text-ink/70 leading-relaxed">{slide.body}</p>
          </>
        )}

        {slide.kind === 'histogram' && (
          <>
            {slide.statLabel && <p className="ledger-label mb-2">{slide.statLabel}</p>}
            <h2 className="font-display text-2xl font-semibold mb-6">{slide.headline}</h2>
            <div className="mb-6">
              <Histogram buckets={slide.histogram} color={slide.histogramColor} height={100} />
            </div>
            <p className="text-ink/70 leading-relaxed">{slide.body}</p>
          </>
        )}

        {slide.kind === 'rankedBars' && (
          <>
            <div className="mb-4">
              <p className="font-mono text-4xl font-medium text-stamp leading-none">{slide.stat}</p>
              <p className="ledger-label mt-2">{slide.statLabel}</p>
            </div>
            <h2 className="font-display text-2xl font-semibold mb-4">{slide.headline}</h2>
            <div className="mb-6">
              <RankedBars items={slide.rankedBars} />
            </div>
            <p className="text-ink/70 leading-relaxed">{slide.body}</p>
          </>
        )}

        {slide.kind === 'timeline' && (
          <>
            <h2 className="font-display text-3xl font-semibold tracking-tight mb-6">{slide.headline}</h2>
            <div className="space-y-2 mb-6">
              <div className="border border-line rounded-sm p-3 bg-card">
                <p className="font-mono text-xs text-ink/40">{slide.timeline.fromYear}</p>
                <p className="font-display text-base font-semibold leading-snug">{slide.timeline.fromTitle}</p>
              </div>
              <div className="text-center text-stamp text-xl leading-none">{'\u2193'}</div>
              <div className="border border-line rounded-sm p-3 bg-card">
                <p className="font-mono text-xs text-ink/40">{slide.timeline.toYear}</p>
                <p className="font-display text-base font-semibold leading-snug">{slide.timeline.toTitle}</p>
              </div>
            </div>
            <p className="text-ink/70 leading-relaxed">{slide.body}</p>
          </>
        )}

        {slide.kind === 'bookList' && (
          <>
            <h2 className="font-display text-2xl font-semibold mb-5">{slide.headline}</h2>
            <div className="space-y-3 mb-6">
              {slide.bookList.map((b, i) => (
                <div key={i} className="border border-line rounded-sm p-3 bg-card flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-base font-semibold leading-snug truncate">{b.title}</p>
                    <p className="text-xs text-ink/50 truncate">{b.author}</p>
                  </div>
                  <span className="font-mono text-xs text-stamp shrink-0">{b.sublabel}</span>
                </div>
              ))}
            </div>
            <p className="text-ink/70 leading-relaxed">{slide.body}</p>
          </>
        )}

        {slide.kind === 'pageBars' && (
          <>
            <h2 className="font-display text-2xl font-semibold mb-6">{slide.headline}</h2>
            <div className="space-y-5 mb-6">
              {slide.pageBars.map((b, i) => (
                <div key={i}>
                  <div className="flex justify-between items-baseline mb-1.5 gap-2">
                    <span className="font-display text-base font-semibold truncate">{b.title}</span>
                    <span className="font-mono text-sm text-stamp shrink-0">{b.pages}pg</span>
                  </div>
                  <div className="h-3 bg-line rounded-full overflow-hidden">
                    <div className="h-full bg-stamp rounded-full" style={{ width: `${b.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-ink/70 leading-relaxed">{slide.body}</p>
          </>
        )}
          </>
        )}
      </div>

      <div className="hairline pt-3 flex items-center justify-between">
        <span className="font-display text-sm italic text-ink/40">ShelfLife</span>
        <span className="ledger-label">shelflife.app</span>
      </div>
    </div>
  );
});

export default Slide;
