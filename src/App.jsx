import { useEffect, useRef, useState } from 'react';
import Header from './components/Layout/Header';
import CsvUpload from './components/Upload/CsvUpload';
import WhatsNext from './components/WhatsNext/WhatsNext';
import ShelfAwareness from './components/ShelfAwareness/ShelfAwareness';
import { prefetchLibraryMetadata, clearMetadataCache } from './lib/bookMetadata';
import { filterSensibleCandidates } from './lib/metadataMatcher';
import { checkForCheckoutReturn } from './lib/monetization';

export default function App() {
  const [library, setLibrary] = useState(null);
  const [view, setView] = useState('vibe');
  const [prefetchProgress, setPrefetchProgress] = useState(null); // { done, total } | null
  const prefetchStarted = useRef(false);

  useEffect(() => {
    checkForCheckoutReturn();
  }, []);

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
    prefetchStarted.current = false;
    setPrefetchProgress(null);
    setLibrary(null);
  }

  const isPrefetching = prefetchProgress && prefetchProgress.done < prefetchProgress.total;

  return (
    <div className="min-h-screen flex flex-col">
      <Header view={view} onChangeView={setView} hasLibrary={!!library} />

      <main className="flex-1">
        {!library && <CsvUpload onLibraryParsed={setLibrary} />}

        {library && view === 'vibe' && <WhatsNext library={library} />}

        {library && view === 'awareness' && <ShelfAwareness library={library} />}
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
            Your library never leaves this browser tab.{' '}
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
