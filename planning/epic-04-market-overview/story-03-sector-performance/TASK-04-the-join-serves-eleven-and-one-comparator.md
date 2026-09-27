# Task 4.3.4 — The join serves eleven sectors, and the ranking has one home

**Status:** **Complete — 2026-09-27. Eleven sector figures ride a new `overview.sectors` key in rank order, one comparator in `packages/shared` with no `?? 0` anywhere, the ratchet server-side so every reader shares one scale — and the new invariant PASSED GREEN on the exact defect it forbids until the clause was widened from a quoted ticker to a word.**
**Story:** [4.3 Sector Performance, & the Benchmark That Is Not an Average](STORY.md)
**Depends on:** nothing — runs beside the drawing

## Objective

**Eleven more callers of a seam that already works, plus the two things that
make a ranking honest: one comparator, and a basis that exists outside a
session.**

## What the user can see when this lands

**Nothing.** The frame carries eleven sector figures and nothing renders them.
Task 4.3.5 is the payoff.

## Work

- **`sectorEtfTickers()`** beside `indexProxyTickers()` in `universe.ts` —
  `kind === "sector_etf"` through `trackedSecurities`, ordered from `SECTORS`. A
  second literal list of eleven tickers is the defect the existing docblock
  argues against at length.
- **`overview.sectors`, a NEW key** carrying the same `observed | stored |
unknown` union, **in rank order**. Never appended to `figures` and never
  renaming it — both reasons are recorded in `STORY.md` and both are silent
  failures.
- **Extend the join so a `stored` figure carries the last completed session's
  close-to-close move**, labelled as such — the owner's Gate 1 decision, and the
  only way AC 1 can pass. `WireStoredFigure` gains the move and its basis; the
  arithmetic stays `changeFromClose` in `packages/shared`, called once.
- **One comparator, in `packages/shared`.** 4.5 ranks server-side because a
  top-N in a browser means shipping the 518-figure input; so a browser-only
  comparator cannot be the rule, and adopting one at eleven sets exactly the
  precedent the story is told not to set. ADR 0038 decision 2 is the precedent
  for what happens when a shared computation starts in one package.
- **The comparator's real content**, which is why it must not be duplicated: a
  figure with **no change has no ranking key at all**, and `?? 0` would put a
  sector we have not heard from among the genuinely flat ones — ADR 0029's false
  impression, as a **rank position**, which is a new shape of it. Handle the
  absent key by an explicit rule, and **never with a default**.
- **Ties break on the declared `SECTORS` order** — already the product's order
  for this set — and **two figures equal at display precision do not swap**,
  which is a stable sort against the order on screen rather than against a
  declared one.
- **The inverse map, derived.** `SECTOR_ETFS` is `Record<Sector, Ticker>`; the
  frame carries `symbol`. Derive ticker → sector **once**, from that record. A
  hand-written inverse is where a **permutation** comes from.

## Constraints handed to this task

- **`one-producer-of-the-overview-aggregate` permits exactly one call site.**
  One call with `[...indexProxyTickers(), ...sectorEtfTickers()]`, then split the
  returned entries **by membership rather than by a slice** — a fifth index proxy
  would silently shift a boundary. The invariant stays at one and its `claim` is
  unchanged; if two calls prove unavoidable that is a deliberate change plus a
  re-run of `pnpm break a-second-overview-aggregate`, whose substitution is the
  weak 1→2 signal and would pass silently under a widened bound.
- **`one-home-for-the-live-change`'s third clause is _any division whose
  denominator is a close_, and the wiring-site exemption does not cover a
  comparator.** A ranking that recomputes a percentage goes red, deservedly. Rank
  on the figure that arrived.
- **ADR 0031: every nested object needs its own field map**, and a non-finite
  number is the **serialiser's** problem — optional omitted, required drops the
  whole figure. A bare array of an already-mapped union adds no new obligation;
  wrapping it in an object does, so do not wrap it.
- **The section is optional on the READ side too.** The deploy rolls the backend
  first, but a rollback pins a previous image, so a new bundle can legitimately
  meet an old gateway.
