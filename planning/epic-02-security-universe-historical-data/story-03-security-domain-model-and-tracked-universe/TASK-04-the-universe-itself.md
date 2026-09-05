# Task 2.3.4 — The universe itself: ~100 securities, and the rule that produced them

**Status:** Not started
**Story:** [2.3 Security Domain Model & the Tracked Universe](STORY.md)
**Depends on:** Tasks 2.3.1 (the selection rule and the file format) and 2.3.2 (the type
every row has to satisfy)

## Objective

Write the list. Data only — no loader, no database, no schema change — so that the product
decision and the engineering that consumes it fail separately when they fail.

This is the task in the story that is a **product conversation rather than an engineering
one**, and it is the one that quietly determines whether Epics 4, 5, 6 and 7 have anything
interesting to show.

## Work

- **Settle the actual list with the user**, not with a generated ranking. §6 asks for
  100–500 liquid US-listed equities plus SPY, QQQ, DIA, IWM and major sector ETFs,
  starting at roughly 100. The defensible starting shape this story already names: the
  eleven sector SPDRs plus the four index proxies, then ~85 equities allocated across
  sectors. §38's flagship demo uses **NVDA**, so a list without it fails the demo the
  portfolio is built around — check the spec's own named symbols against the list rather
  than assuming they are in it
- **Allocate by sector against Task 2.3.1's stated floor**, not by market cap. The
  criterion that a naive list fails is deliberate sector coverage: every sector present
  needs enough constituents for a breadth number to mean something, and Epic 5's
  relative-move is only interesting where a sector has peers to be relative to. A sector
  with one constituent is a sector that will look broken in Epic 4 and will look like a
  bug rather than a choice
- **Fill in the metadata each row needs from the source Task 2.3.1 chose.** Note where a
  field is genuinely unknown — `cik` is Epic 9's, and an ETF does not file — and leave it
  null rather than guessing, because a guessed identifier is worse than an absent one:
  Epic 9 will trust it.
  **Amended after 2.3.2 and 2.3.3: the rows do NOT carry provenance and cannot.** `Security`
  deliberately does not embed it, because a file checked into a repository cannot know when
  it was retrieved — the loader supplies `profile_source`, `profile_retrieved_at`,
  `classification_source` and `classification_retrieved_at` at load time, and `0003` makes
  all four `not null` with no default so it cannot forget. What this task owes provenance is
  therefore one negative check: that the file is a **single source** for every row, so a
  per-row source override is unnecessary. If any row's classification came from somewhere
  else, say so here, because 2.3.5 will otherwise write one source string for the whole file
- **Record the count, the sector distribution and the selection rule in `UNIVERSE.md`**,
  and **inspect the distribution against the "not 40% technology" criterion rather than
  asserting it** — acceptance criterion 4 says inspected, and the difference is a table of
  counts per sector printed from the file itself. If the list fails its own rule, change
  the list; if the rule was wrong, change the rule in `UNIVERSE.md` and say why, because a
  rule quietly relaxed to fit a list is the failure this split exists to prevent
- **Do not encode the count anywhere.** §6 wants expansion to 500 without redesign, so
  there is no `EXPECTED_COUNT`, no array length asserted, no page size sized to 100. The
  count is a fact about today's file that gets **recorded** in `UNIVERSE.md` and **derived**
  everywhere else. Task 2.3.6 owes the argument that expansion needs no redesign; this task
  owes it the absence of anything that would make the argument false
- **Make the file typecheck against `Security`.** Task 2.3.1 chose a `.ts` module at
  `apps/backend/src/universe.ts`, and this is the whole reason that format won: a row
  missing a sector, or carrying a sector that is not in the taxonomy, is a **compile
  error** rather than a load-time failure.
  **Three mechanical consequences of the type 2.3.2 actually shipped, none of which is
  obvious from that sentence:**
  - **`Security` is a discriminated union on `kind`, not one interface.** An `equity` and a
    `sector_etf` **require** a `Sector`; an `index_etf`'s sector is required to be `null`.
    So the compile error above is real in both directions, and an index proxy that arrived
    carrying a sector does not compile either
  - **`symbol` is a `Ticker`, a branded type, so `symbol: "AAPL"` does not satisfy it.**
    Either every row wraps it — `toTicker("AAPL")` — or the file maps plain rows through one
    small constructor. Prefer the constructor: it is one place to validate, it keeps the
    rows reading as data, and a curated file is exactly where a boundary check belongs. This
    is the one cost 2.3.2 stated in advance so this task is not surprised by it
  - **`industry` is nullable and `cik` is nullable, but neither is optional.** Under
    `exactOptionalPropertyTypes` an omitted key and an explicit `null` are different types,
    and the type requires the key. A row that simply leaves `cik` out does not compile —
    which is deliberate, because an absent key is an author who never decided
- **Derive the eleven `sector_etf` rows from the sector-to-ETF mapping rather than typing
  them twice.** Task 2.3.2 puts that mapping in `packages/shared` as a `Record` total over
  the taxonomy, and a `sector_etf` row's `sector` is precisely the key it is the value of —
  so hand-typing `XLK`, `XLV` and the rest here creates a second copy of a table that
  already exists, in the same commit as the first. `UNIVERSE.md` §1 records this as the one
  real cost of putting the mapping in `packages/shared`, and generating the rows from it is
  the stated mitigation. The four index proxies are genuinely data and are typed out
- **Leave every cross-row rule to the loader.** "Every sector present has a corresponding
  sector ETF" is a statement about the whole list rather than about a row — the same shape
  Task 2.2.4 refused to encode as a row-level `check` — so it belongs in Task 2.3.5's
  validation. Do not half-express it here
- **Do not load anything.** The database is untouched by this task and `securities` still
  holds zero rows at the end of it

## Done when

- The list exists as data, in the chosen format and location, with every field Task 2.3.2's
  type requires
- The count, the per-sector distribution and the selection rule are in `UNIVERSE.md`, and
  the distribution was printed and read against the rule rather than assumed
- Every symbol PRODUCT_SPEC.md names by hand appears in it, or its absence is argued
- No number in the codebase depends on the list being ~100 long
- `pnpm verify` passes; `securities` is still empty

## Notes

**Three guards stand behind this list now, and this task only meets the first.** The
compiler refuses a row whose sector is not in the taxonomy or whose kind and sector
disagree (2.3.2's union); the loader refuses the whole-list rules a type cannot express
(2.3.5); and the database refuses all of it again through `securities_kind_check`,
`securities_status_check`, `securities_sector_check` and `securities_sector_matches_kind`
(2.3.3). If a row here is wrong in a way the compiler catches, that is the arrangement
working — do not reach for a cast.

The two ways to get this wrong are opposite. Picking by market cap gives a list that is
40% technology and makes half of Epic 5 uninteresting. Picking for spread alone gives
illiquid names whose IEX activity is too thin for an anomaly score to mean anything —
remember the feed is IEX and not consolidated SIP (invariant 6), so "liquid" here means
liquid _on IEX_.
