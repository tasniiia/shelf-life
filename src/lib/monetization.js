// Unlock mechanism for the Shelf Awareness summary card's paid tier (remove
// watermark + multi-card carousel export). Since this app has no accounts
// and no backend by design, "paid" is tracked as a simple localStorage
// flag on this browser — consistent with how everything else here works,
// and an honest trade-off: a purchase only unlocks this specific browser,
// not an account that follows the person across devices.

const UNLOCK_KEY = 'shelflife.recapUnlocked';

export function isRecapUnlocked() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(UNLOCK_KEY) === 'true';
}

export function setRecapUnlocked(value) {
  if (typeof localStorage === 'undefined') return;
  if (value) localStorage.setItem(UNLOCK_KEY, 'true');
  else localStorage.removeItem(UNLOCK_KEY);
}

// --- Stripe checkout scaffold -----------------------------------------
//
// NOT LIVE YET. This is wired up and ready, but needs three things only
// you can provide (a real Stripe account is a business step, not
// something that can be scaffolded):
//
//   1. A real Stripe account + a Price object for the one-time unlock.
//   2. A Vercel serverless function at /api/create-checkout-session that
//      creates a Checkout Session server-side (see api/create-checkout-session.js.example
//      in the project root for a ready-to-rename starter implementation).
//   3. A webhook handler (api/stripe-webhook.js.example, same folder) that
//      confirms payment and — since there's no backend database to record
//      "this user paid" — redirects back to the app with a success flag in
//      the URL, which setRecapUnlocked() then reads and stores locally.
//
// Until all three exist, isStripeConfigured() returns false and the UI
// should show the honest "payments aren't connected yet" state rather
// than a broken checkout button.

const STRIPE_PRICE_ID = 'price_REPLACE_ME'; // TODO: paste your real Stripe Price ID here
const CHECKOUT_ENDPOINT = '/api/create-checkout-session';

export function isStripeConfigured() {
  return !STRIPE_PRICE_ID.includes('REPLACE_ME');
}

export async function startRecapCheckout() {
  if (!isStripeConfigured()) {
    throw new Error(
      "Payments aren't connected yet. Set a real Stripe Price ID in src/lib/monetization.js, " +
        'and create /api/create-checkout-session.js from the .example file in the project root.'
    );
  }
  const res = await fetch(CHECKOUT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceId: STRIPE_PRICE_ID,
      successUrl: `${window.location.origin}${window.location.pathname}?unlocked=true`,
      cancelUrl: window.location.href,
    }),
  });
  if (!res.ok) throw new Error(`Checkout session request failed: HTTP ${res.status}`);
  const { url } = await res.json();
  window.location.href = url;
}

/**
 * Call once on app load — if the person just landed back here from a
 * successful Stripe Checkout redirect (see successUrl above), this reads
 * the flag from the URL and persists the unlock locally, then cleans the
 * URL so refreshing doesn't re-trigger anything.
 */
export function checkForCheckoutReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('unlocked') === 'true') {
    setRecapUnlocked(true);
    params.delete('unlocked');
    const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', cleanUrl);
  }
}
