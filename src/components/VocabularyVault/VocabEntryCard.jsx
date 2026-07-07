import { Trash2 } from 'lucide-react';

export default function VocabEntryCard({ entry, onDelete }) {
  const hasDefinition = !!entry.definition;

  return (
    <div className="catalog-card p-5 relative group">
      <button
        onClick={() => onDelete(entry.id)}
        className="absolute top-3 right-3 text-ink/25 hover:text-stamp opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Delete ${entry.word}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <h3 className="font-display text-2xl font-semibold leading-snug pr-6">{entry.word}</h3>
      {entry.phonetic && <p className="text-sm text-ink/50 italic mb-1">{entry.phonetic}</p>}
      {entry.partOfSpeech && <p className="ledger-label mb-2">{entry.partOfSpeech}</p>}

      {hasDefinition ? (
        <p className="text-sm text-ink/80 leading-relaxed mb-3">{entry.definition}</p>
      ) : (
        <p className="text-sm text-ink/40 italic mb-3">
          No definition found — this one might be worth defining yourself.
        </p>
      )}

      <div className="hairline pt-3 flex items-center justify-between text-xs text-ink/50">
        <span className="truncate pr-2">
          {entry.sourceBooks?.length
            ? entry.sourceBooks.length === 1
              ? entry.sourceBooks[0].title
              : `${entry.sourceBooks[0].title} +${entry.sourceBooks.length - 1} more`
            : 'Not from a tracked book'}
        </span>
        <span className="font-mono shrink-0">
          {new Date(entry.sourceBooks?.[0]?.inheritedReadDate || entry.dateLearned).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>
    </div>
  );
}
