import { useMemo, useState } from 'react';
import { Loader2, Search, ArrowRight } from 'lucide-react';
import BookPicker from './BookPicker';
import MatchCard from './MatchCard';
import Button from '../ui/Button';
import CurrentlyReadingHero from '../CurrentlyReading/CurrentlyReadingHero';
import ReadingGoals from '../ReadingGoals/ReadingGoals';
import { matchBooksMetadata, filterSensibleCandidates } from '../../lib/metadataMatcher';
import { pickRandomSample } from '../../lib/csv';
import { computeReadingVelocity } from '../../lib/metrics';

const TBR_SAMPLE_SIZE = 18;

const TIME_FILTERS = [
  { id: 'none', label: 'Any length' },
  { id: 'flightTomorrow', label: 'Flight tomorrow (<250pg)' },
  { id: 'longWeekend', label: 'Long weekend (450pg+)' },
  { id: 'quickWin', label: 'Quick win (shortest first)' },
];

export default function WhatsNext({ library, onNavigate }) {
  const [finishedIdx, setFinishedIdx] = useState('');
  const [direction, setDirection] = useState('similar');
  const [timeFilter, setTimeFilter] = useState('none');
  const [matches, setMatches] = useState(null);
  const [isRefining, setIsRefining] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingNote, setLoadingNote] = useState('');
  const [error, setError] = useState(null);

  const finishedPool = useMemo(() => {
    const pool = library.read.length ? library.read : library.currentlyReading;
    // Goodreads' CSV row order reflects whatever internal order the export
    // used (not reading order), so sort by most recently finished first —
    // that's almost always what "I just finished..." means to someone
    // scanning the dropdown.
    return [...pool].sort((a, b) => (b.dateRead?.getTime() ?? 0) - (a.dateRead?.getTime() ?? 0));
  }, [library.read, library.currentlyReading]);
  const readingVelocity = useMemo(() => computeReadingVelocity(library.read), [library.read]);

  async function handleMatch() {
    setError(null);

    if (finishedIdx === '') {
      setError('Pick the book you just finished first.');
      return;
    }
    if (!library.toRead.length) {
      setError('Your Goodreads "To Read" shelf is empty — add some books there first.');
      return;
    }

    const finishedBook = finishedPool[Number(finishedIdx)];

    // Drop book 2+ (or a prequel) of any series the reader hasn't actually
    // started before sampling, so a "smart" match never suggests, say, a
    // Hunger Games prequel to someone who hasn't read The Hunger Games.
    const eligibleToRead = filterSensibleCandidates(library.toRead, library.read);
    let candidatePool = eligibleToRead.length ? eligibleToRead : library.toRead;

    // Time-to-read quick filters, applied before sampling/scoring.
    if (timeFilter === 'longWeekend') candidatePool = candidatePool.filter((b) => b.pages > 450);
    else if (timeFilter === 'flightTomorrow') candidatePool = candidatePool.filter((b) => b.pages < 250);

    if (!candidatePool.length) {
      setError("No books on your to-read shelf match that length filter — try a different one.");
      return;
    }

    const candidates = pickRandomSample(candidatePool, TBR_SAMPLE_SIZE);

    function finalizeMatches(list) {
      // "Quick win" overrides relevance ranking entirely — shortest book
      // wins, regardless of how well it otherwise matches.
      return timeFilter === 'quickWin'
        ? [...list].sort((a, b) => (a.pages ?? Infinity) - (b.pages ?? Infinity))
        : list;
    }

    setIsLoading(true);
    setIsRefining(true);
    setLoadingNote('Looking up your shelf…');
    setMatches(null);

    try {
      const { matches: result } = await matchBooksMetadata({
        finishedBook,
        candidates,
        direction,
        readingVelocity,
        onProgress: (done, total) => setLoadingNote(`Looked up ${done} of ${total} books…`),
        onPartialUpdate: (partialMatches, isComplete) => {
          setMatches(finalizeMatches(partialMatches));
          setIsLoading(false); // show results as soon as the first ones arrive
          setIsRefining(!isComplete);
        },
      });
      setMatches(finalizeMatches(result));
    } catch (e) {
      setError(e.message || 'Something went wrong finding your match.');
    } finally {
      setIsLoading(false);
      setIsRefining(false);
    }
  }

  return (
    <>
      <CurrentlyReadingHero library={library} />
      <ReadingGoals library={library} />
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        <p className="ledger-label mb-2">What's next?</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-3">
          Find your next read.
        </h1>
        <p className="text-ink/70 mb-6 leading-relaxed">
          Tell us what you just finished and whether you want more of the same
          or a total change of pace — we'll look up real genre tags and rank
          your to-read shelf against it.
        </p>

      <div className="catalog-card p-6 space-y-6 mb-8">
        <BookPicker books={finishedPool} value={finishedIdx} onChange={setFinishedIdx} />

        <div>
          <label className="block text-sm font-medium mb-1.5">I want something…</label>
          <div className="flex gap-2">
            <ToggleButton active={direction === 'similar'} onClick={() => setDirection('similar')}>
              Similar to it
            </ToggleButton>
            <ToggleButton active={direction === 'different'} onClick={() => setDirection('different')}>
              Completely different
            </ToggleButton>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">How much time do you have?</label>
          <div className="flex flex-wrap gap-2">
            {TIME_FILTERS.map((f) => (
              <ToggleButton key={f.id} active={timeFilter === f.id} onClick={() => setTimeFilter(f.id)}>
                {f.label}
              </ToggleButton>
            ))}
          </div>
        </div>

        <Button onClick={handleMatch} disabled={isLoading} className="w-full" size="lg">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> {loadingNote}
            </>
          ) : (
            <>
              <Search className="w-4 h-4" /> Find Matches
            </>
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-stamp mb-6" role="alert">
          {error}
        </p>
      )}

      {matches && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <p className="ledger-label">
              {timeFilter === 'quickWin'
                ? 'Shortest first'
                : direction === 'similar'
                ? 'Closest matches'
                : 'Polar opposites'}
            </p>
            {isRefining && (
              <span className="flex items-center gap-1 text-xs text-ink/40">
                <Loader2 className="w-3 h-3 animate-spin" /> refining…
              </span>
            )}
          </div>
          {matches.map((m, i) => (
            <MatchCard key={`${m.title}-${i}`} match={m} rank={i + 1} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 pt-8 border-t border-line">
        <button
          onClick={() => onNavigate('awareness')}
          className="catalog-card p-5 text-left hover:border-stamp transition-colors flex items-center justify-between gap-3"
        >
          <div>
            <p className="ledger-label mb-1">Explore</p>
            <p className="font-display text-lg font-semibold">Shelf Awareness</p>
            <p className="text-sm text-ink/60 mt-1">See what your reading habits actually say about you.</p>
          </div>
          <ArrowRight className="w-5 h-5 text-ink/30 shrink-0" />
        </button>
        <button
          onClick={() => onNavigate('vocab')}
          className="catalog-card p-5 text-left hover:border-stamp transition-colors flex items-center justify-between gap-3"
        >
          <div>
            <p className="ledger-label mb-1">Explore</p>
            <p className="font-display text-lg font-semibold">Vocabulary Vault</p>
            <p className="text-sm text-ink/60 mt-1">Log words you ran into while reading.</p>
          </div>
          <ArrowRight className="w-5 h-5 text-ink/30 shrink-0" />
        </button>
      </div>
      </div>
    </>
  );
}

function ToggleButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm py-2 px-3 rounded-sm border transition-colors ${
        active ? 'bg-ink text-paper border-ink' : 'border-line text-ink/70 hover:border-ink/40'
      }`}
    >
      {children}
    </button>
  );
}