- **`toWire` walks the map's keys**, so a key present in the map is emitted
  whatever it holds — which is what makes a leak unrepresentable and also what
  makes an omitted field unrepresentable. Build the section outside the map and
  spread it in two branches, as `encodeFigure` already does.
- **Extract the figure-array encoder.** `overviewFields.figures` holds the
  non-finite drop rule inline; copying that closure for `sectors` gives one rule
  two homes and the second is the one that gets forgotten.
- **Nothing changes upstream, and nothing changes in the closes cache.**
  `STREAM_SYMBOLS` already covers all 518 and the cache already reads the whole
  store, so the eleven sector ETFs are **already observed and already held**. No
  new subscription, no provider request, no quota.

## Done when

1. `overview.sectors` carries eleven figures in rank order, and `figures` still
   carries exactly the four proxies — asserted, because the existing browser spec
   asserts that set and must stay green
2. A stored figure carries the last completed session's move with its basis, and
   a session with no prior close produces an **absence** rather than a zero
3. One comparator, in `packages/shared`, with the absent-key rule explicit and
   tested for every mixed-state combination including all-eleven-`unknown`
4. The ticker → sector map is derived from `SECTOR_ETFS`, and a second literal
   pairing fails a check
5. `one-producer-of-the-overview-aggregate` still reports one call site, and its
   break has been re-run

## Amended by Task 4.3.2 — 2026-09-27: the ladder's step resets at the opening bell, and that is a decision about state rather than about drawing

**The owner took it on 2026-09-27 and it lands in your code, not on the canvas.**
The bar's scale is a **stepped ladder** — `±1 / ±2 / ±5 / ±10%`, the smallest step
containing all eleven figures — and it **steps outward only within a session**, so
eleven bars never rescale on a tick. The question the drawing could not answer is
what happens overnight, and the answer is: **the step resets at the bell.**

**Why**, in the owner's own terms: a step that survived the night would open every
quiet Tuesday on the previous Friday's rotation scale — **eleven stubs against a
printed ±5%**, a picture that says _nothing is happening_ using the room it takes
to say _a lot could_. The accepted cost is **one visible step-out somewhere in the
first half hour of a heavy day**, which is a change a reader can see the reason
for. Rejected: carrying the step, which would make the region comparable across
days — and **nothing else on this screen is**, so it would be the first.

**Reversal trigger**, a condition rather than a story: _the first reader who asks
whether today's bars are drawn at the same scale as yesterday's_ — which is the
comparison the reset gives up, and the only one it costs.

**What that means for what you build.** The step is **derived from a session**, so
it is state with a lifetime and a key rather than a pure function of the figures:
two frames in the same session may produce different steps and the later one may
not be smaller, while the first frame of a new session starts again at the
smallest step that fits. **Do not let it be a `Math.max` over the frame** — that
is the frame-max normalisation the drawing rejects on two grounds, and it would
rescale all eleven bars every minute. Whether the ratchet lives in the join, on
the wire or in the browser is yours to decide with the frame-grain decision Task
4.3.3 owns; **whichever you choose, the session boundary has to be the reset and
the market calendar is what knows where one is** (`packages/shared/src/market-calendar.ts`,
reached through `market-time.ts`, which is the only module allowed to convert).

## Amended by Task 4.3.3 — 2026-09-27: where the ladder's ratchet lives is YOURS, because 4.3.3 did not decide it

**The amendment above defers the ratchet's home to "the frame-grain decision Task
4.3.3 owns". That task is complete and it took no such decision** — what it
decided was the **motion treatment** (240 ms of stillness, then 240 ms of travel,
the same token twice), on a measurement that turned out to be about perceptual
grain rather than frame grain. So the ratchet's home is this task's call, with two
facts from 4.3.3 that bear on it:

- **The frames are several, not one.** The vendor batches a minute into **8.8
  frames at the open** (332 bars), 6.8 at midday, 16.1 at the close, and our code
  adds no coalescing — one upstream array → one `bars` frame, 1:1. So **a ratchet
  in the browser would be asked to step up to eleven times a minute** on partial
  information, and would see a subset of the eleven per frame.
