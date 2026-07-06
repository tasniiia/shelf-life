import { useEffect, useState } from 'react';
import { isProUnlocked, subscribeProUnlocked } from '../lib/monetization';

/**
 * Every component that needs to know whether Pro is unlocked should use
 * this hook instead of calling isProUnlocked() into its own local state.
 * Subscribing here means redeeming a promo code (or, once live, finishing
 * a real Stripe checkout) in ANY view updates every other already-mounted
 * component instantly — the locked insight cards, the summary card, and
 * anywhere else — without needing to switch tabs away and back or
 * refresh first.
 */
export function useProUnlocked() {
  const [unlocked, setUnlocked] = useState(isProUnlocked());

  useEffect(() => {
    return subscribeProUnlocked(setUnlocked);
  }, []);

  return unlocked;
}
