# Task 4.4.1 — The arrival mark that cannot fire, and the filter that would flood the strip

**Status:** **Complete — 2026-10-07. The sector arrival mark fires for the first time since Story 4.3 shipped it. And the brief was wrong about the break: inverting the proxy filter is OBSERVATIONALLY INVISIBLE today — it passes 2/2 — because the join is handed only the fifteen, so the e2e assertion is a tripwire for 4.4.4 and a grep invariant is the half that is red now.**
**Story:** [4.4 Breadth, & the Denominator on Screen](STORY.md)
**Depends on:** nothing

## Objective

**Two defects in one file, found by shaping this story rather than by any
check — and the second one is a trap the next task springs.**

**1. The sector arrival mark is dead code in production.** The landing route
subscribes to `overview.figures` only — `MarketOverview.tsx`'s `symbolKey` is the
four proxies — and the gateway scopes both `bars` and `snapshot` to what a client
asked for (`if (!wanted.has(…)) continue`). The eleven sector ETFs ride in
`overview.sectors`, **which never reaches the subscription**. So
`observations.get("XLK")` is permanently `undefined`, and the arrival mark Story
4.3 designed, drew, tested and shipped **can never fire on the deployed page.**

**It is invisible to every test**: the unit tests hand `sectorPerformance` an
observations map directly, and the browser specs furnish their own frames. It is
the furnished-fixture lesson one layer below where Task 4.3.8 caught it.

**2. The proxy filter is a NEGATIVE membership test, and Task 4.4.4 widens the
join to 518.** `index.ts` splits the join's answer with
`entries.filter((e) => !isSectorSymbol.has(e.symbol))`. Widen `symbols` and
**every non-sector security lands in `overview.figures`** — hundreds of cells in
the strip, a ~56 KB frame, and `newest`, `sharedBasis` and `sharedClosingSession`
folding over 507 figures. **No compile error, no failing test.** Story 4.3's
comment there warns against a _slice_ and does not cover this, because the sector
predicate is positive and the proxy one is not.

## What the user can see when this lands

**The arrival mark starts firing on the sector rows** — a disc beside a sector
whose bar has just arrived, which is what Story 4.3 intended and never delivered.
**On a live feed only**: CI's store has zero bars, so no gated machine will ever
show it.

## Work

- **Decide how the eleven reach the subscription.** The obvious repair is to
  include the sector symbols in `symbolKey`, and it has a cost: `MarketOverview.tsx`'s
  own docblock argues that a changing symbol list pushes a new array into `App`'s
  state and re-renders the tree. Fifteen symbols rather than four is small, but
  **measure it rather than assuming** — Task 3.6.5 spent two memo boundaries
  removing a per-tick cost on the neighbouring page.
- **Rewrite the proxy filter as a POSITIVE membership test**, so widening the
  join cannot flood `figures`. Everything that lands in a _section_ is positive
  membership; only breadth reads the whole answer.
- **A guard for the thing that has no symptom**: the frame carries exactly four
  figures. The assertion belongs on a **pass-through** spec — one that records
  what this product's own server sent — because a furnished frame cannot see it.
  `overview-sector-ranking.spec.ts` is the shape. **A check owes a break.**
- **Do not widen the join here.** That is Task 4.4.4's, and doing it before the
  filter is positive is the defect this task exists to prevent.

## Done when

1. A sector row's arrival mark fires against a driven frame in a browser —
   asserted, not reasoned
2. The proxy split is a positive membership test, and a comment says why
3. A pass-through assertion holds `figures` at exactly four, with a break that
   goes red when the filter is inverted
4. The subscription's cost is measured, not assumed, and the figure recorded

---

## What was done — 2026-10-07

### Defect 1 — the arrival mark, and the chain confirmed rather than trusted

Verified in the tree and **against the real gateway**: the page's subscribe frame
was `DIA,IWM,QQQ,SPY`. Four symbols, eleven sector rows, `observations.get("XLK")`
permanently `undefined`.

**The repair spans every section the frame carries, and is sorted:**

```ts
const symbolKey = [...(overview?.figures ?? []), ...(overview?.sectors ?? [])]
  .map((figure) => figure.symbol)
  .sort()
  .join(",");
```

**The sort is load-bearing and was not in the brief's description of the repair.**
`figures` never re-orders, but **`sectors` arrives rank-ordered** — and
`use-live-feed` keys its resubscribe on `symbols.join(",")`, which is
order-sensitive. Unsorted, sixteen re-ranks sent **16 redundant `subscribe`
messages**; sorted, **zero**. A subscription is a **set**, its order carries no
meaning, so the key must not either.

The docblock now carries the rule that generalises: **a section added to this
frame owes a line here.**

### The arrival mark fires — asserted, with a harness that cannot cheat

The driven test's harness **refuses to send an observation for a symbol the page
has not subscribed to**, mirroring the gateway's own `scopedTo`. So the assertion
is not _a mark appeared from a frame I invented_ — **the frame is only sendable if
the subscription is real.** Against the shipped defect, verbatim:

```
Error: the page has not subscribed to XLK — it asked for DIA, IWM, QQQ, SPY. The
gateway scopes `bars` to the subscription, so this frame is one the server could
not have sent...
```

and the pass-through test in the same run:

```
Expected: "DIA,IWM,QQQ,SPY,XLB,XLC,XLE,XLF,XLI,XLK,XLP,XLRE,XLU,XLV,XLY"
Received: "DIA,IWM,QQQ,SPY"
```

