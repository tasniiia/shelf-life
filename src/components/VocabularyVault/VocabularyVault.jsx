import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Download, BookOpen, Layers } from 'lucide-react';
import Button from '../ui/Button';
import BookAutocomplete from './BookAutocomplete';
import VocabEntryCard from './VocabEntryCard';
import FlashcardMode from './FlashcardMode';
import { addVocabEntry, updateVocabEntry, getAllVocabEntries, deleteVocabEntry } from '../../lib/vocabularyDb';
import {
  fetchWordDefinition,
  buildVocabEntry,
  normalizeEntry,
  findDuplicateEntry,
  addSourceBookToEntry,
  exportVocabularyToJson,
  exportVocabularyToCsv,
  downloadTextFile,
  sortVocabEntries,
  filterVocabEntries,
} from '../../lib/vocabulary';

export default function VocabularyVault({ library }) {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [word, setWord] = useState('');
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);
  const [sourceBook, setSourceBook] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('recent');
  const [missingDefinitionOnly, setMissingDefinitionOnly] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAllVocabEntries()
      .then((loaded) => {
        if (cancelled) return;
        setEntries(loaded.map(normalizeEntry));
      })
      .catch((err) => {
        console.warn('[ShelfLife] Could not load vocabulary entries:', err.message || err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayedEntries = useMemo(
    () => sortVocabEntries(filterVocabEntries(entries, { missingDefinitionOnly }), sortBy),
    [entries, sortBy, missingDefinitionOnly]
  );

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    const trimmed = word.trim();
    if (!trimmed) {
      setError('Type a word first.');
      return;
    }

    const duplicate = findDuplicateEntry(entries, trimmed);
    if (duplicate) {
      // Same word already logged — even from a different book, this
      // should extend the existing card rather than create a second one
      // for the same word.
      const alreadyHasThisBook = sourceBook?.id
        ? duplicate.sourceBooks.some((b) => b.title === sourceBook.title && b.author === sourceBook.author)
        : true; // untracked selections never add anything, so treat as "nothing new" either way
      const merged = addSourceBookToEntry(duplicate, sourceBook);
      setIsSaving(true);
      try {
        await updateVocabEntry(merged);
        setEntries((prev) => prev.map((e) => (e.id === merged.id ? merged : e)));
        setWord('');
        setSourceBook(null);
        setSuccessMessage(
          alreadyHasThisBook
            ? `"${duplicate.word}" is already in your vault.`
            : `Added ${sourceBook.title} to your existing "${duplicate.word}" card.`
        );
      } catch (err) {
        setError('Could not update that word — try again.');
        console.warn('[ShelfLife] Failed to merge vocabulary entry:', err.message || err);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    setIsSaving(true);
    try {
      const definitionResult = await fetchWordDefinition(trimmed);
      const entry = buildVocabEntry({ word: trimmed, definitionResult, sourceBook });
      await addVocabEntry(entry);
      setEntries((prev) => [entry, ...prev]);
      setWord('');
      setSourceBook(null);
    } catch (err) {
      setError('Could not save that word — try again.');
      console.warn('[ShelfLife] Failed to add vocabulary entry:', err.message || err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteVocabEntry(id);
    } catch (err) {
      console.warn('[ShelfLife] Failed to delete vocabulary entry:', err.message || err);
    }
  }

  function handleExport(format) {
    if (!entries.length) return;
    if (format === 'json') {
      downloadTextFile('shelflife-vocabulary.json', exportVocabularyToJson(entries), 'application/json');
    } else {
      downloadTextFile('shelflife-vocabulary.csv', exportVocabularyToCsv(entries), 'text/csv');
    }
  }

  return (
    <>
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
      <p className="ledger-label mb-2">Vocabulary Vault</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight mb-3">Words worth keeping.</h1>
      <p className="text-ink/70 mb-6 leading-relaxed">
        Log a word you ran into while reading, and we'll look up its definition for you. Tie it to the book it
        came from, or just keep it loose.
      </p>

      <form onSubmit={handleAdd} className="catalog-card p-6 space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="vocab-word">
            Word
          </label>
          <input
            id="vocab-word"
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="e.g. petrichor"
            className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-card"
          />
        </div>

        <BookAutocomplete library={library} value={sourceBook} onChange={setSourceBook} />

        {error && (
          <p className="text-sm text-stamp" role="alert">
            {error}
          </p>
        )}
        {successMessage && <p className="text-sm text-ledger">{successMessage}</p>}

        <Button type="submit" disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Looking it up…
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Add Word
            </>
          )}
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="ledger-label">
          {displayedEntries.length} of {entries.length} word{entries.length === 1 ? '' : 's'}
        </p>
        {entries.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={() => setFlashcardsOpen(true)}
              className="flex items-center gap-1.5 text-xs text-ink/60 hover:text-ink underline underline-offset-2"
            >
              <Layers className="w-3.5 h-3.5" /> Flashcard Mode
            </button>
            <button
              onClick={() => handleExport('json')}
              className="flex items-center gap-1.5 text-xs text-ink/60 hover:text-ink underline underline-offset-2"
            >
              <Download className="w-3.5 h-3.5" /> Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-1.5 text-xs text-ink/60 hover:text-ink underline underline-offset-2"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 mb-5 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-ink/60">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-line rounded-sm px-2 py-1.5 text-sm bg-card"
            >
              <option value="recent">Recently added</option>
              <option value="alphabetical">Alphabetical (A–Z)</option>
              <option value="scrabble">Scrabble value (high to low)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-ink/60">
            <input
              type="checkbox"
              checked={missingDefinitionOnly}
              onChange={(e) => setMissingDefinitionOnly(e.target.checked)}
              className="rounded-sm"
            />
            Missing a definition only
          </label>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ink/50">Loading your vault…</p>
      ) : entries.length === 0 ? (
        <div className="catalog-card p-10 text-center">
          <BookOpen className="w-8 h-8 text-ink/20 mx-auto mb-3" />
          <p className="text-sm text-ink/60">
            No words yet — add one above next time you run into something worth remembering.
          </p>
        </div>
      ) : displayedEntries.length === 0 ? (
        <div className="catalog-card p-10 text-center">
          <p className="text-sm text-ink/60">No words match that filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedEntries.map((entry) => (
            <VocabEntryCard key={entry.id} entry={entry} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>

    {flashcardsOpen && <FlashcardMode entries={entries} onClose={() => setFlashcardsOpen(false)} />}
    </>
  );
}
