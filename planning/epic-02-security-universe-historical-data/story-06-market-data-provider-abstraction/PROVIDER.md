# The market-data seam — MarketPulse

**Task:** 2.6.1 — Settle where the seam lives, what provenance is attached to, and what
"adjusted" means, shipping nothing
**Date:** 2026-09-07
**Status:** decided; no module written, no dependency installed, no test added, tree
byte-identical outside `planning/`

This is Story 2.6's one document about **how market data enters this product and what it
has to say about itself**. It is to Story 2.6 what `CALENDAR.md` is to Story 2.5,
`UNIVERSE.md` to Story 2.3, `DATA-LAYER.md` to Story 2.2 and `HOSTING.md` to Story 1.11.
One document per subject; a second one about the same subject is a copy waiting to
disagree.

**Two later readers are written for by name.** Story 2.7 reads §7, §8 and §12 before
writing a line of Alpaca code. **Epic 3** reads §6 before adding a streaming provider to
this seam. If either has to re-derive a decision from the code, this document failed.

**Three downstream files are corrected below by argument rather than by assertion** — see
§13. The sharpest is Story 2.8's, whose scope currently says adjustment is "applied on
read", which requires corporate-action data that nothing in the plan acquires.

---

## The decisions, in one paragraph

**The seam is a split rather than a place**: the domain types and the provenance vocabulary
go in `packages/shared` because a chart axis and an ingestion job are on opposite sides of
the wire and must not hold two copies of them, while the provider **interface**, every
implementation and the error taxonomy stay in `apps/backend`, because the frontend has no
business knowing that a thing which makes vendor network calls exists. **Provenance is
per-series and the record names a list of sources rather than one**, because Story 2.8
stitches stored bars onto fresh ones and a single record becomes a lie at that moment — with
one sharp exception: sources may disagree about **feed** and are **refused** if they disagree
about **adjustment**, because two price scales in one array is not a series. **Bars are
stored raw and are never rewritten**, and adjusted prices are obtained by _asking the
provider for them_ rather than by computing them here — which removes the corporate-actions
table nobody has planned and leaves one named, dated gap instead of a silent one. **The
fixture corpus is generated from `market-session.ts` and seeded**, and the ordering problem
the task file raises dissolves once you notice there are **two corpora and they are different
things**: this story's produces domain types and never vendor JSON, so it has nothing
vendor-shaped to be wrong about; Story 2.7's records raw HTTP bodies to test its own mapping,
which is the only place a vendor's shape can be got wrong. **The fixture provider ships**,
selection is `MARKET_DATA_PROVIDER` configuration, and **its default is `none`** — not
`fixture` — because a deployment that forgets to configure a provider must serve nothing
rather than serve invented prices. **Epic 3 attaches as a sibling interface sharing these
types, not as a method on this one**, because a fetch has a deadline and a result where a
subscription has connection state, and folding them makes every historical provider carry a
`subscribe()` that throws. **No dependency is added**, and the answer was expected to be no.
**Seven failure causes, one of which the task's list did not contain and one of which it
named wrongly**: "no data for this range" is a **successful empty answer** and never an
error, and `bad-range` is struck in favour of `range-not-available`, because `TimeRange`'s
own constructor makes the call-site-defect reading unreachable.

---

## 1. Where the seam lives: a split, and the line is what the frontend may know

### 1.1 The decision

| Thing                                                                                       | Home               |
| ------------------------------------------------------------------------------------------- | ------------------ |
| `Bar`, `BarSeries`, `Timeframe`, `TimeRange`                                                | `packages/shared`  |
| `MarketFeed`, `ProviderId`, `Adjustment`, `SeriesProvenance`, `BarSource`, `SeriesCoverage` | `packages/shared`  |
| The feed → user-facing label and sentence table (§4.4)                                      | `packages/shared`  |
| `MarketDataProvider` — the interface                                                        | `apps/backend/src` |
| `BarsRequest`, `BarsResult`, the error taxonomy                                             | `apps/backend/src` |
| Every implementation, including the fixture provider                                        | `apps/backend/src` |
| The retry/rate-limit wrapper                                                                | `apps/backend/src` |

### 1.2 Why not all in one place, which is the cheap move

Story 1.12's rule is the test and it is applied honestly rather than as a slogan: **shared
means both sides depend on the same fact, not "shared is where types go".**

Applied here, the rule **cuts through the middle of this story**, and saying so is the
decision rather than a hedge:

- **The frontend genuinely needs `Bar`, `Timeframe` and the provenance record.** Story 2.12
  draws one and Story 2.14 renders the other, and Task 2.6.7 renders the feed vocabulary
  seven tasks from now. These are facts both halves depend on, in the same sense
  `market-session.ts` is — Story 2.8 asks which minutes should have bars and Story 2.12 asks
  where to draw a session boundary, and two copies of that answer is how they disagree.
- **The frontend has no business knowing there is such a thing as a provider.** A
  `MarketDataProvider` describes something that makes authenticated network calls to a
  vendor, holds a credential, and has a rate limit. Putting that interface in
  `packages/shared` puts it in the browser's type graph and invites a future author to
  implement one there — which is the exact failure §7.1's provider isolation and ADR 0006's
  credential boundary exist to prevent, arriving as a plausible-looking import.

**The line, stated so it can be applied without re-deriving it: the frontend may know the
NAME of a provider, because it renders it, and may not know the SHAPE of one.** That is why
`ProviderId` is shared and `MarketDataProvider` is not.

### 1.3 The rejected alternatives

- **All in `apps/backend`.** Rejected because Story 2.12's chart then needs its own `Bar`,
  and a wire contract described in two places is a wire contract that will disagree with
  itself — which is the sentence already written above `api-error.ts`'s export in
  `index.ts`, twice.
- **All in `packages/shared`.** Rejected on §1.2's second bullet, and note the cost is
  invisible until Epic 3: a streaming provider interface in the browser's type graph is
  where somebody eventually connects a browser to Alpaca directly, at which point the key is
  in the bundle. The cost of the split is one extra file boundary; the cost of not splitting
  is only ever paid once and is unrecoverable.

### 1.4 The two costs of `packages/shared`, stated rather than discovered

Both are already measured in this repository and neither is a reason not to do it:

- **It is consumed as built output**, so a change here means `pnpm build` before either app
  typechecks against it. `pnpm verify` orders this; a bare `tsc --noEmit` in an app passes
  against the previous shape.
