import { useState } from 'react';
import { Flame, CheckCircle2, Trash2, Loader2, ChevronDown } from 'lucide-react';
import { goalTypeLabel, periodLabel } from '../../lib/goals';

export default function GoalCard({ goal, progress, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const isLoading = progress === undefined; // genre goals resolve async, everything else is instant
  const current = progress?.current ?? 0;
  const target = goal.target;
  const isComplete = progress != null && current >= target;
  const pct = progress != null ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const items = progress?.items;
  const hasItems = items && items.length > 0;

  // Auto-generated from the actual tracked fields rather than a free-text
  // label someone could type in — a custom label like "read more fantasy"
  // would imply a precision this only ever tracks by raw count/type, never
  // by subject matter, so keeping the title mechanically derived means it
  // never overclaims what's actually being measured.
  const title = `${target} ${goalTypeLabel(goal.type)} ${periodLabel(goal.period)}`;

  return (
    <div className="catalog-card p-4 relative group">
      <button
        onClick={() => onDelete(goal.id)}
        className="absolute top-3 right-3 text-ink/25 hover:text-stamp opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Delete goal: ${title}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <p className="font-display text-base font-semibold leading-snug pr-6 mb-2 capitalize">{title}</p>

      {isLoading ? (
        <p className="flex items-center gap-1.5 text-xs text-ink/40">
          <Loader2 className="w-3 h-3 animate-spin" /> Calculating…
        </p>
      ) : (
        <>
          <div className="h-2 bg-line rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all ${isComplete ? 'bg-ledger' : 'bg-stamp'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <button
              onClick={() => hasItems && setExpanded((e) => !e)}
              disabled={!hasItems}
              className={`flex items-center gap-1 text-ink/50 ${hasItems ? 'hover:text-ink' : ''}`}
            >
              {current} / {target}
              {hasItems && (
                <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              )}
            </button>
            <div className="flex items-center gap-2">
              {goal.streak > 0 && (
                <span className="flex items-center gap-1 text-ink/50">
                  <Flame className="w-3.5 h-3.5 text-stamp" /> {goal.streak} in a row
                </span>
              )}
              {isComplete && (
                <span className="flex items-center gap-1 font-medium text-ledger">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                </span>
              )}
            </div>
          </div>

          {expanded && hasItems && (
            <ul className="mt-3 pt-3 border-t border-line space-y-1 max-h-40 overflow-y-auto">
              {items.map((item, i) => (
                <li key={i} className="text-xs text-ink/70 truncate">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
