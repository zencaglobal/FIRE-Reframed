# FIRE Reframed — Interactive Companion

An interactive companion to the **FIRE Reframed** 7-part series. It lets readers
play with the ideas instead of just reading them — and, true to the series, it
deliberately refuses to hand anyone a single confident "FIRE number." It shows
ranges, fragility, and the honest arithmetic underneath.

One scrolling page, seven deep-linkable sections:

| Anchor | Section | Series part |
|---|---|---|
| `#variables` | The Five Variables | Part 1 |
| `#range` | Why One Number Lies | Part 2 |
| `#stress` | Small Errors Stack | Part 3 |
| `#enough` | The Arithmetic of Enough | Part 4 |
| `#lifestyle` | Lifestyle × Time | Part 5 |
| `#buffer` | FI ≠ RE | Part 6 |
| `#gate` | The Decision Gate | Part 7 |

Link an article straight to its companion piece with the anchor, e.g.
`.../index.html#stress`.

## Scheduled unlock

Each part reveals itself automatically on the series' publish schedule — no
manual step, no redeploy. Until a part's moment arrives it shows a teaser (title,
one-line description, and a live countdown); at the instant it unlocks in place,
and it also unlocks on any later visit.

The schedule is defined once, in `SCHEDULE` inside `script.js`, as fixed UTC
instants derived from the IST times below (India has no daylight saving, so
IST = UTC+5:30 year-round):

| Part | Section | Goes live (IST) | UTC instant |
|---|---|---|---|
| 1 | The Five Variables + How it's calculated | 31 Aug 2026, 12:00 PM | `2026-08-31T06:30:00Z` |
| 2 | Why One Number Lies | 7 Sep 2026, 11:30 AM | `2026-09-07T06:00:00Z` |
| 3 | Small Errors Stack | 14 Sep 2026, 11:30 AM | `2026-09-14T06:00:00Z` |
| 4 | The Arithmetic of Enough | 21 Sep 2026, 11:30 AM | `2026-09-21T06:00:00Z` |
| 5 | Lifestyle × Time | 28 Sep 2026, 11:30 AM | `2026-09-28T06:00:00Z` |
| 6 | FI ≠ RE | 5 Oct 2026, 11:30 AM | `2026-10-05T06:00:00Z` |
| 7 | The Decision Gate | 12 Oct 2026, 11:30 AM | `2026-10-12T06:00:00Z` |

The hero/overview is always visible. To change a date, edit the one `SCHEDULE`
array in `script.js`.

**Time source.** On load the page reads GitHub Pages' own `Date` response header
for a trustworthy UTC clock, and falls back to the visitor's device clock if
that request fails. Because it's a static site, the content still ships in the
files — this is a staged reveal that builds anticipation, not a security barrier
(the articles are public on these same dates anyway).

**Preview tools** (append to the URL — no code edits needed):

- `?unlock=all` — reveal every part now, to review the finished experience.
- `?now=2026-09-15T07:00:00Z` — simulate the clock at any instant, to see
  exactly what a reader sees on a given date.

## The math

The corpus is the present value of inflation-growing withdrawals earning the
expected return:

```
corpus = annual_spend × (1 − k^years) / (1 − k),  where k = (1 + inflation) / (1 + return)
```

When returns merely keep pace with inflation (`return = inflation`), this
collapses to the "arithmetic of enough":

```
corpus = annual_spend × years
```

Currency is INR-first (crore/lakh) with a `$` toggle at a readable **100:1**
(₹1 lakh ≈ $1,000), matching the figures in the article tables.

## Files

- `index.html` — structure
- `style.css` — styling (dark + gold/amber)
- `script.js` — all interactivity (vanilla JS, no dependencies, no build step)
- `tests/validate.mjs` — math validation harness (Node, no dependencies)

## Validate the math

```bash
node tests/validate.mjs
```

The harness reads the **shipped** `script.js`, extracts the exact
`requiredCorpus()` the site runs, and checks it three ways:

1. **Algebra** — the closed-form corpus is cross-checked against an independent
   year-by-year cash-flow simulation across 2,646 return/inflation/horizon
   combinations. The corpus must exhaust to ~0 at the end of the horizon.
2. **Fidelity** — it reproduces every cell of the published Part 4 and Part 5
   article tables, and confirms the general formula collapses to
   `corpus = annual × years` when returns match inflation.
3. **Edge cases** — return above / below / equal to inflation, and a 1-year
   horizon.

What the harness cannot check is *model choice* — see "What this does not model"
below. Those are deliberate simplifications, not bugs.

## What this does not model

By design (and consistent with the series' argument against false precision),
the tool is a deterministic thinking aid, not a financial planner. It assumes:

- a single return and inflation rate held constant over the whole horizon
  (no Monte Carlo, no sequence-of-returns risk beyond the illustrative shocks);
- returns merely keeping pace with inflation for the Part 4/5 tables
  (real return = 0), and life expectancy 90, exactly as the article images state;
- no taxes, fees, lumpy one-off expenses, pensions, or other income;
- a single life (not joint/couple);
- a flat, readable ₹100 : $1 conversion, not a live FX rate.

## Run locally

Just open `index.html` in a browser — or, to be safe with everything working:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Publish on GitHub Pages

1. Create a new repository on GitHub (e.g. `fire-reframed`).
2. Upload these four files to the repository root (drag-and-drop in the browser
   is fine, or push with git).
3. In the repo: **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Set branch to `main` and folder to `/ (root)`, then **Save**.
6. Wait ~1 minute. Your site goes live at:
   `https://<your-username>.github.io/fire-reframed/`

Any future edit you push to `main` republishes automatically.

---

*Educational content, not financial, investment, tax, or legal advice.*