- **It is inlined into the frontend bundle.** Task 2.3.8 measured the rule that governs
  this: a vocabulary declared as a plain `as const` literal is tree-shaken **completely**,
  and one built by _calling_ a function is not — `SECTOR_ETFS` cost 115 bytes to a page that
  never reads it, because eleven `toTicker()` calls are not provably side-effect-free. See
  §11 for the prediction this story owes Task 2.6.8, and for the one-line rule that makes it
  come true.

---

## 2. Provenance is per-series, and the record names a LIST of sources

### 2.1 The decision

```
BarSeries
  symbol       Ticker
  timeframe    Timeframe
  bars         readonly Bar[]        // ascending by startsAt, may be empty
  provenance   SeriesProvenance
  coverage     SeriesCoverage

SeriesProvenance
  adjustment   Adjustment                        // ONE value for the whole series
  sources      readonly [BarSource, ...BarSource[]]   // non-empty

BarSource
  provider     ProviderId    // "fixture" today; Story 2.7 adds its own member
  feed         MarketFeed    // "iex" | "sip" | "synthetic"
  retrievedAt  string        // ISO 8601 instant, UTC, with the Z
  barCount     number        // how many of `bars` came from this source

SeriesCoverage
  requested    TimeRange           // exactly what was asked for
  covered      TimeRange | null    // null when the series is empty
```

### 2.2 Why not one record, which is the cheapest thing

Because the case that breaks it is **not hypothetical and is scheduled**. Story 2.8's read
path stitches stored bars onto freshly fetched ones the moment a request runs past what the
store holds, and Story 2.13's time-window changes do it again. Work out what a single record
renders on a stitched series and the answer is: whichever half wrote it last, presented as a
statement about all of it.

The candidate that was live and lost: **one record, with the stitcher forbidden from
producing a mixed series.** Rejected because that is a rule nothing checks, of the third kind
`CLAUDE.md` already lists four of — and this one's failure is silent, produces a plausible
number, and is a false claim about data, which is §35's subject rather than a tidiness
complaint.

### 2.3 Why not per-bar, which is always truthful

Per-bar provenance is never wrong and it is not affordable, and the arithmetic is Story
2.8's own: ~100 securities × 390 minute bars × ~252 sessions is **~10 million rows per year**.
Four provenance fields on each is ten million copies of the string `iex`, in the table, in
every JSON response, and in every array the browser holds. Story 2.14 would render a
`provider` that is identical on every row.

**But note the half that IS per-bar and is already free**, because it changes what per-series
has to carry: `migrations/README.md` §4 makes `recorded_at` a mandatory column on every
table, so the store already knows per-row when each bar was written. So the honest statement
is that **the database has per-bar retrieval time by convention and the wire does not** — and
if anything ever genuinely needs per-bar attribution, it is a query against a column that
already exists rather than a change to this contract.

### 2.4 The one thing the sources may NOT disagree about, and it is refused rather than reported

A stitched series whose halves disagree about **feed** is truthful and reportable: two
sources, two `feed` values, and Story 2.14 says so. That is the whole reason `sources` is a
list.

A stitched series whose halves disagree about **adjustment** is **refused at construction**,
because it is not a series. Raw and split-adjusted prices for the same symbol are on two
different scales; an array holding both has a cliff in it that is an artefact of our own
stitching, and every percentage change computed across the seam is wrong. That is why
`adjustment` sits on `SeriesProvenance` and not on `BarSource`: **the type makes the
incoherent case unrepresentable rather than merely reportable.**

This is the concrete answer to Task 2.6.3's instruction to make the stitched case "either
truthful or refused": **feed is truthful, adjustment is refused**, and each has a reason
rather than sharing one.

### 2.5 Coverage lives on the series, not on the response envelope

Task 2.6.3 asks whether coverage belongs with provenance or with the response shape and says
either is defensible. It goes **on the series**, on the argument that made provenance not a
caption: a response envelope is a fact about one HTTP exchange, and a series outlives it —
the moment anything passes a `BarSeries` alone into a chart, a store or an anomaly
calculation, an envelope-level coverage field is gone and the partiality is silent.

Story 2.14's "we have data through 15:42" is then `coverage.covered.end`, computed by
whoever is making the claim, which is the same arrangement `securities-response.ts` chose
when it refused to carry a `count`.

**What coverage does NOT answer, stated so nobody assumes it does:** it says how far the
answer reaches, not whether it is dense. A thinly traded name on IEX with no print in a given
minute produces a covered range with holes in it, and telling that apart from a failed fetch
is **Story 2.8's gap handling**, which is where that acceptance criterion already lives. A
derived `complete: boolean` is deliberately absent for `securities-response.ts`'s reason: a
second copy of a fact whose only interesting behaviour is to disagree with the first.

---

## 3. Adjustment: stored raw, never rewritten, and adjusted series are ASKED FOR

### 3.1 The decision

- **The store holds raw bars.** Nothing ever rewrites a stored price because of a corporate
  action.
- **`Adjustment` is a required field on every provider request, with no default** —
  acceptance criterion 5 — with exactly two members: `raw` and `split-adjusted`.
- **An adjusted series is obtained by asking a provider for one**, not by computing it from
  stored raw bars.
- **The series says which it is**, in `SeriesProvenance.adjustment`, so a chart drawing a
  raw series through a split is able to say so.

### 3.2 Why store raw — and the argument is invariant 4, not tidiness

The task file names three shapes and the second is the trap. **Store adjusted, and a later
split silently rewrites history**: every bar written before the split is on a different scale
from every bar written after it, nothing in the row says which, and no query can tell them
apart afterwards because the adjustment factor was never stored beside the value. That is
irreversible in the strict sense — the information required to undo it was discarded at write
time.

The deciding argument, though, is **Epic 13**. Replay asks "what was knowable at 11:07", and
an adjusted price is a value **nobody could have seen at 11:07**, because the adjustment
encodes a split that had not happened yet. A replay serving adjusted prices is
future-information leakage arriving through a **number** rather than through a timestamp —
which the Kysely temporal plugin `DATA-LAYER.md` describes cannot catch, because the rows'
`observed_at` values are all correctly in the past. It is invariant 4 with no structural
enforcement available, which is precisely why it has to be a decision taken once, here, and
not a default somebody inherits in whichever task writes the first `INSERT`.

Story 2.8's scope has already reached the same conclusion independently and points at this
document for the argument. It has it.

