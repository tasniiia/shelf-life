import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { X, Download, Sparkles } from 'lucide-react';
import RecapCard from './RecapCard';
import UnlockModal from './UnlockModal';
import { isProUnlocked } from '../../lib/monetization';

export default function RecapModal({ heroStats, topInsights, scopeLabel, onClose }) {
  const cardRef = useRef(null);
  const [unlocked, setUnlocked] = useState(isProUnlocked());
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [error, setError] = useState(null);

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
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-ink/10">
            <p className="font-display text-lg font-semibold text-paper mb-1 drop-shadow">Your Shelf Awareness Summary</p>
            <p className="text-xs text-paper/80 mb-4 max-w-[220px] drop-shadow">
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
        {unlocked && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 text-sm text-paper/90 hover:text-paper bg-paper/10 px-4 py-2 rounded-full"
          >
            <Download className="w-4 h-4" /> Download
          </button>
        )}
      </div>

      <UnlockModal
        open={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        onUnlocked={() => {
          setUnlocked(true);
          setUnlockModalOpen(false);
        }}
      />
    </div>
  );
}
