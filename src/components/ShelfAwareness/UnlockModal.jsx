import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import { isStripeConfigured, startProCheckout, setProUnlocked } from '../../lib/monetization';

export default function UnlockModal({ open, onClose, onUnlocked }) {
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  if (!open) return null;

  async function handleUnlock() {
    setError(null);
    setIsStarting(true);
    try {
      await startProCheckout(); // redirects on success, so this line only "returns" on failure
    } catch (e) {
      setError(e.message);
    } finally {
      setIsStarting(false);
    }
  }

  function handleDevUnlock() {
    setProUnlocked(true);
    onUnlocked();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40" onClick={onClose}>
      <div className="catalog-card w-full max-w-sm p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-ink/40 hover:text-ink" aria-label="Close">
          <X className="w-5 h-5" />
        </button>

        <p className="ledger-label mb-2">ShelfLife Pro</p>
        <h2 className="font-display text-xl font-semibold mb-3">Unlock the full picture</h2>
        <p className="text-sm text-ink/70 leading-relaxed mb-5">
          A single $2.99 one-time unlock: removes the "made with shelflife.app" credit from your shareable
          summary (plus unlocks exporting the full multi-card carousel), and unlocks a few bonus insight cards
          in your Shelf Awareness deck.
        </p>

        {!isStripeConfigured() ? (
          <div className="border border-line rounded-sm p-3 mb-4 bg-paper">
            <p className="text-xs text-ink/60 leading-relaxed">
              Payments aren't connected yet — this needs a real Stripe account and a deployed checkout endpoint.
              See <code className="font-mono">src/lib/monetization.js</code> for exactly what's left to wire up.
            </p>
          </div>
        ) : (
          error && (
            <p className="text-sm text-stamp mb-4" role="alert">
              {error}
            </p>
          )
        )}

        <Button onClick={handleUnlock} disabled={isStarting || !isStripeConfigured()} className="w-full mb-2">
          <Sparkles className="w-4 h-4" /> Unlock Pro — $2.99
        </Button>

        {import.meta.env.DEV && (
          <button
            onClick={handleDevUnlock}
            className="w-full text-center text-xs text-ink/40 hover:text-ink/60 underline underline-offset-2 mt-2"
          >
            Dev only: unlock without paying (for local testing)
          </button>
        )}
      </div>
    </div>
  );
}