### 3.3 Why NOT "adjust on read", which is the answer Story 2.8 currently assumes

"Store raw, adjust on read" is the textbook answer and Story 2.8's scope states it. **It
requires a corporate-actions table that nothing in the plan acquires** — not the bars
endpoint, not the universe loader, not Story 2.7's scope as written. Adopting it silently
means whoever writes Story 2.9's read path discovers mid-task that the adjustment factor is
not available, and either invents a table or quietly serves raw while the code claims
otherwise.

**The cheaper correct path, and it is the one thing in this section that nobody had noticed:
the vendor already does the adjustment.** Alpaca's bars endpoint takes `adjustment` as a
query parameter (§7). So an adjusted series is one request away and needs no corporate-action
data on our side at all. The store asks for `raw`; anything that wants a clean multi-year
chart asks a provider for `split-adjusted` directly.

**So V1 needs no corporate-actions table, and this is what makes the split-cliff gap
bounded rather than open-ended** — see §3.5.

### 3.4 Why two members, and why `dividend` is declined

Alpaca offers `raw`, `split`, `dividend`, `spin-off` and `all`. Our vocabulary is ours, and
each member needs a reader — `API_ERROR_CODES`' rule, one layer up.

- **`raw`** — read by Story 2.8's store and by Epic 13's replay. It is what happened.
- **`split-adjusted`** — read by Story 2.12's multi-year chart, and by **Epic 5**, which is
  the stronger reader: §11 computes return percentiles over ~60 trading days, and an
  unadjusted 10-for-1 split is a **−90% return** that would sit at the 100th percentile of
  every distribution it touches and produce a permanent, confident, entirely false anomaly.
- **`dividend`** — **declined, with a trigger.** A dividend gap is a real observed price
  move of typically well under 1%, it is not a cliff, and a dividend-adjusted price is not a
  price anybody saw. Nothing in V1 computes total return. The reversal trigger is the first
  reader that compares two securities' _total_ return rather than their price return.
- **`spin-off` / `all`** — declined; no reader, and `all` in particular is a vendor
  convenience that hides which adjustments were applied, which is the opposite of what the
  provenance record is for.

### 3.5 The consequence to write down, because it is the thing that will actually happen

**A series that spans no corporate action at all returns identical numbers in both modes** —
which is almost every series, almost all the time. So a wrong adjustment argument is
**invisible in testing and wrong exactly once**, on the one name and the one week somebody
is looking at. That is why criterion 5 forbids a default: there is no safe value, only a
value whose wrongness is deferred.

Task 2.6.6 therefore **must** include a fixture range spanning a corporate action, or nothing
in this story ever exercises the difference and criterion 5 is asserted by a type signature
that no test distinguishes.

### 3.6 The named gap: V1 reads raw, so a split draws a cliff

Story 2.9's V1 read path serves stored raw bars. A tracked security that splits inside the
stored window therefore charts with a step in it that is not a market event.

This is stated as a gap with a repair rather than hidden, and it is **bounded** because §3.3
removed the expensive repair from the critical path. Two repairs are available and neither is
built now:

1. **Fetch `split-adjusted` from the provider for display**, and stitch nothing — cheap, one
   request, needs no new table, and is the recommended first repair.
2. **A corporate-actions table**, which is the general answer and buys offline adjustment.

**The trigger is the first split inside the stored window**, which is a thing Story 2.8 can
check for once against the universe rather than wait to be surprised by — and it is
_likely_, not hypothetical, at any realistic history depth across ~86 large-cap equities.

**Until then the product is not lying**, and that is the point of §2: `provenance.adjustment`
reads `raw`, and Story 2.14 renders it. A visible step beside a label saying `raw` is an
honest chart. A visible step beside no label at all is §35's "hide data provenance".

---

## 4. The provenance vocabulary, and the words a person actually reads

### 4.1 `ProviderId` — ours, and it ships with ONE member

`PROVIDER_IDS = ["fixture"] as const`.

**Alpaca is deliberately absent, and this is forced rather than fastidious**: acceptance
criterion 1 is _"the interface and its types exist with no reference to any vendor, checked
by grep"_, and a `"alpaca"` string literal in `packages/shared` fails that grep in Task
2.6.8. **Story 2.7 adds its own member**, in the same commit as the client that produces it —
which is `SECURITY_STATUSES`' rule (`delisted` waits for the thing that can produce it) held
for the fourth time.

The reflex is to write both now. Do not.

### 4.2 `MarketFeed` — the invariant-6 field, and it is NOT the provider

`MARKET_FEEDS = ["iex", "sip", "synthetic"] as const`.

Provider and feed vary **independently** and conflating them is the mistake this field exists
to prevent: Alpaca serves IEX on the free tier and SIP on a paid one, so "which company sold
us this" and "which venues are in it" are two facts, and only the second is what §7.1 requires
us to display.

**`iex` and `sip` are not vendor names and do not fail criterion 1's grep.** IEX is an
exchange and SIP is the US consolidated tape; they are facts about the market that would be
true if Alpaca did not exist. Task 2.6.8's grep is for **the vendor**, and this sentence is
here so that grep does not produce a false positive somebody then "fixes".

`synthetic` is the fixture provider's, and §5.4 is why it matters.

### 4.3 `retrievedAt` — and the trap this repository has already fallen into once

An ISO 8601 UTC instant, stamped **at fetch** and **never re-stamped on read**.

Task 2.3.5 found the failure mode: `UNIVERSE_PROVENANCE.checkedOn` defaulting to `now()`
makes a provenance date always today, which makes it **permanently silent** — it can never
report staleness, which is the only thing it exists to do. The same trap is available here
and is one careless line away: a read path that stamps `retrievedAt` when it serves a stored
series turns "these bars were fetched three weeks ago" into "these bars are current".

It is `string` rather than `Date` for `securities-response.ts`'s stated reason: JSON has no
date type, and epoch milliseconds is a number nobody can read in a response body.

### 4.4 The words, decided here because Story 2.14 must not re-invent them

Task 2.6.3 is explicit that if Task 2.6.7 finds itself deriving a user-facing sentence from
three fields and a lookup table, this story under-delivered. So the table is part of the
vocabulary and lives beside `MARKET_FEEDS`:

