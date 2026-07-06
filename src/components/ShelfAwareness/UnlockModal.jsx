import { useState } from 'react';
import { X, Sparkles, Tag } from 'lucide-react';
import Button from '../ui/Button';
import { isStripeConfigured, startProCheckout, setProUnlocked, isPromoCodeValid } from '../../lib/monetization';

export default function UnlockModal({ open, onClose, onUnlocked }) {
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [showPromoField, setShowPromoField] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState(null);

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

  function handleRedeemPromo(e) {
    e.preventDefault();
    setPromoError(null);
    if (isPromoCodeValid(promoCode)) {
      setProUnlocked(true);
      onUnlocked();
    } else {
      setPromoError("That code didn't match — check it and try again.");
    }
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
          A single $2.99 one-time unlock: unlocks 10 additional insight cards in your Shelf Awareness deck, plus
          lets you view and download your shareable Shelf Awareness Summary — watermark-free.
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

        {!showPromoField ? (
          <button
            onClick={() => setShowPromoField(true)}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-ink/50 hover:text-ink mt-3"
          >
            <Tag className="w-3.5 h-3.5" /> Have a promo code?
          </button>
        ) : (
          <form onSubmit={handleRedeemPromo} className="mt-3 flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Enter code"
              autoFocus
              className="flex-1 border border-line rounded-sm px-3 py-2 text-sm bg-card"
            />
            <Button type="submit" size="sm" variant="secondary">
              Redeem
            </Button>
          </form>
        )}
        {promoError && (
          <p className="text-xs text-stamp mt-2" role="alert">
            {promoError}
          </p>
        )}

        {import.meta.env.DEV && (
          <button
            onClick={handleDevUnlock}
            className="w-full text-center text-xs text-ink/40 hover:text-ink/60 underline underline-offset-2 mt-3"
          >
            Dev only: unlock without paying (for local testing)
          </button>
        )}
      </div>
    </div>
  );
}
