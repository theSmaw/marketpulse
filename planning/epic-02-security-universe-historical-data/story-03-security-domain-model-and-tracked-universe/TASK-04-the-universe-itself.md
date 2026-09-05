# Task 2.3.4 — The universe itself: ~100 securities, and the rule that produced them

**Status:** Complete (2026-09-05)
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

---

## What was done (2026-09-05)

`apps/backend/src/universe.ts` — **101 securities: 86 equities, the 11 sector SPDRs and
the 4 index proxies.** No loader, no schema change, no dependency, no lockfile line;
`securities` holds **0 rows**, read back afterwards. `pnpm verify` is exit 0 in 28.17 s.

The distribution, the reading of it against `UNIVERSE.md` §7's seven rules, and the two
places the rule bit are recorded in **`UNIVERSE.md` §9** rather than here — that document
is where the next person changing the universe looks, and a second copy of the table is a
copy waiting to disagree. The headline numbers: floor **6** and ceiling **12** both met
exactly, largest sector **14.0%** of the equities against the "not 40% technology"
criterion, **8** constituents on `Semiconductors`, all eight of PRODUCT_SPEC.md's
hand-named symbols present, 45 distinct industries and ten of them three-deep or more.

Four compiler guards and one run-time guard were **made to fail before being believed**: a
sector outside the taxonomy (`TS2345`), an index proxy carrying a sector (`TS2322`), a row
that omits `industry` (`TS2741`, because an omitted key is not a `null` one under
`exactOptionalPropertyTypes`), a twelfth sector added to `SECTORS` (`TS2741` twice in
`packages/shared`, for `SECTOR_ETFS` and `SECTOR_LABELS`, before it reaches this file), and
a malformed ticker (`TypeError: Not a valid US equity ticker: "NVDA CORP"` at module load).

The eleven sector-proxy rows are **generated from `SECTOR_ETFS`**, so the symbols are not
typed twice. Every cross-row rule is left to Task 2.3.5 and deliberately not
half-expressed. Nothing encodes the count.

---

## For the stakeholder: what this actually was, in plain terms

### The short version

**We decided which companies MarketPulse is going to watch, and wrote the list down.**
101 of them: 86 real companies, plus 15 "index funds" that act as yardsticks — one for the
whole US market, one for each of the eleven industries. That is the entire deliverable.
Nothing was switched on, nothing went into the database, and nothing is on screen yet.

That sounds small. It is the most consequential thing in this story, and it is worth
explaining why.

### Why a list is a product decision and not a data-entry job

MarketPulse's whole promise is answering **"is this unusual?"** — and unusual is a
comparison. If a chip company drops 4%, the only way to know whether that is news is to
look at what the other chip companies did, what its industry did, and what the market did.
There is no clever algorithm that rescues you from a badly chosen list: **the quality of
every answer this product ever gives is capped by who is in the room to be compared
against.**

So the failure we were guarding against is a specific and very common one. The obvious way
to pick 100 US companies is "the 100 biggest", and that produces a list that is roughly
40% technology, with entire industries represented by one or two names. On such a list,
"82% of this sector is falling" means _four companies_, and the product looks broken
rather than informative — not because the code is wrong, but because there was nothing to
measure. Worse, it looks like a bug, so someone would spend a week hunting for one.

We therefore did the opposite. **We wrote the selection rule down first, in a previous
task, and then wrote a list to satisfy it** — rather than writing a list and reverse-
engineering a rule that flatters it. The rule sets a floor of 6 companies per industry (so
a percentage means something) and a ceiling of 12 (so no single industry dominates). Our
biggest sector is 14% of the list. There is a table in `UNIVERSE.md` showing the count for
every sector, printed out of the actual file and read line by line against the rule. The
instruction was that the distribution be _inspected_, not asserted, and the difference
between those two words is that table.

### The decisions worth knowing about

**We deliberately let the rule constrain us rather than bending it.** Three sectors —
utilities, property and materials — came out at exactly the minimum of six. We could have
padded them to look more balanced. We did not, because the extra names would have been
thinly traded, and our market data feed only sees a slice of US trading (a limitation we
display on screen rather than hide). A thinly traded stock produces an "unusualness" score
computed over noise, which is worse than a small sector: it is confidently wrong rather
than merely coarse. **No number in the rule was changed to accommodate the list**, and
saying so explicitly is the point — a rule quietly relaxed to fit is exactly the failure
the two-task split exists to catch.

**We made the demo work on purpose.** The product's flagship five-minute demonstration is
built around a semiconductor story — one chip company falling while the rest of the group
also falls. That sentence is only true if there is a _group_. So eight of our twelve
technology names are chip companies. That is the single most deliberate shape in the file,
and without it the headline demo would have been a claim about three companies.

**We refused to guess.** Every company has an SEC identifier used later to pull up its
official filings. We do not have those yet, so every row records "unknown" rather than a
plausible-looking number. A guessed identifier is worse than a missing one, because the
part of the system that reads filings will _trust_ it and quietly show the wrong company's
paperwork. Similarly, we noted honestly that the boundary between "technology",
"communication services" and "consumer discretionary" is genuinely arguable — Amazon and
Tesla are classified as retail and cars rather than tech, Google and Meta as media rather
than tech — and the system records those as _our judgement_, timestamped and attributed,
rather than as fact.

**We made the file impossible to get wrong in the ways a computer can check.** Rather than
a spreadsheet or a data file, the list is written in the same language as the rest of the
application. That means a company filed under an industry that does not exist, or a market
yardstick wrongly assigned to a sector, **fails to build** — it is caught on the developer's
machine in seconds, not discovered months later as a strange gap in a chart. We proved
this by deliberately breaking the file five different ways and confirming each one was
caught, rather than assuming it. There was also a real, unglamorous finding behind that
choice: a plain data file would have worked perfectly on a laptop and been **silently
missing from the deployed product**, which is precisely the kind of thing you want to
learn now rather than during a demo.

**We made sure the list can grow.** The specification asks for the ability to expand from
100 securities to 500 without a redesign. The way that promise usually gets broken is
someone writing "100" into the code as a constant that everything else quietly assumes. So
there is no such number anywhere. The count 101 appears in exactly one place in the entire
repository — a document — and every piece of software that needs it counts the list.

### Where this leaves the product

Think of Epic 2 as assembling the cast before filming starts. Earlier tasks built the
theatre (the database), agreed the vocabulary (what a "security" is, what a "sector" is),
and hung the rules on the walls. **This task cast the parts.**

What it unlocks, immediately and concretely:

- **The next task can load these into the database**, at which point the product has real
  subject matter for the first time.
- **After that, we can fetch real price history** — the market-data provider needs a list
  of symbols to ask for, and this is that list.
- **Then the first screen with actual content**: the market overview, showing these
  companies and how their industries are moving.
- **And the unusualness score**, which is the product's core idea and which is arithmetic
  over exactly this list.

Nothing is visible to a user yet, and that is expected — this story deliberately builds the
foundation in the order that makes each layer checkable on its own. But it is the last
piece of groundwork before the product starts having something to show. The next time
there is a status report, there should be a screen with these names on it.

One honest caveat, recorded rather than buried: **"heavily traded" is currently our
judgement, not a measurement.** These are all large, well-known US listings, so we are
confident — but the first time we can actually verify it against our data feed is the story
that connects to the market provider. If any name turns out to be too quiet to score, the
fix is one line in one file, which is exactly why the list is kept separate from everything
that consumes it.