| Feed        | Label             | Sentence                                                                      |
| ----------- | ----------------- | ----------------------------------------------------------------------------- |
| `iex`       | IEX               | Trades reported by the IEX exchange only — not the full US consolidated tape. |
| `sip`       | Consolidated tape | All US exchanges, via the consolidated tape.                                  |
| `synthetic` | Simulated         | Generated test data. Not a market feed.                                       |

**`Market feed: IEX` alone satisfies §7.1's letter and fails its intent**, and that is the
whole reason this table exists rather than a slug. §7.1's requirement is not that we print an
acronym — it is that we _"must not imply that IEX represents every US exchange"_, and a
reader who does not know what IEX is learns nothing from three letters. The sentence is the
requirement; the label is the affordance.

The sentence is rendered, not hidden in a `title` attribute — unreachable by keyboard and by
touch, rejected twice already (Tasks 1.4.5 and 1.12.4).

---

## 5. The fixture provider ships, and its default is `none`

### 5.1 The decision

- It is **`apps/backend/src`**, inside `apps/backend/package.json`'s `files` field, and
  therefore inside the container image.
- Which provider is active is **configuration**: `MARKET_DATA_PROVIDER`, a `readEnum`, in
  `CONFIG_VARIABLES`, in `apps/backend/.env.example`, covered by `pnpm env:check`.
- Members at the end of this story: **`none` and `fixture`**. Story 2.7 adds its own.
- **The default is `none`.**

### 5.2 Why it ships at all

The story's own words argue it: _"usable by tests **and by a developer with no Alpaca key**"_
and _"what makes Story 2.12's chart work on a laptop on a train"_. Both are real. The
charting decision in Story 2.12 is inherited by Epic 6's WebGL topology, Epic 8's comparison
charts and Epic 11's AI-opened charts, and it should not be taken while fighting a rate limit
or waiting for an account.

The alternative — test-only, beside a test file — costs that, and buys only the avoidance of
a configuration variable.

### 5.3 Why the default is `none` and emphatically not `fixture`

This is the safety decision and it is the one to resist "simplifying".

A backend serving fixture bars is serving **invented prices**, which is §35's _"manufacture
missing observations"_ verbatim. A default that quietly works is therefore a default that
quietly ships fabricated market data to whatever is pointed at it. Task 1.8.3's `CORS_ORIGIN`
note is the precedent and its lesson is exactly this: **a default that is convenient in
development is a decision about production, and it must be written down as one.**

So the loud default is `none`, meaning _no market-data provider is configured_, and the
backend serves no market data and says so. Two things fall out of that and both are good:

- **Deployed, `none` is what is set until Story 2.7**, because at the end of this story no
  vendor client exists. The configuration is therefore honest on day one rather than
  aspirational.
- **`none` is what gives Task 2.6.7 something true to say before Story 2.7 exists.** That
  task replaces a hard-coded `DISCONNECTED` in the header with the truth, and the truth
  today is _no provider configured_. That is a genuinely reachable default state rather than
  a contrived one, which is why the workshop can hold it as a story without inventing
  anything.

A developer opts into fixtures by writing one line in `apps/backend/.env`. That is a
deliberate act, which is the property being bought.

### 5.4 Why a fixture-backed screen can never be mistaken for a product

`SeriesProvenance` does the work, on its first consumer: a fixture series carries
`provider: "fixture"`, `feed: "synthetic"`, and §4.4's sentence is _"Generated test data. Not
a market feed."_ So a screenshot of a fixture-backed chart advertises itself in the chrome,
structurally, without anybody remembering to add a `SAMPLE DATA` banner.

That is Task 2.6.3's record earning its place before Story 2.14 renders it, and it is the
mechanism that makes §5.2's "laptop on a train" safe.

### 5.5 What Task 2.6.6 inherits from this

`env:check` fails all four ways it has been made to fail before, including on a drifted
default, so `MARKET_DATA_PROVIDER`'s `none` has to be stated in `.env.example` and in
`CONFIG_VARIABLES` and the two must agree.

---

## 6. The fixture corpus: generated, and there are TWO corpora

### 6.1 The ordering problem dissolves, and this is the finding

The task file states a genuine-looking ordering problem: criterion 2 needs fixtures, and the
vendor client that could record real ones is Story 2.7, which depends on this story.

**It dissolves once you notice there are two different corpora doing two different jobs:**

| Corpus       | Contains                       | Tests                             | Owner |
| ------------ | ------------------------------ | --------------------------------- | ----- |
| This story's | **Domain types** — `BarSeries` | Everything that consumes the seam | 2.6.6 |
| Story 2.7's  | **Raw HTTP response bodies**   | The vendor mapping, and only that | 2.7   |

**The fixture provider parses nothing.** It does not hold vendor JSON, it does not exercise a
mapping, and it therefore has nothing vendor-shaped it could be wrong about. The risk the
task file names — _"the fixtures encode our assumptions about the vendor's data rather than
the vendor's data"_ — is real, and it applies **entirely** to the mapping, which is Story
2.7's, which has a key.

So this story's corpus is not a stand-in for real data awaiting replacement. It is a
different artefact with a permanent job.

### 6.2 Generated, not hand-authored

Of the task file's three candidates: **generated from `market-session.ts`, deterministically
seeded.**

- **A bar count is derived, never written.** Task 2.6.6 requires 390 and 210 to come from
  `market-session.ts`'s `minuteBars` rather than being typed out, and a generator gets that
  for free where a hand-authored corpus has the number in it in as many places as there are
  fixtures. A hard-coded 390 dies on a half day, and the whole reason Story 2.5 exists is
  that this question has a principled answer.
- **It cannot invent realism, and that is a feature.** §35 forbids manufacturing
  observations; a corpus of plausible-looking hand-written NVDA prices is exactly that, and
  it is the thing most likely to end up in a screenshot.
- **Hand-authoring buys nothing against the stated risk.** Hand-written numbers encode our
  assumptions just as thoroughly as generated ones, and cost more to maintain. Choose the
  cheaper honest one.

**Deferring fixtures to Story 2.7** is rejected on sight, as the task file anticipated: it
makes criteria 2, 4 and 6 unmeetable inside this story, which is three of six.

### 6.3 Determinism, and the one thing that would break it

The same request must produce the same series byte for byte, on every machine and every run.
Two hazards, both made structurally impossible rather than avoided by discipline:

- **Reading the wall clock.** `packages/shared` already cannot — the `Date.now()` and
  zero-argument `new Date()` lint rules over `packages/shared/src` have **no exception**
  (Task 2.5.5). The fixture provider lives in `apps/backend`, where that rule does not
  apply, so it must take every instant from its input.
