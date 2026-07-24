import { useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Layout/Header';
import CsvUpload from './components/Upload/CsvUpload';
import WhatsNext from './components/WhatsNext/WhatsNext';
import ShelfAwareness from './components/ShelfAwareness/ShelfAwareness';
import VocabularyVault from './components/VocabularyVault/VocabularyVault';
import { prefetchLibraryMetadata, clearMetadataCache } from './lib/bookMetadata';
import { filterSensibleCandidates } from './lib/metadataMatcher';
import { checkForCheckoutReturn } from './lib/monetization';
import { saveLibraryToStorage, loadLibraryFromStorage, clearStoredLibrary } from './lib/libraryStorage';
import { applyCompletedOverrides, reconcileOverrides } from './lib/libraryOverrides';
import { bookProgressKey } from './lib/readingProgress';
import { addOverride, getAllOverrides, deleteOverride } from './lib/completedOverridesDb';

export default function App() {
  const [rawLibrary, setRawLibrary] = useState(() => loadLibraryFromStorage());
  const [overrides, setOverrides] = useState([]);
  const [view, setView] = useState('vibe');
  const [prefetchProgress, setPrefetchProgress] = useState(null); // { done, total } | null
  const prefetchStarted = useRef(false);

  useEffect(() => {
    checkForCheckoutReturn();
  }, []);

  // Loaded once on mount — if the raw library was itself restored from
  // localStorage above, this picks up whatever "marked finished" overrides
  // were saved in a previous session too.
  useEffect(() => {
    getAllOverrides()
      .then(setOverrides)
      .catch((err) => console.warn('[ShelfLife] Could not load completed-book overrides:', err.message || err));
  }, []);

  // The effective library every tab actually sees: the raw CSV-derived one
  // with every "marked finished" override applied on top. This is the
  // app's first local "write" that can genuinely contradict the uploaded
  // CSV rather than just supplementing it — see libraryOverrides.js for
  // why that needs its own reconciliation step whenever a fresh CSV
  // arrives, handled in handleLibraryParsed below.
  const library = useMemo(
    () => (rawLibrary ? applyCompletedOverrides(rawLibrary, overrides) : null),
    [rawLibrary, overrides]
  );

  async function handleMarkFinished(book) {
    const override = { bookKey: bookProgressKey(book), completedDate: new Date().toISOString() };
    try {
      await addOverride(override);
      setOverrides((prev) => [...prev.filter((o) => o.bookKey !== override.bookKey), override]);
    } catch (err) {
      console.warn('[ShelfLife] Could not save "marked finished" override:', err.message || err);
    }
  }

  async function handleLibraryParsed(parsedLibrary) {
    setRawLibrary(parsedLibrary);
    if (!saveLibraryToStorage(parsedLibrary)) {
      console.warn('[ShelfLife] Library could not be saved — it will need to be re-uploaded after a refresh.');
    }

    // A fresh upload might mean Goodreads has genuinely caught up to a
    // book you marked finished locally — if the new CSV itself now shows
    // it as read, the override is redundant and should retire quietly
    // rather than risk the book appearing twice or with two different
    // finish dates once the real data catches up.
    if (overrides.length) {
      try {
        const { stillNeeded, retired } = reconcileOverrides(parsedLibrary, overrides);
        await Promise.all(retired.map((o) => deleteOverride(o.bookKey)));
        setOverrides(stillNeeded);
      } catch (err) {
        console.warn('[ShelfLife] Could not reconcile completed-book overrides:', err.message || err);
      }
    }
  }

  useEffect(() => {
    if (!library || prefetchStarted.current) return;
    prefetchStarted.current = true;

    try {
      // Warm the metadata cache for the whole to-read shelf right after
      // upload, so by the time someone actually runs What's Next most of
      // their books are already resolved and the search feels instant. Only
      // pre-fetch books that could actually be recommended (skips unread
      // series sequels/prequels, same as an active search would).
      const eligible = filterSensibleCandidates(library.toRead, library.read);
      const target = eligible.length ? eligible : library.toRead;
      if (!target.length) return;

      console.info(`[ShelfLife] Starting background prefetch for ${target.length} to-read books…`);
      setPrefetchProgress({ done: 0, total: target.length });
      prefetchLibraryMetadata(target, {
        onProgress: (done, total) => setPrefetchProgress({ done, total }),
      })
        .then(() => console.info('[ShelfLife] Background prefetch complete.'))
        .catch((err) => console.warn('[ShelfLife] Background prefetch failed:', err?.message || err))
        .finally(() => {
          // Leave the "done" state visible briefly rather than snapping away.
          setTimeout(() => setPrefetchProgress(null), 1500);
        });
    } catch (err) {
      console.warn('[ShelfLife] Could not start background prefetch:', err?.message || err);
    }
  }, [library]);

  function handleNewUpload() {
    if (!window.confirm('Upload a different CSV? This clears your current library from this browser.')) {
      return;
    }
    prefetchStarted.current = false;
    setPrefetchProgress(null);
    setRawLibrary(null);
    clearStoredLibrary();
  }

  const isPrefetching = prefetchProgress && prefetchProgress.done < prefetchProgress.total;

  return (
    <div className="min-h-screen flex flex-col">
      <Header view={view} onChangeView={setView} hasLibrary={!!library} onNewUpload={handleNewUpload} />

      <main className="flex-1">
        {!library && <CsvUpload onLibraryParsed={handleLibraryParsed} />}

        {library && view === 'vibe' && (
          <WhatsNext library={library} onNavigate={setView} onMarkFinished={handleMarkFinished} />
        )}

        {library && view === 'awareness' && <ShelfAwareness library={library} />}

        {library && view === 'vocab' && <VocabularyVault library={library} />}
      </main>

      {library && (
        <footer className="hairline text-center py-6 text-xs text-ink/40 space-y-1.5">
          {prefetchProgress && (
            <p className={isPrefetching ? '' : 'text-ledger'}>
              {isPrefetching
                ? `Warming up genre data in the background… ${prefetchProgress.done}/${prefetchProgress.total}`
                : `Genre data ready for ${prefetchProgress.total} books — What's Next will be fast.`}
            </p>
          )}
          <p>
            Your library never leaves this browser tab, and is saved here automatically — no need to
            re-upload after a refresh.{' '}
            <button onClick={handleNewUpload} className="underline underline-offset-2 hover:text-ink/60">
              Upload a different CSV
            </button>
            {' · '}
            <button
              onClick={() => {
                clearMetadataCache();
                setPrefetchProgress(null);
              }}
              className="underline underline-offset-2 hover:text-ink/60"
            >
              Clear cached genre data
            </button>
          </p>
        </footer>
      )}
    </div>
  );
}
