# ShelfLife

A mood-based reading companion built from your Goodreads export. No backend,
no database, no accounts — everything runs client-side in your browser.

Three features:

1. **What's Next** — sits below a **Currently Reading hero widget** (cover
   art cards for anything on your currently-reading shelf, newest addition
   first, hidden entirely if that shelf is empty — labeled "On your shelf
   for X days" rather than "started X days ago," since Goodreads' CSV has
   no field for when a book actually moved to currently-reading, only when
   it was first added to your account on any shelf; shares the same
   three-tier cover fallback described below. Each card also shows a
   Goodreads link and an "at your pace" estimated read time using the same
   reading-velocity math as What's Next — an estimate for the whole book,
   not "time remaining," since Goodreads doesn't track how far into a book
   you actually are. On mobile, when there's more than one book, each card
   is slightly narrower than the full screen so the next one visibly peeks
   in from the edge as a scroll hint.). Below that: pick the
   book you just finished, and get 3 ranked
   matches from your own "To Read" shelf, complete with cover art. Three
   fallback tiers: Open Library's ISBN-guess cover first, then Google
   Books' thumbnail (already fetched alongside genre data), then Open
   Library's own title/author-matched cover as a last resort — this third
   one catches books with a blank ISBN in the Goodreads export (common for
   Kindle editions) that Google Books also doesn't have. Looks up real
   subject tags, descriptions, and ratings from Open
   Library and Google Books; results stream in and re-rank live as each
   book resolves, rather than showing a blank wait for the whole batch.

   **Time-to-read filters** narrow the candidate pool before matching:
   *Flight tomorrow* (<250pg), *Long weekend* (450pg+), or *Quick win*
   (bypasses relevance ranking entirely and just returns your shortest
   to-read books). Every match also shows an **"at your pace" reading-time
   estimate**, based on your median pages-per-day velocity calculated from
   gaps between consecutive `Date Read` entries on your read shelf.

   Every match comes with a plain explanation of exactly what it has in
   common with the book you just finished, and won't recommend book 2+ (or
   a prequel) of a series you haven't started yet.

   Metadata lookups are cached persistently in `localStorage` — once a book's
   genre data has been fetched, it's never fetched again, even across
   browser sessions. Right after you upload your CSV, the app quietly warms
   this cache for your whole to-read shelf in the background.

   - **Reading Goals**, also on this page, between Currently Reading and
     the matcher: set your own custom targets — any combination of a type
     (books read, pages read, new authors, genres explored, or Vocabulary
     Vault words logged), a number, and a recurring period (month,
     quarter, year, or all-time). Goals are genuinely recurring, not
     one-off: a "books this quarter" goal always tracks whichever quarter
     it currently is, the way a fitness app's weekly step goal resets each
     week. Hitting a goal earns a 🔥 streak that carries forward each time
     the period rolls over, checked automatically whenever you open the
     app.
     - Books, pages, vocabulary words, and new authors are instant — pure
       local math against data already loaded. "New authors" specifically
       means authors you hadn't read *before* the current period started,
       which costs nothing extra since author name needs no network
       lookup at all.
     - "Genres explored" is different on purpose: it measures **genre
       diversity within the period** (how many different genres you read
       this quarter), not "genres truly new to you all-time" — that
       stronger claim would need genre data for your entire reading
       history just to establish a baseline, a much larger fetch than one
       goal justifies. It fetches genre data only for the books actually
       read in that goal's period, reusing the same cache as everything
       else, so it loads a beat behind the other goal types but costs
       nothing on repeat visits.
     - A goal's title (e.g., "10 books this quarter") is always generated
       from its actual tracked fields, not a free-text label you type in —
       a custom label like "read more nonfiction" would imply a precision
       the tracking never actually verifies (it counts by raw type only,
       never by subject), so keeping the title mechanically derived means
       it can never overclaim what's really being measured.

