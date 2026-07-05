import { forwardRef } from 'react';

// Trims to a word boundary rather than cutting mid-word, so the short
// description always reads cleanly regardless of how long the full body
// text happens to be.
function truncate(text, maxLen = 90) {
  if (!text || text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : maxLen)}\u2026`;
}

/**
 * A single, shareable composite of hero stats + the most notable insights —
 * the Shelf Awareness summary card. Unlike the full story/grid (which always shows all
 * 16 cards), this is deliberately a highlight reel meant to be exported as
 * one image and shared, so it only surfaces buildHeroStats() +
 * pickTopInsights() rather than everything.
 */
const RecapCard = forwardRef(function RecapCard({ heroStats, topInsights, scopeLabel, unlocked }, ref) {
  return (
    <div
      ref={ref}
      className="relative w-full aspect-[9/16] flex flex-col justify-between p-8 bg-card bg-grain overflow-hidden"
    >
      <div>
        <p className="ledger-label mb-1">Shelf Awareness Summary</p>
        <h2 className="font-display text-3xl font-semibold tracking-tight leading-tight">{scopeLabel}</h2>
      </div>

      <div className="grid grid-cols-2 gap-2.5 my-6">
        {heroStats.map((s) => (
          <div key={s.label} className="catalog-card p-3">
            <p className="font-mono text-xl font-medium text-stamp leading-none truncate">{s.value}</p>
            <p className="ledger-label mt-1 text-[10px]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 space-y-3.5">
        {topInsights.map((s) => (
          <div key={s.id} className="border-t border-line pt-3">
            <p className="ledger-label mb-1">{s.eyebrow}</p>
            <p className="font-display text-lg font-semibold leading-snug mb-1">{s.headline}</p>
            {s.body && <p className="text-xs text-ink/60 leading-relaxed">{truncate(s.body)}</p>}
          </div>
        ))}
      </div>

      <div className="hairline pt-3 flex items-center justify-between">
        <span className="font-display text-sm italic text-ink/40">ShelfLife</span>
        {!unlocked && <span className="ledger-label">made with shelflife.app</span>}
      </div>
    </div>
  );
});

export default RecapCard;