- **The aggregate is computed once per applied batch and broadcast**, identically
  to every client (ADR 0038). **A ratchet on the server is therefore computed once
  and is the same for every reader; a ratchet in a browser is per-tab and two
  readers can see different scales.** That asymmetry is the argument, and it points
  server-side — but take it explicitly rather than by default, and record the
  alternative.

**One thing you may NOT do, from 4.3.3's drawing**: the step must not be a
`Math.max` over the current frame. That is the frame-max normalisation the drawing
rejects on two grounds — a ±0.1% day and a ±5% day would look identical, and all
eleven bars would rescale on every tick.

---

## What was done — 2026-09-27

### The files, and their shapes

**New, `packages/shared`**

- **`sector-ranking.ts`** — `SECTOR_BY_ETF` (**the inverse map, derived once** by
  mapping over `SECTORS`), `sectorOfEtf`, `sectorRankingKey` (the one home for
  _which field this state's move lives in_), `displayedPercent`,
  `compareSectorFigures`, `rankSectorFigures`.
- **`sector-ladder.ts`** — `SECTOR_LADDER_STEPS = [1, 2, 5, 10]`,
  `SectorLadderStep`, `isSectorLadderStep`, `fitSectorLadder`,
  `SectorLadder { session, step }`, `ratchetSectorLadder(previous, session,
figures)`. **Holds no `let`**: the previous rung goes in and the new one comes
  out, so the arithmetic is pure and the state is somebody else's problem.
- 19 + 13 tests.

**New, backend**

- **`sector-ladder-ratchet.ts`** — `createSectorLadderRatchet()`, **the one
  `let` in the whole mechanism**. The session key is
  `lastOpenedMarketSession(asOf).date`, wrapped in a `try/catch` falling back to
  `marketDateAt`, because it is called from the producer the **socket callback**
  reaches and `lastOpenedMarketSession` propagates `MarketCalendarRangeError`
  off the 2024–2028 table. A throw there is a crashed process.
- 6 tests.

**Changed**

- **`market-stream-protocol.ts`** — `WireStoredFigure.sessionChangePercent?`;
  `WireMarketOverview.sectors?` and `.sectorLadderStep?`. `storedFigureFields` is
  now `Omit<…, "sessionChangePercent">` with the move spread in a branch;
  **`encodeFigures` extracted** so the non-finite drop rule has **one home** and
  both sections use it; **`encodeOverview` added** so the two optional fields are
  spread **outside** the field map — `encodeFigure`'s idiom, one container out.
  Decode: `readFigures` extracted; `sectors` read only when it **is an array**,
  and `sectorLadderStep` read **only beside sectors** and only when
  `isSectorLadderStep`.
- **`live-change.ts`** — `PERCENT_DISPLAY_DECIMALS = 2`.
- **`price-format.ts`** — `formatChangePercent` and `directionOf` read the shared
  constant; `PRICE_DECIMALS` stays for **prices**, with a comment saying why the
  two are deliberately not collapsed.
- **`universe.ts`** — `sectorEtfTickers()`: membership from `trackedSecurities`
  (`kind === "sector_etf"`, active only), **order from `SECTORS` via
  `SECTOR_ETFS`**. No second literal list of eleven tickers.
- **`market-overview.ts`** — `figureOf(entry, feeds)` extracted so the two
  sections cannot diverge; a `stored` figure carries `changePercent(entry.close)`
  as `sessionChangePercent`, **omitted when `null`**. `toWireMarketOverview` takes
  `{ proxies, sectors?, sectorLadderStep?, asOf }`, ranks through
  `rankSectorFigures`, and computes `feeds` **once across both sections**.
  `sectorLadderStep` is a **callback** — `closesAsOf`'s shape — so the module
  stays pure.
- **`index.ts`** — **the one call site**, and the split is by membership:

```ts
const entries = buildMarketOverview({
  symbols: [...proxySymbols, ...sectorSymbols], …
});
return toWireMarketOverview({
  proxies: entries.filter((entry) => !isSectorSymbol.has(entry.symbol)),
  sectors: entries.filter((entry) => isSectorSymbol.has(entry.symbol)),
  sectorLadderStep: (ranked) => sectorLadder.stepFor(ranked, asOf),
  asOf,
});
```

**Never a slice** — a fifth index proxy would silently shift a boundary.

### The ratchet went server-side, taken explicitly

State in `sector-ladder-ratchet.ts`, arithmetic pure in `packages/shared`, the rung
on the wire as `overview.sectorLadderStep`. **Two asymmetries decided it, both in
the module's own docblock:**

- The aggregate is **computed once per applied batch and broadcast identically**
  (ADR 0038), so a server rung is **one scale every reader shares**. A per-tab rung
  means two readers of the same market see two scales — **permanently, because the
  ratchet only steps outward**.
- The vendor delivers **8.8 frames a minute at the open**, so a browser rung would
  be asked to step up to sixteen times a minute on **the subset** of the eleven in
  each frame — and a tab opened at 15:59 would start its ladder from one frame's
  worth of the day.

**The alternative is recorded in the file**: hold the rung in the browser beside the
region that draws it — cheaper, no wire field, no drawing state on the server, and
it keeps a presentation decision out of a protocol. What it costs is the shared
scale, which is what the **printed** rung exists to make checkable.
**Reversal trigger, a condition:** _the first surface that needs a rung for a set
the server does not compute_ — a reader's own selection of sectors — at which point
the ladder is per-view and only a browser can hold it.

**It is not a `Math.max` over the frame**, and one test asserts both halves side by
side: with a session already stepped to 5, a +0.05% frame **stays at 5**; from
nothing, the same frame gives **1**.

**Two owner decisions confirmed on 2026-09-27.** The rung **saturates above ±10%**
rather than growing a fifth — the row's own figure stays exact, so no number lies
and only the bar's length understates, against putting an unreviewed rung on screen
on the one day the screen matters most. And **the reset is the bell, literally**:
08:00 Tuesday is drawn at Monday's scale until 09:30, because a midnight reset would
let thin extended-hours prices — which move further on less volume — buy the regular
session's scale before it opens. Asserted as `resets at the bell rather than at
midnight`.

### The comparator's absent-key rule, stated exactly

> **A figure with no move has no ranking key. Every keyless figure sorts after
> every keyed one, and keyless figures hold the order they arrived in — which is
> `SECTORS`' declared order at the producer. There is no default and no `?? 0`
> anywhere in the ranking or in the ladder's fit.**

A **non-finite** move counts as absent too, because a comparator returning `NaN`
leaves `Array.prototype.sort` with **no defined order at all** — and this function
runs in-process **before** the encode that drops non-finite numbers, so the
serialiser's rule cannot cover it.

Ties equal at **displayed** precision return `0`, so the input order survives — a
stable sort (ES2019 guarantees it) against the order it was given, and the producer
gives `SECTORS`' order. That makes the result **deterministic frame to frame with
nobody holding the previous one**.

**Combinations tested** (done-when 3): all eleven observed with a move; all eleven
observed with **no** move; all eleven stored with a move; all eleven stored with no
prior close; **all eleven `unknown`** (CI's own state for ever); observed / stored /
unknown interleaved across all eleven, asserting every keyed figure precedes every
keyless one, descending as displayed, keyless tail in declared order; one observed
among ten unknowns; plus keyless-after-keyed, display-equal-never-swaps **in both
input orders**, one displayed step **does** swap, ranking a ranked list is a fixed
point, and the input array is not mutated.

**One assertion failed first and the code was right.** Two moves of
`0.3999999999999999` and `0.40000000000000013` do not swap, because **both print
`+0.40%`**. The assertion was corrected to compare displayed values and the pair was
left in the fixture with a comment, because it is the rule's own proof.

### The break transcript — and the new check passed GREEN on the defect it forbids

**This is the fifth consecutive time in two stories that a guard has been green on
its own defect**, and the only reason it was caught is that the procedure
`CLAUDE.md` added on 2026-09-26 was followed rather than trusted.

The first clause required the ticker to be **quoted**. The file the next story would
write — `apps/frontend/src/components/SectorList/sector-rows.ts`, all eleven
pairings with **bare identifier keys**:

```ts
export const SECTOR_ROW_LABELS: Record<string, string> = {
  XLK: "Technology",
  XLV: "Health Care",
  … all eleven …
};
```

```
$ node scripts/check-invariants.mjs
37 invariants hold.
```

**Green, on the exact defect it forbids** — and `pnpm break` would never have found
it, because a break edits the file the check was written around. Widened to scan the
ticker as a **word** on comment-stripped text (`\bXLK\b` does not match inside
`XLRE`, the only substring risk in the set). Same file, unchanged:

```
Invariants that no longer hold:

  ✗ one-pairing-of-a-sector-and-its-benchmark
    1 shipped file(s) name more than one sector benchmark ticker:
      apps/frontend/src/components/SectorList/sector-rows.ts (XLB, XLC, XLE, XLF, XLI, XLK, XLP, XLRE, XLU, XLV, XLY)

1 of 37 invariants failed.
```

**`1 of 37 invariants failed`** — an assertion failure with the other 36 **still
collecting**, which is the only red that proves a check works. Not a parse error.
File deleted; `37 invariants hold.` again. **The check's docblock records the
wrongly-passing transcript** so the next author does not re-narrow it, and the
corpus is **derived from `SECTOR_ETFS`' own literal** with an anchor that fails
loudly if the parse stops matching or if the ticker count and the `SECTORS` count
disagree.

**The registry break** targets `UniverseTable.tsx` rather than `sector-ranking.ts`,
for two reasons: that component's own docblock already says _"`SECTOR_ETFS` is the
table that says XLK is what Technology is measured against, and this page is the
first thing in the product to render it"_, so a local copy is its own temptation;
and `break-verify` refuses a dirty target. The substitution uses a **bare key** —
the defect the first clause missed.

```
✓ apps/frontend/src/components/UniverseTable/UniverseTable.tsx broken → red → restored byte-identical.
  matched: name more than one sector benchmark ticker
```

**Done-when 5** — `pnpm break a-second-overview-aggregate` refuses a dirty target
too, so the registry's exact substitution was performed by hand with a sha256 either
side:

```
3d5782dfc96a2f724c56171e1d7d637200ebbbbd2b65e0031bcacf6bfe3cfb62  (before)

  ✗ one-producer-of-the-overview-aggregate
    2 call sites build the market overview, expected at most 1:
      apps/backend/src/index.ts offset 7076
      apps/backend/src/market-overview.ts offset 1205
1 of 37 invariants failed.

3d5782dfc96a2f724c56171e1d7d637200ebbbbd2b65e0031bcacf6bfe3cfb62  (after, byte-identical)
37 invariants hold.
```

**Exactly one call site in the clean tree**, the bound and the `claim` unchanged.
Its signal is the weak 1→2 counter and **would pass silently if anybody widened the
bound**, which is why the bound was not widened and the two sections are split from
one call.

### Gates

- **`pnpm verify` — exit 0**, and `grep -ci unhandled` over the full log returned
  **0**. `All matched files use Prettier code style!` · `37 components, 37 stories
files.` · `16 backend variables documented` · `479 documents, 1661 cross-file
links, 39 anchor links, 0 broken.` · **`37 invariants hold.`** · shared **385**
  (21 files), backend **990** (48), frontend **1225** (78), process **41** (2).
  One lint failure on the way — `@typescript-eslint/prefer-optional-chain` on the
  ratchet's reset guard — fixed to `previous?.session !== session`.
- **`pnpm test:database` — 211 passed (211)**, 6 files. Run because `universe.ts`
  changed, though nothing in the data layer did.
- **`pnpm e2e overview-proxy-live-update.spec.ts` — 4 passed (7.3s)**, including the
  four-proxy set. **Done-when 1's real teeth**: `figures` still carries exactly the
  four proxies.
- **`pnpm e2e` (full) — 169 passed, 1 failed, 15 skipped (2.8m)**, and the developer
  correctly refused to call that green. See below.

### The one e2e failure is the documented flake, and there is no mechanism

`security-gap-fill.spec.ts:165` — _the chart is never blanked or covered while the
gap is filled_ — which has its **own `docs/GAPS.md` entry** recording **14 failures
in 120 executions (~12%) on `main`**, with `main`'s own `--repeat-each=6` runs
producing **5, 5 and 3** failures. This branch's re-run gave **3 failed, 9 passed**,
inside that recorded range.

**Two structural facts establish there is no mechanism**, checked rather than
argued:

1. **`PERCENT_DISPLAY_DECIMALS` is 2 and `PRICE_DECIMALS` is 2.** So
   `formatChangePercent` and `directionOf` are **behaviourally identical** to
   `main` — the only frontend change in this task is a constant's home.
2. **The failing spec serves `{ snapshot: {}, bars: BEFORE }` — no overview frame at
   all.** So the decoder's new `sectors` branch is never entered (it is guarded on
   the field **being an array**) and the backend producer is not on the path; the
   socket is stubbed.

**The n=24 control `CLAUDE.md` asks for was NOT run**, and that is a deliberate
call rather than an omission: the entry already carries a **large-n control on
`main`** (n=120), and against an established absence of mechanism a further n=24 on
the branch would add less than it costs. What it would have to be spent on, if this
recurs with a mechanism in view, is n=24 on one checkout plus a code-free commit.

### Four things that contradict a document, all corrected or recorded

1. **The task file names the wrong function.** It says the stored figure's move
   keeps _"the arithmetic … `changeFromClose` in `packages/shared`, called once"_.
   **`changeFromClose(live, close)` structurally cannot produce a close-to-close
   move** — it needs a live bar. The function that can is **`changePercent(close)`**,
   in the same module, already what `/securities`' table uses and the only module
   permitted to read `previousClose` as a basis. The constraint's **substance**
   holds — one implementation, in `packages/shared`, called once; the function name
   in the task file does not.
2. **The stored move is a new field name rather than a second meaning.** There is
   **no previous-session date anywhere on `SecurityLastClose`** — only
   `previousClose`, a number with no date — so a `changeBasis` for it would have to
   be invented by a calendar walk inside the wire conversion. `sessionChangePercent`
   beside the existing `session` says _this session's own close-to-close move_, and
   **a renderer reaching for `changePercent` on a stored figure finds nothing**,
   which is the failure mode a shared field name invites. Task 4.3.5 renders the
   label.
3. **A frontend display fact now has a backend consumer.**
   `PERCENT_DISPLAY_DECIMALS` moved into `packages/shared` because the no-swap rule
   keys on the **displayed** figure — the displayed order must never contradict the
   displayed figures, which needs both processes rounding in the same place.
4. **Two claims left standing, now in `docs/GAPS.md`** as entries of their own:
   nothing checks the ratchet has exactly one holder (two holders diverge
   **permanently**, because it only steps outward, with every figure still correct);
   and **no gated machine has ever seen a sector figure** — CI's eleven are `unknown`
   for ever, so `sessionChangePercent` never occurs there and the ladder is `±1` for
   ever.

## For a stakeholder — a status report, 2026-09-27

**Nothing is on screen.** This task extended the machinery behind the landing page
so it carries eleven sector figures alongside the four index proxies, ranked, with
the scale their bars will be drawn against. Task 4.3.5 draws them.

Three things were built carefully rather than quickly. **The ranking has one
implementation**, in the package both halves of the product share, because the story
that ranks 518 securities has to rank on the server and a browser-only comparator
would have set the wrong precedent at eleven. **A sector we have not heard from is
ranked nowhere rather than at zero** — putting it among the genuinely flat sectors
would be a false impression expressed as a position on a list, which is a new shape
of a mistake this product already has a rule about. And **the bar's scale is held on
the server**, so every reader shares one scale; holding it in each browser would let
two people looking at the same market see two different pictures, permanently,
because the scale only ever widens.

The finding worth recording is about the checks rather than the code. A new guard was
written to stop anybody re-writing the table that says which fund is which sector's
benchmark — and **it passed green on exactly the file it was written to forbid**,
because it looked for the ticker in quotes and the obvious way to write that file
does not quote it. It is the fifth time in two stories a guard has been green on its
own defect, and each time it was caught only by writing the offending file first
rather than by reading the check. The procedure that catches it is four minutes long
and it has now paid for itself five times.
