# ShelfLife

A mood-based reading companion built from your Goodreads export. No backend,
no database, no accounts — everything runs client-side in your browser.

Two features:

1. **What's Next** — pick the book you just finished, and get 3 ranked
   matches from your own "To Read" shelf, complete with cover art (Open
   Library's ISBN-guess cover first, falling back to Google Books' thumbnail
   — already fetched alongside genre data — if Open Library doesn't have
   one). Looks up real subject tags, descriptions, and ratings from Open
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
2. **Shelf Awareness** — a recap of your reading habits, computed entirely
   from your CSV. Opens with a **hero stats row** (total books, pages read,
   average rating, finish rate, top author) before diving into 14 detailed
   insight cards: finish rate, publication-year spread, the single biggest
   publication-year jump between two back-to-back reads, favorite author,
   format preference, early-adopter vs. archive-digger tendency, seasonal
   reading rhythm (with a "Winter Hibernator"/"Summer Sprinter" persona),
   your own rating distribution, whether long books actually earn higher
   ratings from you, page-count mix, series commitment, review-writing
   habits, and your oldest unread book. Choose **All Time** or any year
   you've actually finished a book in for an **Annual Recap** scoped to
   just that year.
   - On mobile, it plays as a full-screen, tap-through story.
   - On desktop, every card is laid out on one page — click any card to
     flip it over and reveal the detail on the back.

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
   browser with PapaParse; nothing is uploaded anywhere.
2. Use the **What's Next** or **Shelf Awareness** tab. That's it — no
   accounts, no setup.

## Project structure

```
src/
  lib/
    csv.js             # Goodreads CSV parsing + normalization
    metrics.js          # Shelf Awareness metrics, computed from the CSV
    bookMetadata.js      # Open Library + Google Books lookups
    metadataMatcher.js   # Scoring/ranking logic for What's Next
    slides.js           # Turns metrics into the Shelf Awareness deck
  components/
    Layout/          # Header + nav
    Upload/          # CSV drop zone
    VibeMatcher/     # Book picker + match result cards
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
