import { useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { X, Download, Sparkles, Settings2 } from 'lucide-react';
import RecapCard from './RecapCard';
import UnlockModal from './UnlockModal';
import CustomizeSummaryModal from './CustomizeSummaryModal';
import { useProUnlocked } from '../../hooks/useProUnlocked';
import { resolveSummaryInsights } from '../../lib/slides';
import { getCustomSummarySelection, setCustomSummarySelection } from '../../lib/summaryCustomization';

export default function RecapModal({ heroStats, shareableSlides, scopeLabel, onClose }) {
  const cardRef = useRef(null);
  const unlocked = useProUnlocked();
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customSelection, setCustomSelectionState] = useState(getCustomSummarySelection());
  const [error, setError] = useState(null);

  // Custom selection is Pro-only, per the request — a free user's
  // localStorage could theoretically still hold a stale selection from a
  // Pro session, so this only actually applies it when currently unlocked.
  const topInsights = useMemo(
    () => resolveSummaryInsights(shareableSlides, unlocked ? customSelection : null, 3),
    [shareableSlides, customSelection, unlocked]
  );

  const availableForCustomize = useMemo(
    () => shareableSlides.filter((s) => s.id !== 'intro' && s.id !== 'outro'),
    [shareableSlides]
  );

  function handleSaveCustomSelection(ids) {
    setCustomSelectionState(ids.length ? ids : null);
    setCustomSummarySelection(ids);
  }

  async function handleDownload() {
    if (!unlocked || !cardRef.current) return; // Pro-only — see the blurred overlay below for everyone else
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'shelflife-summary.png';
      link.href = dataUrl;
      link.click();
    } catch {
      setError('Could not export this as an image.');
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-ink/95 flex items-center justify-center p-4 sm:p-8">
      <button onClick={onClose} className="absolute top-6 right-4 sm:right-8 text-paper/70 hover:text-paper" aria-label="Close">
        <X className="w-6 h-6" />
      </button>

      <div className="relative w-full max-w-sm rounded-lg overflow-hidden shadow-2xl">
        <div className={unlocked ? '' : 'blur-md'} aria-hidden={!unlocked}>
          <RecapCard ref={cardRef} heroStats={heroStats} topInsights={topInsights} scopeLabel={scopeLabel} unlocked={unlocked} />
        </div>

        {/* Free users get a blurred preview, not a watermarked-but-readable
            copy — the summary card is a Pro perk, not a growth-loop giveaway.
            Same honesty caveat as every other lock in this app: this is a
            soft deterrent (see lib/monetization.js), not real DRM. */}
        {!unlocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-ink/80">
            <p className="font-display text-lg font-semibold text-paper mb-1">Your Shelf Awareness Summary</p>
            <p className="text-sm text-paper/90 mb-4 max-w-[220px]">
              Unlock ShelfLife Pro to see and download your summary card, watermark-free.
            </p>
            <button
              onClick={() => setUnlockModalOpen(true)}
              className="bg-paper text-ink font-medium rounded-full text-xs px-4 py-2 inline-flex items-center gap-1.5 hover:bg-stamp hover:text-paper transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Unlock Pro — $2.99
            </button>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        {error && <p className="text-sm text-stamp bg-paper/90 px-3 py-1 rounded-full">{error}</p>}
        <div className="flex items-center gap-3">
          {unlocked && (
            <>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 text-sm text-paper/90 hover:text-paper bg-paper/10 px-4 py-2 rounded-full"
              >
                <Download className="w-4 h-4" /> Download
              </button>
              <button
                onClick={() => setCustomizeOpen(true)}
                className="flex items-center gap-2 text-sm text-paper/90 hover:text-paper bg-paper/10 px-4 py-2 rounded-full"
              >
                <Settings2 className="w-4 h-4" /> Customize
              </button>
            </>
          )}
        </div>
      </div>

      <UnlockModal
        open={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        onUnlocked={() => setUnlockModalOpen(false)}
      />

      <CustomizeSummaryModal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        availableSlides={availableForCustomize}
        initialSelection={customSelection || []}
        onSave={handleSaveCustomSelection}
      />
    </div>
  );
}
