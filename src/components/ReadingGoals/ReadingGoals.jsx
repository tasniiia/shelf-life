import { useEffect, useState } from 'react';
import { Plus, Target } from 'lucide-react';
import Button from '../ui/Button';
import GoalCard from './GoalCard';
import { addGoal, getAllGoals, updateGoal, deleteGoal } from '../../lib/goalsDb';
import { getAllVocabEntries } from '../../lib/vocabularyDb';
import { getBookMetadata } from '../../lib/bookMetadata';
import {
  buildGoal,
  getPeriodBounds,
  computeLocalGoalProgress,
  computeGenreGoalProgress,
  booksNeedingGenreForGoal,
  checkStreakRollover,
} from '../../lib/goals';

const GOAL_TYPES = [
  { value: 'books', label: 'Books read' },
  { value: 'pages', label: 'Pages read' },
  { value: 'authors', label: 'New authors' },
  { value: 'genres', label: 'Genres explored' },
  { value: 'vocab', label: 'Vocabulary words logged' },
];

const PERIODS = [
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
];

export default function ReadingGoals({ library }) {
  const [goals, setGoals] = useState([]);
  const [progressById, setProgressById] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState('books');
  const [newTarget, setNewTarget] = useState('');
  const [newPeriod, setNewPeriod] = useState('quarter');
  const [error, setError] = useState(null);

  // Load goals, run the streak-rollover check for each (comparing against
  // whichever period just ended, if any), then compute progress for the
  // CURRENT period. Local goal types resolve instantly; genre goals need
  // their own small fetch, scoped to just the books read in that goal's
  // period, so they land a moment later without blocking the rest.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [loadedGoals, vocabEntries] = await Promise.all([getAllGoals(), getAllVocabEntries()]);
      if (cancelled) return;

      const updatedGoals = [];
      for (const goal of loadedGoals) {
        const { key: currentKey } = getPeriodBounds(goal.period);
        let pastProgress = null;
        if (goal.lastCheckedPeriodKey && goal.lastCheckedPeriodKey !== currentKey) {
          // The period rolled over since we last checked — figure out
          // whether the goal was met during that now-finished period.
          // Genre goals are skipped for streak purposes — recomputing
          // genre data for a past period on every load would be the same
          // large-fetch problem flagged earlier, so genre goals track
          // progress but don't contribute to streaks.
          if (goal.type !== 'genres') {
            pastProgress = computeLocalGoalProgress(goal, library, vocabEntries);
          }
        }
        const rolled = checkStreakRollover(goal, currentKey, pastProgress);
        if (rolled !== goal) {
          await updateGoal(rolled);
          updatedGoals.push(rolled);
        } else {
          updatedGoals.push(goal);
        }
      }
      if (cancelled) return;
      setGoals(updatedGoals);

      // Compute current-period progress for every goal.
      const nextProgress = {};
      for (const goal of updatedGoals) {
        if (goal.type === 'genres') continue; // filled in below, async
        nextProgress[goal.id] = computeLocalGoalProgress(goal, library, vocabEntries);
      }
      setProgressById((prev) => ({ ...prev, ...nextProgress }));

      // Genre goals: fetch genre data only for the books actually read in
      // each goal's own period, not the whole read shelf.
      const genreGoals = updatedGoals.filter((g) => g.type === 'genres');
      for (const goal of genreGoals) {
        const books = booksNeedingGenreForGoal(goal, library);
        const genreByBook = new Map();
        await Promise.all(
          books.map(async (book) => {
            try {
              const meta = await getBookMetadata(book);
              if (meta?.genres?.size) genreByBook.set(`${book.title}::${book.author}`, meta.genres);
            } catch (err) {
              console.warn(`[ShelfLife] Genre lookup failed for "${book.title}":`, err.message || err);
            }
          })
        );
        if (cancelled) return;
        setProgressById((prev) => ({ ...prev, [goal.id]: computeGenreGoalProgress(goal, library, genreByBook) }));
      }

      setIsLoading(false);
    }

    load().catch((err) => {
      console.warn('[ShelfLife] Could not load reading goals:', err.message || err);
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [library]);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    const targetNum = Number(newTarget);
    if (!newTarget || !Number.isFinite(targetNum) || targetNum <= 0) {
      setError('Enter a target greater than 0.');
      return;
    }
    const goal = buildGoal({ type: newType, target: targetNum, period: newPeriod });
    try {
      await addGoal(goal);
      setGoals((prev) => [...prev, goal]);
      setNewTarget('');
      setShowForm(false);
    } catch (err) {
      setError('Could not save that goal — try again.');
      console.warn('[ShelfLife] Failed to add goal:', err.message || err);
    }
  }

  async function handleDelete(id) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    try {
      await deleteGoal(id);
    } catch (err) {
      console.warn('[ShelfLife] Failed to delete goal:', err.message || err);
    }
  }

  if (isLoading) return null; // avoid a flash of an empty state while goals load

  return (
    <div className="max-w-2xl mx-auto px-4 pt-10 sm:pt-14">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="ledger-label mb-2">Reading Goals</p>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Set your own pace.</h2>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm" variant="secondary">
            <Plus className="w-4 h-4" /> Add Goal
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="catalog-card p-5 mb-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="block text-xs font-medium mb-1">Goal</span>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full border border-line rounded-sm px-2 py-2 text-sm bg-card"
              >
                {GOAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium mb-1">Target</span>
              <input
                type="number"
                min="1"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                placeholder="e.g. 5"
                className="w-full border border-line rounded-sm px-2 py-2 text-sm bg-card"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium mb-1">Period</span>
              <select
                value={newPeriod}
                onChange={(e) => setNewPeriod(e.target.value)}
                className="w-full border border-line rounded-sm px-2 py-2 text-sm bg-card"
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error && (
            <p className="text-sm text-stamp" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Add Goal
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {goals.length === 0 && !showForm ? (
        <div className="catalog-card p-8 text-center">
          <Target className="w-7 h-7 text-ink/20 mx-auto mb-3" />
          <p className="text-sm text-ink/60">
            No goals yet — set one above, like "5 books this quarter" or "3 new authors this year."
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} progress={progressById[goal.id]} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