- **`retrievedAt` in particular.** A provenance record stamped `now()` is not byte-identical
  across runs, so **the fixture corpus declares its own `retrievedAt` as a fixed instant.**
  That also makes it obviously not live, which §5.4 wants anyway.
- **An unseeded generator.** If bars are generated rather than recorded, the seed is part of
  the corpus and is written down.

### 6.4 What Story 2.7 owes, recorded in Story 2.7's own file rather than hoped for here

Not "re-record this corpus" — §6.1 shows that is the wrong instruction. What Story 2.7 owes
is **a reconciliation of the generator's assumptions against one real series**, and three
specific numbers, because each of them is an assumption this story is making and cannot
check:

1. **Does a full regular session actually yield 390 IEX minute bars for a liquid name?**
   Probably not — IEX is one venue, not the tape. If it does not, `minuteBars` is the count
   of minutes in a session and **not** the count of bars to expect, and Story 2.8's gap
   handling is sized against the difference.
2. **How often does a minute have no bar for a thin name?** This is the number that decides
   whether an absent bar is ordinary or worth an alert.
3. **Which end of the interval does the vendor's `t` mark?** §9.2.

This obligation is now written into `story-07-.../STORY.md` as a scope bullet, not left here
as a hope.

---

## 7. The vendor's shape — THEIRS, not ours

Read for shape rather than for adoption, so that Task 2.6.2's instruction to _"resist copying
the vendor's field set"_ is a decision taken against a known list. Read from Alpaca's
reference documentation on **2026-09-07**; nothing was installed and no request was made.

