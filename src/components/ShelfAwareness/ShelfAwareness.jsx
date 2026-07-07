import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { Sparkles, Download, X, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import Button from '../ui/Button';
import Slide from './Slide';
import ShelfAwarenessGrid from './ShelfAwarenessGrid';
import RecapModal from './RecapModal';
import UnlockModal from './UnlockModal';
import { computeAllMetrics, getAvailableYears, filterLibraryByYear } from '../../lib/metrics';
import { buildSlides, buildHeroStats } from '../../lib/slides';
import { useProUnlocked } from '../../hooks/useProUnlocked';
import { getAllVocabEntries } from '../../lib/vocabularyDb';
import { computeScrabblePower, computeLinguisticEra, buildVocabInsightSlides } from '../../lib/vocabularyInsights';

export default function ShelfAwareness({ library }) {
  const availableYears = useMemo(() => getAvailableYears(library), [library]);
  const [scope, setScope] = useState('all');
  const proUnlocked = useProUnlocked();

  const scopedLibrary = useMemo(() => filterLibraryByYear(library, scope), [library, scope]);
  const metrics = useMemo(() => computeAllMetrics(scopedLibrary), [scopedLibrary]);
  const coreSlides = useMemo(() => buildSlides({ metrics, library: scopedLibrary, year: scope }), [
    metrics,
    scopedLibrary,
    scope,
  ]);

  // Vocabulary Vault lives in IndexedDB, which is async, unlike the rest
  // of this deck (built synchronously from the CSV-derived library) — so
  // these cards necessarily arrive an instant after the rest of the deck
  // renders, once this resolves, rather than being part of the same
  // synchronous buildSlides() pass.
  const [vocabSlides, setVocabSlides] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const scopeLabel = scope === 'all' ? 'All Time' : String(scope);

    getAllVocabEntries()
      .then((entries) => {
        if (cancelled || !entries.length) return;

        const scrabblePower = computeScrabblePower(entries, scope);
        const linguisticEra = computeLinguisticEra(entries, library, scope);

        setVocabSlides(buildVocabInsightSlides({ scrabblePower, linguisticEra, scopeLabel }));
      })
      .catch((err) => {
        console.warn('[ShelfLife] Could not load vocabulary insights:', err.message || err);
      });

    return () => {
      cancelled = true;
    };
  }, [library, scope]);

  // Vocab-derived cards slot in just before the closing "outro" card, which
  // buildSlides always places last.
  const slides = useMemo(() => {
    if (!vocabSlides.length) return coreSlides;
    return [...coreSlides.slice(0, -1), ...vocabSlides, coreSlides[coreSlides.length - 1]];
  }, [coreSlides, vocabSlides]);

  const heroStats = useMemo(() => buildHeroStats(metrics, scopedLibrary), [metrics, scopedLibrary]);
  // Locked-and-not-yet-purchased cards must never surface in the free
  // shareable summary — otherwise generating that image would be a trivial
  // way to bypass the paywall entirely.
  const shareableSlides = useMemo(
    () => slides.filter((s) => !s.locked || proUnlocked),
    [slides, proUnlocked]
  );

  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const slideRef = useRef(null);

  function handleRequestUnlock() {
    setUnlockModalOpen(true);
  }

  function handleGenerate() {
    setError(null);
    if (slides.length <= 2) {
      // just intro + outro — not enough read books to say anything interesting
      setError(
        scope === 'all'
          ? "You need a few more finished, rated books before there's much to say here."
          : `Not enough finished books in ${scope} to build a recap — try "All Time" or a different year.`
      );
      return;
    }
    setCurrent(0);
    setIsPlaying(true);
  }

  const goNext = useCallback(() => {
    setCurrent((c) => Math.min(c + 1, slides.length - 1));
  }, [slides]);

  const goPrev = useCallback(() => {
    setCurrent((c) => Math.max(c - 1, 0));
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    function onKey(e) {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') setIsPlaying(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying, goNext, goPrev]);

  async function handleDownload() {
    if (!slideRef.current) return;
    try {
      const dataUrl = await toPng(slideRef.current, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `shelflife-${slides[current].id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      setError('Could not export that slide as an image.');
    }
  }

  if (!isPlaying) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 sm:py-14 text-center">
        <p className="ledger-label mb-2">Shelf Awareness</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-4">
          Your reading, decoded.
        </h1>
        <p className="text-ink/70 mb-6 leading-relaxed">
          A shareable recap built entirely from your {scopedLibrary.read.length} finished
          books — every card comes straight from the math in your own CSV.
        </p>

        {availableYears.length > 0 && (
          <div className="mb-6 text-left max-w-xs mx-auto">
            <label className="block text-sm font-medium mb-1.5" htmlFor="recap-scope">
              Recap for
            </label>
            <select
              id="recap-scope"
              value={scope}
              onChange={(e) => setScope(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-card"
            >
              <option value="all">All Time</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y} Annual Recap
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleGenerate} size="lg">
            <Sparkles className="w-4 h-4" /> Generate My Shelf Awareness
          </Button>
          <Button onClick={() => setRecapOpen(true)} size="lg" variant="secondary">
            <Share2 className="w-4 h-4" /> Share My Shelf Awareness Summary
          </Button>
        </div>
        {error && (
          <p className="mt-4 text-sm text-stamp" role="alert">
            {error}
          </p>
        )}

        {recapOpen && (
          <RecapModal
            heroStats={heroStats}
            shareableSlides={shareableSlides}
            scopeLabel={scope === 'all' ? 'All Time' : `${scope} Recap`}
            onClose={() => setRecapOpen(false)}
          />
        )}

        <UnlockModal
          open={unlockModalOpen}
          onClose={() => setUnlockModalOpen(false)}
          onUnlocked={() => setUnlockModalOpen(false)}
        />
      </div>
    );
  }

  const slide = slides[current];

  return (
    <>
      {/* Mobile: full-screen tap-through story */}
      <div className="md:hidden fixed inset-0 z-40 bg-ink/95 flex items-center justify-center p-4 sm:p-8">
        {/* progress segments */}
        <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-10">
          {slides.map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full bg-paper/25 overflow-hidden">
              <div
                className="h-full bg-paper transition-all"
                style={{ width: i <= current ? '100%' : '0%' }}
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => setIsPlaying(false)}
          className="absolute top-8 right-4 sm:right-8 text-paper/70 hover:text-paper z-10"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="relative w-full max-w-sm aspect-[9/16] rounded-lg overflow-hidden shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <Slide
                ref={slideRef}
                slide={slide}
                index={current}
                total={slides.length}
                isProUnlocked={proUnlocked}
                onRequestUnlock={handleRequestUnlock}
                onOpenSummary={() => setRecapOpen(true)}
              />
            </motion.div>
          </AnimatePresence>

          {/* tap zones */}
          <button
            className="absolute left-0 top-0 w-1/3 h-full"
            aria-label="Previous slide"
            onClick={goPrev}
          />
          <button
            className="absolute right-0 top-0 w-1/3 h-full"
            aria-label="Next slide"
            onClick={goNext}
          />
        </div>

        <button
          onClick={goPrev}
          disabled={current === 0}
          className="hidden sm:flex absolute left-8 top-1/2 -translate-y-1/2 text-paper/60 hover:text-paper disabled:opacity-20"
          aria-label="Previous"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        <button
          onClick={goNext}
          disabled={current === slides.length - 1}
          className="hidden sm:flex absolute right-8 top-1/2 -translate-y-1/2 text-paper/60 hover:text-paper disabled:opacity-20"
          aria-label="Next"
        >
          <ChevronRight className="w-8 h-8" />
        </button>

        <button
          onClick={handleDownload}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-paper/80 hover:text-paper bg-paper/10 px-4 py-2 rounded-full"
        >
          <Download className="w-4 h-4" /> Save this slide
        </button>
      </div>

      {/* Desktop: all cards on one page, flip to reveal */}
      <div className="hidden md:block">
        <ShelfAwarenessGrid
          slides={slides}
          onClose={() => setIsPlaying(false)}
          isProUnlocked={proUnlocked}
          onRequestUnlock={handleRequestUnlock}
          onOpenSummary={() => setRecapOpen(true)}
        />
      </div>

      {recapOpen && (
        <RecapModal
          heroStats={heroStats}
          shareableSlides={shareableSlides}
          scopeLabel={scope === 'all' ? 'All Time' : `${scope} Recap`}
          onClose={() => setRecapOpen(false)}
        />
      )}

      <UnlockModal
        open={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        onUnlocked={() => setUnlockModalOpen(false)}
      />
    </>
  );
}
