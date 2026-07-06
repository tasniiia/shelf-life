import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { X, Download, Lock } from 'lucide-react';
import RecapCard from './RecapCard';
import UnlockModal from './UnlockModal';
import { isProUnlocked } from '../../lib/monetization';

export default function RecapModal({ heroStats, topInsights, scopeLabel, onClose }) {
  const cardRef = useRef(null);
  const [unlocked, setUnlocked] = useState(isProUnlocked());
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [error, setError] = useState(null);

  async function handleDownload() {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'shelflife-wrapped.png';
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

      <div className="w-full max-w-sm rounded-lg overflow-hidden shadow-2xl">
        <RecapCard ref={cardRef} heroStats={heroStats} topInsights={topInsights} scopeLabel={scopeLabel} unlocked={unlocked} />
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        {error && <p className="text-sm text-stamp bg-paper/90 px-3 py-1 rounded-full">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 text-sm text-paper/90 hover:text-paper bg-paper/10 px-4 py-2 rounded-full"
          >
            <Download className="w-4 h-4" /> Download
          </button>
          {!unlocked && (
            <button
              onClick={() => setUnlockModalOpen(true)}
              className="flex items-center gap-2 text-sm text-paper/90 hover:text-paper bg-paper/10 px-4 py-2 rounded-full"
            >
              <Lock className="w-4 h-4" /> Remove watermark
            </button>
          )}
        </div>
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
