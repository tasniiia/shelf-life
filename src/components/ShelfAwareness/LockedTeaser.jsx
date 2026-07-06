import { Lock, Sparkles } from 'lucide-react';

// Generic dummy shapes hinting at each card's data shape — NOT the real
// computed values, since the whole point is to not display the actual
// insight until unlocked. Worth being clear about what this buys you,
// though: this is a soft UX deterrent against casual peeking, not a real
// security boundary. See the comment at the top of lib/monetization.js —
// nothing client-side in a backend-less app can actually be secure.
function DummyShape({ kind }) {
  if (kind === 'histogram') {
    return (
      <div className="flex items-end gap-1.5 h-16">
        {[40, 70, 50, 90, 60].map((h, i) => (
          <div key={i} className="w-4 bg-ink/40 rounded-t-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
    );
  }
  if (kind === 'rankedBars') {
    return (
      <div className="space-y-2 w-32">
        {[80, 60, 40].map((w, i) => (
          <div key={i} className="h-2.5 bg-ink/40 rounded-full" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }
  if (kind === 'bookList') {
    return (
      <div className="space-y-2 w-32">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 bg-ink/40 rounded-sm" />
        ))}
      </div>
    );
  }
  return <div className="w-20 h-20 bg-ink/40 rounded-full" />;
}

export default function LockedTeaser({ slide, onUnlock, compact = false }) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 flex items-center justify-center blur-md opacity-50 pointer-events-none"
        aria-hidden="true"
      >
        <DummyShape kind={slide.kind} />
      </div>
      <div className={`relative z-10 text-center ${compact ? 'px-2' : 'px-4'}`}>
        <p className={`font-display font-semibold mb-1 ${compact ? 'text-sm' : 'text-lg'}`}>
          Dig deeper into your library.
        </p>
        {!compact && (
          <p className="text-xs text-ink/60 mb-4">Unlock this insight, plus a couple more bonus stats.</p>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnlock();
          }}
          className={`bg-ink text-paper font-medium rounded-full hover:bg-stamp transition-colors inline-flex items-center gap-1.5 ${
            compact ? 'text-[10px] px-2.5 py-1 mt-1' : 'text-xs px-4 py-2'
          }`}
        >
          <Sparkles className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} /> Unlock Pro — $2.99
        </button>
      </div>
    </div>
  );
}

export function LockBadge({ className = '' }) {
  return <Lock className={className} />;
}