Baseline `toHaveCount(0)` → push `{ XLK: … }` → `toHaveCount(1)`, with
`data-arrival` matching the **bar's own instant** parsed in the spec rather than
re-implementing `observationIdentity`, and exactly one mark in the whole region.

### The cost, measured rather than assumed

Throwaway Playwright instrument, run and deleted. Verbatim, shipped code:

```json
{
  "subscribesAfterLoad": 2,
  "subscribeSets": [0, 15],
  "subscribesAfterSixteenReranks": 0,
  "burstsSent": 40,
  "subscribedCount": 15,
  "longTasksOver50ms": 0,
  "wallMs": 3328
}
```

**4 → 15 symbols costs nothing**: the same two subscribes on load, **zero** long
tasks across forty fifteen-symbol bursts, nothing near §28's 50 ms. The
counterfactual with `.sort()` removed is what found the second defect — **58
subscribe messages against 2**.

### Defect 2 — the positive filter, and the finding the brief got wrong

```ts
const overviewSymbols = [...proxySymbols, ...sectorSymbols];
const isProxySymbol = new Set<string>(proxySymbols);
…
proxies: entries.filter((entry) => isProxySymbol.has(entry.symbol)),
```

**The brief said to invert the filter and watch the e2e assertion go red. It does
not — it passes 2/2.** Because the join is handed only the fifteen, the negative
and positive filters return **byte-identical arrays**, so the inversion is
**observationally invisible today**.

**That is the finding, and it changed the shape of the guard.** Performed by hand
in three states:

| state                                     | `figures` on the wire | spec                                             |
| ----------------------------------------- | --------------------- | ------------------------------------------------ |
| negation alone (today's join, 15 symbols) | 4                     | **2 passed — passes wrongly**                    |
| negation **+ the join widened to 518**    | **507**               | red: `Expected length: 4 / Received length: 507` |
| positive filter **+ widened join**        | 4                     | 2 passed — **4.4.4 can widen safely**            |

So the e2e assertion is a **tripwire for the day the flood is real**, and a grep
invariant over the _shape of the split_ is the half that is **red now**:
`each-overview-section-names-its-own-set` (39 invariants, up from 38).

**The 507 also confirms the predicted blast radius** — the ~56 KB frame and the
five folds over 507 entries are no longer a projection.

### Three breaks, all assertion failures with the rest still collecting

| break                                        | target               | what it reports                                               |
| -------------------------------------------- | -------------------- | ------------------------------------------------------------- |
| `the-proxy-section-is-taken-negatively`      | `index.ts`           | `the overview's 'proxies:' section does not name its own set` |
| `a-section-is-handed-the-join-whole`         | `index.ts`           | `Expected length: 4 / Received length: 15`                    |
| `the-landing-page-asks-only-for-the-proxies` | `MarketOverview.tsx` | the subscription mismatch quoted above                        |

Checksums either side on every hand-applied substitution
(`10efae0541c47933 → 2e9acbf5c151004d → 10efae0541c47933`).

### Probe — byte-identical

`pnpm probe /` at four widths, before and after, `diff` of the full output:
**byte-identical.** The strip unchanged at every width (`1358×58 @41,229` at 1440),
`areaSectors` 486 and `areaBreadth` 486 / 486 / 103 / 139.

### Gates

```
$ pnpm verify    exit 0,  no Unhandled Errors block
39 invariants hold.
487 documents, 1669 cross-file links, 39 anchor links, 0 broken.
shared 385 · backend 990 · frontend 1282 · process 41
$ pnpm e2e       184 passed, 15 skipped (3.9m), exit 0
```

**No characterised flake fired**: `market-gateway.process.test.ts` 41/41,
`security-gap-fill` green, `securities-route:855` green at **17.1 s** against its
30 s ceiling.

**One thing worth knowing**: there is **no unit test file for the `MarketOverview`
route** — `pnpm --filter @marketpulse/frontend test MarketOverview` reports _No
test files found_ and exits 1. The route's only coverage is the browser suite.

### One document corrected upward, the same day

`market-stream-protocol.ts`'s `figures` docblock argued that sector ETFs joining
the array would break three folds **"with no compile error and no test failure"**.
The second half stopped being true with this change — there is a test failure and a
check failure now — and the docblock carries a dated amendment saying so, including
**why both exist** and that the spec is blind today.

## For a stakeholder — a status report, 2026-10-07

**The sector arrival mark works for the first time.** Story 4.3 designed it, drew
it, tested it and shipped it three weeks ago, and it has never once fired on the
deployed site: the page asked the server for four symbols and then looked for
arrivals on fifteen. Every test passed because each one handed the code the data it
was about to check.

Two things were found that the brief did not know.

**A subscription is a set, and the code was treating it as a list.** The sector
rows arrive in rank order, and that order changes as the market moves — so the page
was re-subscribing every time the ranking changed. Sixteen re-rankings sent sixteen
redundant requests to the server. Sorting the list fixes it, and the fix is one
line.

**And the guard the task asked for would not have worked.** The brief said to break
the filter and watch the test fail; it does not fail, because today the server only
ever hands that code fifteen securities, so the broken version and the correct one
produce identical output. It becomes catastrophic only when the next task widens
the input to all 518 — at which point the page would draw **507** price cells
instead of four. So the test was kept as a tripwire for that day, and a second,
simpler check was added that fails **now**, on the shape of the code rather than
its behaviour.