**Bar object fields (Alpaca's):** `t` (timestamp), `o` (open), `h` (high), `l` (low),
`c` (close), `v` (volume), `n` (trade count), `vw` (volume-weighted average price).

**Response envelope (Alpaca's):** `bars`, `next_page_token`, `currency`.

**Query parameters (Alpaca's):** `symbols`, `timeframe` (`[1-59]Min`, `[1-23]Hour`, `1Day`,
`1Week`, `[1,2,3,4,6,12]Month`), `start`, `end` (RFC-3339 or `YYYY-MM-DD`), `limit` (1–10,000,
default 1,000), `adjustment` (`raw`, `split`, `dividend`, `spin-off`, `all`, or
comma-separated), `asof`, `feed` (`sip`, `iex`, `boats`, `otc`), `currency`, `page_token`,
`sort` (`asc`/`desc`).

**Plan facts (Basic/free), documented rather than measured — Story 2.7 measures them:**
IEX feed for equities; **200 requests/min** on the historical API; history **since 2016**;
recent data withheld to **the latest 15 minutes**.

**What we take from this list and what we leave:** see §9.1 for the field set and §9.4 for
timeframes. Two observations worth carrying forward now:

- **`adjustment` is a server-side parameter**, which is what makes §3.3's decision possible
  at all.
- **The 15-minute withholding is not an error condition** and must not map onto one. A range
  ending inside the last fifteen minutes returns fewer bars than asked for — which is
  `SeriesCoverage` doing its job, and is the second concrete reader for §2.5 after a market
  holiday.

---

## 8. The error causes, decided — seven, one renamed and one struck

### 8.1 The list Task 2.6.5 implements

| Cause                  | Retryable | What a caller does differently                                         |
| ---------------------- | --------- | ---------------------------------------------------------------------- |
| `unknown-symbol`       | no        | Renders it as an **answer**, not a failure (Story 2.14)                |
| `range-not-available`  | no        | Narrows the range; the vendor will never serve this one                |
| `rate-limited`         | **yes**   | Backs off, and this is the only member carrying a hint about when      |
| `unauthorised`         | no        | A configuration fault. Retrying is a loop against a wall               |
| `upstream-unavailable` | **yes**   | Backs off; the vendor is down or unreachable                           |
| `timeout`              | **yes**   | Backs off — **or raises the deadline**, which none of the others allow |
| `aborted`              | n/a       | **Nothing.** Not a fact about the world at all                         |

Plus the success member carrying a `BarSeries`. Eight outcomes, which is one more than
`api-client.ts`'s seven and for the same reasons.

### 8.2 "No data for this range" is NOT an error — the decision the list does not contain

A symbol that exists, a range that is valid, and a market that was shut is a **successful
empty answer**: `bars: []`, `coverage.covered: null`. So is a thinly traded name on IEX with
no prints in the requested minutes.

Treating it as a failure is how Story 2.12 shows a **failure screen on a public holiday**,
and Story 2.5 exists precisely so this question has a principled answer rather than an
accidental one — `marketSessionOn` already returns a session or does not, and the calendar
already refuses rather than guessing. This answer is written here because Story 2.12 will
read it, and it is the single most likely thing to be got wrong by whoever writes the first
`if (bars.length === 0)`.

### 8.3 `bad-range` is struck, and `range-not-available` replaces it

The story's list names `bad-range` and the task file describes it as _"ours, a defect at the
call site rather than a fact about the market"`. Both halves of that cannot be true at once,
and resolving it removes a member and adds a better one:

- **A structurally invalid range** — end before start, or zero-width — never reaches a
  provider, because Task 2.6.2 makes `TimeRange`'s constructor refuse it naming both ends
  (following `marketSessionsBetween`, which already refuses a reversed range rather than
  answering with an empty array that hides the swap). So the call-site-defect version is
  **unreachable by construction** and does not need a union member.
- **What remains is a range this provider will not serve**: before its history depth,
  entirely in the future, or larger than it permits. That is a fact about the world — this
  vendor's limits — and it is a result member.

The rename is not cosmetic: `bad-range` invites the reading the type system has already
eliminated, and a member whose name lies about whose fault it is gets handled wrongly.

### 8.4 `timeout` and `aborted` are separate members, and `api-client.ts` is the precedent

- **`timeout`** — the deadline expired and nothing arrived. Kept apart from
  `upstream-unavailable` because it is the only outcome that is a joint fact about the vendor
  **and our own deadline**: "we gave up after N ms" admits a repair — raise N — that "they
  are down" does not.
- **`aborted`** — the **caller** tore down. This is not a fact about the backend or the
  vendor at all; it is a superseded request or an unmounted effect. Task 1.12.3 found the
  payoff: mapping `aborted` to no state at all is what closed the "resolved after unmount"
  bug at the one place it can be closed. Any consumer here inherits the same obligation:
  **never render an `aborted` as a market-data state.**

### 8.5 The line between a result and a throw, as a sentence somebody can apply

> **A cause is a union member when it is a fact about the world. It is a thrown defect when
> it is a fact about our code.**

A rate limit is the world. A mapping function that received a shape it did not expect is us
— and laundering that into a tidy `upstream-unavailable` is how a permanent break wears the
costume of a transient one and becomes an invisible degradation nobody investigates.

Two consequences:

- **The promise not rejecting is a property of correct code, not of the type.** Task 2.6.4's
  "a call that cannot throw" means _no modelled failure throws_; it does not mean the
  function is wrapped in a `try` that swallows bugs. Do not add one.
- **Story 2.8's backfill must let a defect propagate** rather than counting it as a failed
  symbol, or a vendor shape change presents as a hundred symbols mysteriously having no data.

### 8.6 What a cause may carry, and what it must never

**May:** the symbol, the requested range, and — on `rate-limited` alone — a retry hint.

**Must not:** the vendor's response body, the vendor's message, or an opaque `cause: unknown`.

The reason is measured rather than principled. Task 1.7.4 found Fastify's default 500 passing
the thrown message straight through, answering a request with
`connection to postgres at 10.0.0.4:5432 refused`. **A message written for a developer is
internal detail too, and it is the half that looks harmless.**

The detail goes **to the log**, at the provider, under the request's correlation id — which
is `errors.ts`'s arrangement and the one Task 2.1.7 already reused for
`/diagnostics/database`, where the body says _whether_ and the log says _why_ and
`x-request-id` makes it one investigation.

Note also the trap Task 2.1.7 found next door and that anything reaching a response inherits:
`fast-json-stringify` strips a property the schema does not declare, so **a green leak test
is not evidence that a handler could not leak** — the schema is what holds it shut, and a
leak test has to be made to fail by adding the field to the schema too.

### 8.7 Every member is producible against a fixture — checked, since an unproducible one is a guess

| Cause                  | How the fixture produces it                                |
| ---------------------- | ---------------------------------------------------------- |
| `unknown-symbol`       | A ticker not in the corpus                                 |
| `range-not-available`  | A range outside the corpus's declared coverage window      |
| `rate-limited`         | A corpus entry flagged rate-limited                        |
| `unauthorised`         | A corpus entry flagged unauthorised                        |
| `upstream-unavailable` | A corpus entry flagged unavailable                         |
| `timeout`              | A corpus entry with a delay, against a short test deadline |
| `aborted`              | The test aborts its own signal                             |

**The mechanism is the corpus, never a `simulateError` parameter on the interface** — that is
a test concern leaking into a shipped type, the shape Task 1.10.5 refused when it declined to
widen `config.ts`'s port range for a test's convenience.

### 8.8 The retry policy lives in a WRAPPER, and pacing does not live with it

**Task 2.6.5 owns the final call on this** — its brief assigns it there — so what follows is a
recommendation with the arguments already made rather than a decision taken over its head.
It is recorded here because it belongs beside §8.1's retryable column, which is its input.
Confirm it or overturn it with a reason; do not re-derive it.

Three candidates, and the middle one wins:

- **Inside each provider implementation** — rejected. It makes the caller's deadline a lie,
  and every future provider re-implements it slightly differently.
- **A wrapper implementing the same interface**, composed around a provider — **chosen.** It
  is testable against the fixture provider with **no network at all**, it is replaceable, and
  it keeps a provider a thing that makes exactly one attempt, which is what makes a
  fixture-backed test mean something.
- **At the call site** — rejected for retry, and **right for pacing**. Which brings the
  distinction that matters:

> **Per-request retry is the wrapper's. Cross-request pacing across a hundred symbols is
> Story 2.8's backfill.** Conflating them is how a backfill ends up retrying a whole batch.

Three constraints, written here so they are not rediscovered:

1. **Only retryable causes are retried** — the `Retryable` column in §8.1 is the source, and
   a retry on `unauthorised` is a loop against a wall.
2. **A retry must not outlive the caller's deadline or its abort signal.** The wrapper
   receives both and is bounded by them; it does not get its own budget.
3. **A retry policy plus a rate limit is a queue**, a queue has a depth, and an unbounded one
   is a memory leak wearing a politeness costume.

**No numbers here.** Story 2.7 measures them against the documented 200/min.

---

## 9. The types, settled far enough that Task 2.6.2 has nothing left to guess

**Some of this section is Task 2.6.2's brief to decide, and it is taken here on purpose.**
§9.4's aggregation answer turns on readers in Epic 5 and Epic 13, and §9.5's numeric answer
turns on which V1 calculation actually accumulates — both of which had to be worked out to
answer §2 and §3 anyway. Deciding them beside the provenance record keeps **one** document
rather than two that will disagree, which is the whole reason this file exists. Task 2.6.2
implements these and may overturn any of them **with a reason recorded here**, which is the
same latitude §8.8 leaves Task 2.6.5.

### 9.1 `Bar` — six fields, and the two that were declined have triggers

`open`, `high`, `low`, `close`, `volume`, `startsAt`. Nothing else.

- **`vw` (VWAP) — declined.** The tempting reader is Epic 5's volume work, and _"Epic 5 might
  want it"_ is not a reader. Leaving it out costs one migration later; putting it in costs a
  column on ~10 million rows and a value nothing validates. Trigger: a named calculation in a
  story that exists.
- **`n` (trade count) — declined.** The interesting-sounding reader is telling "no trades"
  apart from "no data", and it does not work: a bar exists _because_ trades happened, so `n`
  is never 0 on a bar that is present, and the absent case is exactly the one it cannot speak
  to. That question is `SeriesCoverage` plus Story 2.8's gap handling.

**`symbol` and `timeframe` are on the SERIES, not on the bar.** A bar carrying either is ten
million copies of a constant, in the table and on the wire.

### 9.2 The timestamp: `startsAt`, and the field NAME is the mechanism

Both conventions exist in the wild — a bar labelled 09:30 may cover 09:30–09:31 or
09:29–09:30 — and a one-minute systematic error is **invisible on a chart and wrong in every
anomaly calculation**, so it must not be discoverable only by inspection.

The cheap structural fix is the name: **the field is `startsAt`, never `timestamp`.** A
mapping that gets it backwards then reads as an obvious contradiction in Story 2.7's own code
rather than as a plausible assignment. §6.4 makes confirming Alpaca's convention against a
real response an obligation on Story 2.7, and it is one of the three numbers listed there.

Everything else follows `CALENDAR.md` §5 and is not re-decided: storage is `timestamptz`, the
wire is a UTC ISO 8601 instant with the `Z`, `America/New_York` exists only at the moment of
display, and exactly one module converts — enforced since Task 2.5.2 by two
`no-restricted-syntax` rules. A market **date** is a separate wire type, a plain
`"2026-09-04"`, never an instant at midnight.

### 9.3 `TimeRange` — a type, half-open, and refusing rather than answering emptily

Two arguments can be swapped at a call site and nothing notices, so it is one type.

**Half-open, `[start, end)`.** That is what makes adjacent windows tile without a duplicated
bar at the seam, which Story 2.8's backfill does thousands of times — and a duplicated bar at
a seam is a real corruption, not a cosmetic one, because the unique constraint would reject
it and the backfill would report a failure that is actually correct behaviour.

A reversed or zero-width range is **refused naming both ends**, following
`marketSessionsBetween`, and this is what makes §8.3's struck member unreachable. Note the
consequence for Story 2.7's mapping: Alpaca's `end` is not half-open, so the reconciliation is
the client's and must be stated there.

### 9.4 `Timeframe` — two members, and aggregation is NOT expressible

`TIMEFRAMES = ["1m", "1d"] as const`. Our vocabulary, not `1Min`/`1Day`, so a typo is a
compile error and the fixture provider and Story 2.7's client are checked against the same
set — `SECURITY_KINDS`' argument.

- **`1m`** — Story 2.8's ingestion, Epic 5's five-minute returns, Epic 13's replay.
- **`1d`** — a multi-month chart, which at daily resolution is ~500 rows against ~200,000,
  and Epic 5's 60-trading-day baseline. **The second reason is the stronger one and is easy
  to miss:** a vendor's daily bar is the official session OHLC including auction prints,
  which IEX minute bars may simply not contain, so a daily bar derived from our minute bars
  would be a _different and worse number_ rather than the same one computed twice.

**Aggregation is not expressible, and that is the decision rather than an omission.** A
caller cannot ask for 5-minute bars. §11's five-minute returns are computed **by Epic 5 from
stored minute bars**, for two reasons: Epic 13's replay has to reconstruct them as-of a past
instant from what was stored anyway, so a provider-side aggregate would be a second source of
truth that replay could not use; and provider-side and our-side aggregation disagree at a
session boundary, which is exactly where a half day makes the disagreement largest.

Anything beyond these two needs a named reader.

### 9.5 The numeric type: `number` on the domain type and on the wire

`migrations/README.md` already fixed the storage half and it does not move: money is
**`numeric(18,6)`** in Postgres, never a float, because float addition is not associative —
`sum()` over `[1e16, 1.0, -1e16]` returns 0 or 1 depending on order, measured — so a
percentage change can disagree with itself between two renders because a query plan changed
the aggregation order.

The consequence is that **`pg` hands JavaScript a `numeric` as a `string`**, deliberately.
So the domain type has to choose, and the choice is `number`, on four arguments:

1. **A single price is not lossy in a double.** At scale 6, exact representation holds to
   ~9×10⁹ — four orders of magnitude beyond any equity price. The value is exact; only
   **accumulation** is not.
2. **Nothing in V1 accumulates prices.** §11's four calculations are a return (division), a
   percentile (ordering), a volume ratio (division of integers) and breadth (counting). The
   one thing that _is_ summed is **volume**, which is an integer and exact in a double to
   2^53 ≈ 9×10¹⁵ against daily volumes around 10⁹.
3. **`string` pushes a parse into every consumer and buys nothing.** A chart axis cannot draw
   a string, so the parse happens regardless; the only question is whether it is explicit at
   twenty call sites or implicit in `JSON.parse` at one. The first thing anybody would write
   is a `Number(x)` helper, at which point there is the same double with an extra step and a
   false sense of safety.
4. **A branded number is friction without a guarantee.** `Ticker`'s brand works because a
   ticker is never arithmetic; a `Price` you must unwrap to add is a nuisance that stops
   nothing.

**The guard, stated as a rule because nothing checks it, and it goes on the list of the third
kind:**

> **An aggregate over prices is computed in SQL over `numeric`, never in JavaScript over the
> domain type.**

That is not a workaround — it is what the database is for, and `numeric(18,6)` was chosen
precisely so the exact computation is available where it is needed. The reversal trigger is a
moving average or any other price aggregate that genuinely has to run in the browser; at that
point the honest answer is a `string` on the wire and a decimal library, and it is a bigger
decision than this one.

**The conversion happens once, in the mapper beside the query** — `toSecurity`'s precedent,
one function per domain type and never a generic mapper.

---

## 10. The dependency question: none, and the answer was expected to be no

No package is added by this story. Nothing was installed, so nothing was reverted. Three
candidates and why each is unnecessary:

- **An HTTP client.** Node 24 ships `fetch`, `apps/frontend/src/api-client.ts` already
  demonstrates the deadline-and-abort pattern this seam reuses, and in any case the first
  HTTP call in this project's backend is **Story 2.7's**, not this story's.
- **A validation library.** Story 1.6 installed Zod 4.5.4 and Valibot 1.4.2 to full parity
  and threw both away; nothing about a `BarSeries` changes that argument, and this story
  validates a shape we construct rather than one that arrives.
- **A date library.** `CALENDAR.md` §6 measured it: `Temporal` is unflagged in Chrome 148 and
  **flagged in Node 24**, luxon is +262 kB to the frontend bundle, and `@date-fns/tz` is a
  wrapper over the `Intl.DateTimeFormat` call we already make. Nothing here needs a new
  conversion; `market-time.ts` performs them all and is the only module permitted to.

If a later task in this story proposes one, cost it the way Task 2.2.1 costed Kysely — store
entries, KB, lockfile lines, install-script sweep, from a **fresh install** — then revert.

---

## 11. The bundle prediction, for Task 2.6.8 to measure

Task 2.3.8's rule is the mechanism and it is the thing to test against: `packages/shared` is
inlined into the frontend bundle, a vocabulary declared as a plain `as const` literal is
tree-shaken **completely**, and one built by _calling a function_ is not — `SECTOR_ETFS`
cost 115 bytes to a page that never reads it, because eleven `toTicker()` calls are not
provably side-effect-free.

**The prediction, in two halves:**

1. **Tasks 2.6.2 to 2.6.6 move the frontend artefact by ZERO bytes.** Everything they add to
   `packages/shared` is either type-only (erased) or a plain literal array no frontend module
   imports (tree-shaken). This is a **check rather than a forecast**: if the artefact moves
   at all before Task 2.6.7, something has been declared through a constructor call and
   should be found and fixed, not accepted.
2. **Task 2.6.7 moves it by a small positive amount**, and that movement is _the feature_ —
   §4.4's three labels and three sentences plus the component that renders them. Order of a
   few hundred bytes of strings plus the component and its stylesheet. There is no useful
   tighter prediction than that, and a wrong prediction there is not a defect.

**The one-line rule that makes half 1 come true, and it applies to every file this story
adds to `packages/shared`:** no module-scope value is built by calling a function. Declare
literals; if something must be constructed, construct it lazily on first use, which is what
`market-time.ts`'s memoised formatters already do and for exactly this reason.

---

## 12. How Epic 3 attaches: a sibling interface, not a method on this one

Epic 3 adds live streaming and the story requires it to be an **addition** to this
abstraction rather than a replacement. The sketch, so Epic 3 does not have to argue with a
design that assumed request/response was the only mode:

**`MarketDataStream` is a second interface in `apps/backend/src`, beside `MarketDataProvider`
and sharing every domain type in `packages/shared`.** Not a `subscribe()` method on this one,
and not a widened single interface.

Three arguments:

1. **The lifecycles are genuinely different.** A fetch is a request with a deadline, an abort
   signal and a result. A subscription is long-lived, has connection state, backpressure and
   reconnection, and its failure vocabulary is `FeedStatus` — `live | stale | disconnected`,
   which already exists in `packages/shared` and is about a **connection**. Task 2.6.7
   refuses to widen `FeedStatus` into a provenance vocabulary for the same reason, one layer
   up; this is the same split one layer down.
2. **A single interface forces every implementation to carry both.** The fixture provider
   would have to fake a stream, and Story 2.7's historical client would ship a `subscribe()`
   throwing "not implemented" — which Task 2.6.6 forbids in as many words ("no method left
   throwing").
3. **What they share is the data and its provenance, not their shape.** A streamed bar is a
   `Bar`; the source it arrives from is a `BarSource` with the same `provider` and `feed`
   vocabulary; §4.4's sentence renders identically. That is the whole of the coupling and it
   is the part worth sharing.

**Composition remains available and is not required**: one vendor may implement both on one
object (`class AlpacaProvider implements MarketDataProvider, MarketDataStream`) when it
happens to make sense.

**And the configuration follows**: `MARKET_DATA_PROVIDER`'s id vocabulary is shared between
the two, so a deployment names a vendor once rather than twice. Epic 3 does not add a second
variable.

---

## 13. Corrections to downstream files

Task 2.5.1 corrected two downstream task files by measurement and both would otherwise have
shipped red tests. Three corrections fall out of this one, and they are recorded rather than
silently applied to the code later:

1. **Story 2.8's scope says bars are stored unadjusted and "adjustment is applied on read".**
   The first half is confirmed with a stronger argument than it had (§3.2). **The second half
   is not achievable as written**: adjusting on read requires corporate-action data that
   nothing in the plan acquires. §3.3 replaces it — an adjusted series is _requested from a
   provider_, and V1's read path serves raw and says so. This is a correction to a scope
   bullet rather than to a decision, and it makes Story 2.8 cheaper rather than harder.
2. **The story's error list names `bad-range`**, which §8.3 strikes in favour of
   `range-not-available` because `TimeRange`'s constructor makes the other reading
   unreachable. Task 2.6.5 implements seven causes, not five, and Task 2.6.8's criterion-4
   count should be checked against §8.1 rather than against the story's prose.
3. **Story 2.7 gains a scope bullet**, not a hope: reconcile the fixture generator's three
   assumptions against one real series (§6.4). Written into that file in this change.

---

## What this task deliberately did not decide

- **Where Task 2.6.7 reads the value from.** The task file names three candidate homes —
  `/health` (excluded outright: Task 2.1.7 settled that it says nothing about dependencies,
  and it has five readers and three platform probes), a field on `/securities`, or a small
  endpoint of its own. The **configuration** is decided here (§5.1) because Task 2.6.6
  depends on it; the **transport** is 2.6.7's, and the recommendation is the small endpoint,
  pre-empting Story 2.9 explicitly and recording the pre-emption in Story 2.9's file the way
  Story 2.4's pre-emptions were recorded.
- **The retry and rate-limit numbers.** Story 2.7 measures them against the documented
  200/min.
- **The deadline's value.** Task 2.6.4 chooses it. What is decided here is the coupled pair
  it belongs to, and it is the first one in this repository that **spans the wire**: any
  deadline used behind a Story 2.9 route must sit strictly below the frontend's
  `API_TIMEOUT_MS` (5 s) minus a round trip, or the browser gives up first and the backend's
  patience is unobservable. The backfill is not behind a route and may want longer, so the
  deadline is a per-request parameter with a default rather than one constant. **Unlike the
  three existing pairs, this one is not assertable in a test**, because the two numbers are
  in `apps/frontend` and `apps/backend` with no shared module between them — so it is prose,
  owned by Story 2.9, and moving `API_TIMEOUT_MS` into `packages/shared` to make it checkable
  is a change to shipped code for a test's convenience and is declined for Task 1.10.5's
  reason.
- **Whether daily bars are stored or derived.** §9.4 gives the argument that they should be
  fetched rather than derived; whether they are also _stored_ is Story 2.8's open decision 3.
- **Anything about corporate actions as data.** §3.6 names the gap, the trigger and two
  repairs, and builds neither — a mechanism built against no instance is one nobody can test,
  which is the rule Story 2.7 already applies to the ticker rename.

---

## The tree is byte-identical

No dependency was installed and none was reverted, because none was proposed past the
argument in §10. No module was written, no test added, no script added, no `verify` step
added. Nothing outside `planning/` changed.

`pnpm verify` exit 0, and `git status` clean outside `planning/` — the check rather than a
formality, because this is the task in the story most likely to "just try something" against
a candidate library and leave a stray dependency behind. Task 2.5.1 installed three date
libraries here and reverted all three.
