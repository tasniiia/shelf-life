import { useEffect, useState } from 'react';
import { Loader2, Plus, Download, BookOpen } from 'lucide-react';
import Button from '../ui/Button';
import BookAutocomplete from './BookAutocomplete';
import VocabEntryCard from './VocabEntryCard';
import { addVocabEntry, getAllVocabEntries, deleteVocabEntry } from '../../lib/vocabularyDb';
import {
  fetchWordDefinition,
  buildVocabEntry,
  exportVocabularyToJson,
  exportVocabularyToCsv,
  downloadTextFile,
} from '../../lib/vocabulary';

export default function VocabularyVault({ library }) {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [word, setWord] = useState('');
  const [sourceBook, setSourceBook] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAllVocabEntries()
      .then((loaded) => {
        if (cancelled) return;
        const sorted = [...loaded].sort((a, b) => new Date(b.dateLearned) - new Date(a.dateLearned));
        setEntries(sorted);
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

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    const trimmed = word.trim();
    if (!trimmed) {
      setError('Type a word first.');
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

      <div className="flex items-center justify-between mb-4">
        <p className="ledger-label">
          {entries.length} word{entries.length === 1 ? '' : 's'} saved
        </p>
        {entries.length > 0 && (
          <div className="flex gap-3">
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

      {isLoading ? (
        <p className="text-sm text-ink/50">Loading your vault…</p>
      ) : entries.length === 0 ? (
        <div className="catalog-card p-10 text-center">
          <BookOpen className="w-8 h-8 text-ink/20 mx-auto mb-3" />
          <p className="text-sm text-ink/60">
            No words yet — add one above next time you run into something worth remembering.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <VocabEntryCard key={entry.id} entry={entry} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