2. **Shelf Awareness** — a recap of your reading habits, computed entirely
   from your CSV. Opens with a **hero stats row** (total books, pages read,
   average rating, finish rate) before diving into 17 detailed insight
   cards: finish rate, publication-year spread, the single biggest
   publication-year jump between two back-to-back reads, favorite author,
   format preference, early-adopter vs. archive-digger tendency, seasonal
   reading rhythm (with a "Winter Hibernator"/"Summer Sprinter" persona),
   your own rating distribution, whether long books actually earn higher
   ratings from you, page-count mix, series commitment, review-writing
   habits, your oldest unread book, **backlog clear time** (how long your
   whole to-read shelf would take at your actual reading pace), a **TBR
   declutter list** (the 3 books that have waited longest), and whether
   your backlog is growing or shrinking over the past year. Choose **All
   Time** or any year you've actually finished a book in for an **Annual
   Recap** scoped to just that year.
   - On mobile, it plays as a full-screen, tap-through story.
   - On desktop, every card is laid out on one page — click any card to
     flip it over and reveal the detail on the back.
   - **Share My Shelf Awareness Summary** composites your hero stats + the 3 most
     notable insights (ranked by how far each number sits from a "boring
     middle") into one single shareable image with a short description per
     insight — a highlight reel, not the full 19-card deck. This summary
     card is a **ShelfLife Pro** perk: free users see a blurred preview
     with an unlock prompt and can't download it; Pro users see it clearly,
     watermark-free, and can download it.
   - **10 cards** (Weekend Warrior/Steady Reader pace persona, Seasonal
     Velocity, The Fair Grader, Length vs. Rating, Literary Diet, The
     Documentarian, To-Read Graveyard, Backlog Clear Time, TBR Declutter
     List, Backlog Trend) are locked behind ShelfLife Pro, a single $2.99
     one-time unlock — the first 8 cards plus the closing card stay free.
     Locked cards show a blurred preview immediately rather than requiring
     a flip to discover they're locked — see the honesty note in
     "Monetization setup" below about exactly what that protects against
     (and doesn't).
   - **3 more Pro cards, derived from Vocabulary Vault**, appended just
     before the closing card once that data loads (it lives in IndexedDB,
     async, unlike the rest of this synchronously-built deck, so these
     arrive an instant after everything else — imperceptible in practice):
     **Scrabble Power** (a deliberately gamified point score across your
     logged words, using standard Scrabble tile values), **Your Linguistic
     Era** (a Spotify-Wrapped-style persona based on the publication era of
     the books your words came from — cross-referenced against your
     current library at display time, not stored on the word itself, so it
     works retroactively for every existing entry), and **Where Your Words
     Come From** (which genre category has taught you the most new words —
     fetches genre data only for the specific handful of books your
     vocabulary is actually linked to, not your whole read shelf, to keep
     it cheap).

3. **Vocabulary Vault** — log a word you ran into while reading, and it
   looks up the definition, part of speech, and phonetic spelling for you
   via the free Free Dictionary API — no key, no signup. Optionally tie the
   word to a specific book from your library via a searchable
   title/author autocomplete; if that book is on your **read** shelf, its
   real Date Read carries over as the entry's timeline anchor instead of
   today's date. A 404 (common for invented fantasy/sci-fi words) doesn't
   block the save — the word is kept with blank definition fields you can
   fill in yourself. Fully free, no Pro gate. Export your whole vault (not
   just whatever's currently sorted/filtered — always everything) as
   JSON or CSV at any time.
   - **Sort** by recently added (default), alphabetical, or Scrabble
     value high-to-low (reuses the same tile-value scoring as the Scrabble
     Power Pro card). **Filter** to just words still missing a definition —
     the ones that got a 404 from the dictionary lookup and need you to
     define them yourself, previously buried among everything else with no
     way to find just those.
   - Storage is IndexedDB, not `localStorage` — better suited to a
     collection that can grow into hundreds of entries with real structure,
     and it's asynchronous rather than blocking. Implemented as a small
     hand-rolled wrapper (`src/lib/vocabularyDb.js`) rather than pulling in
     the `idb` npm package, since this project's build environment has no
     network access to actually verify a new dependency resolves — the
     wrapper follows the standard IndexedDB request/transaction pattern
     directly instead.

## Installing as an app (PWA)

The deployed site is installable — "Add to Home Screen" on iOS/Android, or
the install icon in Chrome's address bar on desktop. A minimal service
worker caches the app shell as you use it for basic offline support, and
deliberately never touches Open Library/Google Books requests (those stay
live — caching a genre lookup would mean stale data forever, defeating the
whole point of the separate, deliberate metadata cache in `bookMetadata.js`).
The service worker only registers in the production build, not local dev,
so it doesn't fight with Vite's own hot reload.

## Real buy links (no scraping, no mock data)

Each match in What's Next shows real purchase and borrowing options:

- **Google Books buy link + live price**, when Google actually has the
  ebook for sale — this data is already being fetched alongside genre
  matching, so it costs nothing extra. Deliberately **not** persisted in
  the long-term metadata cache like genre data is, since a price can change
  at any time and that cache has no expiry — persisting it would mean
  showing a stale price forever once a book is cached.
- **Amazon** — always shown as a fallback, a plain product-search URL with
  an affiliate tag appended once you've configured one (see below). Until
  then it's still a fully functional link, just without earning anything.
- **WorldCat ("Find at a library")** — a genuinely universal "find this
  book at a library near you" search, always shown, never an affiliate
  link (libraries don't pay commissions). Chosen over a Libby link
  specifically because Libby's catalog is tied to each person's individual
  library system with no library-agnostic search URL — a single link that
  works identically for everyone isn't really possible there without
  asking each user to first configure their home library.

## Monetization setup (affiliate links + Shelf Awareness summary watermark unlock)

**Affiliate links:** open `src/lib/affiliateLinks.js` and fill in
`AMAZON_ASSOCIATE_TAG` (from your Amazon Associates account). The
commission disclaimer only appears in the UI once it's set — no need to
touch anything else. WorldCat is intentionally excluded from this flag
entirely, since it's never an affiliate relationship.

**Shelf Awareness summary watermark unlock** is scaffolded but **not live** — it
needs a real Stripe account, which is a business step only you can
complete:

1. Create a Stripe account and a one-time-payment Price for the unlock.
2. Rename `api/create-checkout-session.js.example` → `create-checkout-session.js`
   and `api/stripe-webhook.js.example` → `stripe-webhook.js` (the webhook is
   optional — see the comment at the top of that file for why).
3. `npm install stripe`.
4. In Vercel's project settings, add environment variables `STRIPE_SECRET_KEY`
   (and `STRIPE_WEBHOOK_SECRET` if using the webhook). Never commit these to git.
5. In `src/lib/monetization.js`, replace `STRIPE_PRICE_ID` with your real Price ID.

Until all of that's done, the unlock button in the app will honestly say
payments aren't connected yet, rather than pretending to work.

**Demoing Pro before Stripe is live:** open `src/lib/monetization.js` and
change `PROMO_CODE` (default `shelflife-preview`) to whatever phrase you
want. Two ways to redeem it:
- **A shareable link** — `yoursite.com?promo=your-code` unlocks Pro
  automatically on load, no typing required. Good for sending to early
  testers.
- **Manual entry** — click "Have a promo code?" on the unlock modal (the
  same one both the locked insight cards and the summary card use) and
  type it in directly. Good for demoing in person.

Same honesty caveat as everything else Pro-related in this app, just more
directly relevant here: this code lives in client-side JavaScript, so
it's technically visible to anyone who inspects the deployed bundle. It's
a convenience phrase for people you've chosen to share it with, not a real
secret or an access-control mechanism — fine for previewing/demoing,
not something to rely on once real payments matter.

In local dev
(`npm run dev`), there's also a "dev only" link on the unlock modal that
flips the unlock flag directly with no code needed — it's hidden
automatically in the deployed production build.

Since there's no backend database, "unlocked" is stored as a flag in that
browser's `localStorage` — a purchase unlocks the watermark removal on the
device it was bought from, not an account that follows across devices
(consistent with the rest of the app having no accounts at all).

## Deploying to Vercel

There's nothing to configure — no environment variables, no API keys, no
backend. This is a static Vite build, and Open Library/Google Books are both
free, key-less APIs called directly from each visitor's own browser, so
there's no secret to protect and no server-side cost.

**Fastest path (no GitHub needed):**

```bash
npm install -g vercel
cd shelflife
vercel
```

Follow the prompts (you'll log in via browser the first time). Vercel
auto-detects the Vite framework, build command (`vite build`), and output
directory (`dist`) — just accept the defaults. When it finishes, you'll get
a live URL. Run `vercel --prod` to push that same deploy to your permanent
production URL instead of a preview link.

**If you want automatic redeploys on every future change:**

1. Push this folder to a new GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. On [vercel.com](https://vercel.com), click **Add New Project** → import
   that repo → Vercel auto-detects everything → **Deploy**.
3. From then on, every `git push` redeploys automatically.

Once it's live, open the Vercel URL on your phone and use your browser's
"Add to Home Screen" option for an app-like icon.

## Getting started (local development)

```bash
npm install
npm run dev
```

Then open the printed local URL. On first load:

1. **Upload your Goodreads CSV.** Goodreads → Account Settings →
   Import/Export → Export Library. The file is parsed entirely in your
   browser with PapaParse; nothing is uploaded anywhere. The parsed
   library is then saved to `localStorage`, so refreshing the page — or
   closing and reopening the tab — doesn't require re-uploading; only
   "Upload a different CSV" — in the header (always visible) or the
   footer — clears it, with a confirmation prompt first since it's
   destructive.
2. Use the **What's Next**, **Shelf Awareness**, or **Vocabulary Vault**
   tab. That's it — no accounts, no setup.

## Project structure

```
src/
  lib/
    csv.js             # Goodreads CSV parsing + normalization
    metrics.js          # Shelf Awareness metrics, computed from the CSV
    bookMetadata.js      # Open Library + Google Books lookups
    metadataMatcher.js   # Scoring/ranking logic for What's Next
    slides.js           # Turns metrics into the Shelf Awareness deck
    vocabulary.js        # Dictionary lookup, book search, export logic
    vocabularyDb.js       # Hand-rolled IndexedDB wrapper for saved words
    vocabularyInsights.js # Scrabble/Era/Genre Pro cards derived from Vault data
    goals.js             # Reading Goals period math, progress, streaks
    goalsDb.js            # Hand-rolled IndexedDB wrapper for goals
  components/
    Layout/          # Header + nav
    Upload/          # CSV drop zone
    WhatsNext/       # Book picker + match result cards
    CurrentlyReading/ # Hero widget above What's Next
    ReadingGoals/    # Goal creation form + progress cards
    VocabularyVault/ # Quick-add form + dashboard grid
    ShelfAwareness/  # Mobile story player + desktop flip-card grid
    ui/              # Shared Button, Card, Stamp primitives
```

## Design notes

The visual language is a "library card catalog": index-card cream, a
due-date-stamp red for scores and verdicts, ledger green for secondary
states, and a stamped/rotated badge (`<Stamp />`) as the app's signature
recurring element. Typefaces are Fraunces (display), Inter (body), and IBM
Plex Mono (data/labels). On desktop, Shelf Awareness renders every metric as
a physical-feeling index card you flip over to read.

## Known simplifications

- **DNF detection** relies on a `dnf` tag in your Goodreads bookshelves —
  Goodreads' export doesn't have a dedicated DNF status, so untagged
  abandoned books will show up under "currently reading" or "to read".
- **No global "Average Rating" column.** Goodreads removed this from CSV
  exports. Shelf Awareness's rating-based metric (**The Grade Curve**) looks
  at the shape of your own rating distribution instead of comparing to a
  world average that no longer exists in the data.
- **What's Next** depends on your books having ISBNs in the CSV and being
  findable on Open Library/Google Books — very obscure or self-published
  titles may come back with thin or no external data, in which case that
  candidate falls back to author/length/era similarity only. It also needs
  live internet access at match time, since it's looking up ~25 books per
  search.
- **Annual Recap scoping** filters by `Date Read` for finished books. DNF
  and currently-reading books usually have no Date Read, so they're matched
  to a year by `Date Added` instead — the closest available signal. The
  To-Read Graveyard card always reflects your current backlog regardless of
  which year you're viewing, since "oldest unread book" isn't a per-year
  question.
- **Milestone Co-Op** (social sync) is deferred to a future version.
