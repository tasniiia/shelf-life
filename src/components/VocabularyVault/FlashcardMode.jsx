import { useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Shuffle, RotateCw } from 'lucide-react';
import Button from '../ui/Button';

// A fresh shuffle each time flashcard mode opens, not re-shuffled on every
// render — otherwise the card order would scramble mid-review whenever
// something unrelated causes a re-render.
function shuffled(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function FlashcardMode({ entries, onClose }) {
  // Reviewing a word with a blank definition isn't very useful — nothing
  // to actually quiz yourself on — so flashcard mode only draws from
  // words that got a real definition back.
  const reviewable = useMemo(() => entries.filter((e) => e.definition), [entries]);
  const [deck, setDeck] = useState(() => shuffled(reviewable));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (reviewable.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-ink/95 flex items-center justify-center p-4">
        <div className="catalog-card max-w-sm p-8 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-ink/40 hover:text-ink" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
          <p className="text-sm text-ink/60">
            No words with a definition yet — flashcard mode needs at least one to review.
          </p>
        </div>
      </div>
    );
  }

  const card = deck[index];

  function goNext() {
    setFlipped(false);
    setIndex((i) => (i + 1) % deck.length);
  }

  function goPrev() {
    setFlipped(false);
    setIndex((i) => (i - 1 + deck.length) % deck.length);
  }

  function reshuffle() {
    setDeck(shuffled(reviewable));
    setIndex(0);
    setFlipped(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/95 flex flex-col items-center justify-center p-4 sm:p-8">
      <button onClick={onClose} className="absolute top-6 right-4 sm:right-8 text-paper/70 hover:text-paper" aria-label="Close">
        <X className="w-6 h-6" />
      </button>

      <p className="text-paper/50 text-sm mb-6 font-mono">
        {index + 1} / {deck.length}
      </p>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full max-w-sm aspect-[3/4] catalog-card p-8 flex flex-col items-center justify-center text-center"
      >
        {!flipped ? (
          <>
            <p className="font-display text-3xl font-semibold leading-snug">{card.word}</p>
            {card.phonetic && <p className="text-ink/50 italic mt-2">{card.phonetic}</p>}
            <p className="text-xs text-ink/40 mt-6 flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5" /> Tap to reveal
            </p>
          </>
        ) : (
          <>
            {card.partOfSpeech && <p className="ledger-label mb-2">{card.partOfSpeech}</p>}
            <p className="text-ink/80 leading-relaxed">{card.definition}</p>
            {card.sourceBookTitle && card.sourceBookTitle !== 'Untracked' && (
              <p className="text-xs text-ink/40 mt-4">from {card.sourceBookTitle}</p>
            )}
          </>
        )}
      </button>

      <div className="flex items-center gap-4 mt-8">
        <button onClick={goPrev} className="text-paper/70 hover:text-paper p-2" aria-label="Previous word">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={reshuffle}
          className="flex items-center gap-1.5 text-sm text-paper/70 hover:text-paper px-3 py-2"
        >
          <Shuffle className="w-4 h-4" /> Shuffle
        </button>
        <button onClick={goNext} className="text-paper/70 hover:text-paper p-2" aria-label="Next word">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
