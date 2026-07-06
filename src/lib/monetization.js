// Unlock mechanism for ShelfLife Pro — a single one-time purchase that
// covers two perks: removing the watermark from the Shelf Awareness share
// image, and unlocking a handful of bonus insight cards in the Shelf
// Awareness deck. Since this app has no accounts and no backend by design,
// "paid" is tracked as a simple localStorage flag on this browser —
// consistent with how everything else here works, and an honest
// trade-off: a purchase only unlocks this specific browser, not an
// account that follows the person across devices.
//
// IMPORTANT — what this flag actually is and isn't: it's a soft UX
// deterrent, not a real access-control boundary. Nothing about a
// backend-less, all-client-side app can make a paywall genuinely secure —
// anyone can open the browser console and flip this flag themselves in
// about ten seconds, the same way they could with any client-only "gate."
// Blurring content instead of hiding it with CSS raises the bar slightly
// (it's not a one-line DevTools fix) but doesn't change that fundamental
// fact, and no code comment or UI copy anywhere in this app should imply
// otherwise. If real enforcement ever matters, it needs a backend that
// withholds the actual data server-side — a genuinely different
// architecture than this app has chosen.

const UNLOCK_KEY = 'shelflife.proUnlocked';

export function isProUnlocked() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(UNLOCK_KEY) === 'true';
}

export function setProUnlocked(value) {
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
//      the URL, which setProUnlocked() then reads and stores locally.
//
// Until all three exist, isStripeConfigured() returns false and the UI
// should show the honest "payments aren't connected yet" state rather
// than a broken checkout button.
//
// Also worth being direct about: even once Stripe is wired up, the
// success-redirect route sets the unlock flag unconditionally the moment
// someone lands on it, with no server-side verification that a payment
// actually happened. That's an inherent limitation of a no-backend
// checkout flow, not an oversight — anyone who discovers that URL
// directly gets a free unlock. Closing that gap for real requires a
// database and a verified webhook, i.e. an actual backend.

const STRIPE_PRICE_ID = 'price_REPLACE_ME'; // TODO: paste your real Stripe Price ID here
const CHECKOUT_ENDPOINT = '/api/create-checkout-session';

export function isStripeConfigured() {
  return !STRIPE_PRICE_ID.includes('REPLACE_ME');
}

export async function startProCheckout() {
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
    setProUnlocked(true);
    params.delete('unlocked');
    const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', cleanUrl);
  }
}
