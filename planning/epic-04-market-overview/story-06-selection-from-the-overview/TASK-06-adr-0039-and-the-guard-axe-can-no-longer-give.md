# Task 4.6.6 — ADR 0039, and the guard axe can no longer give

**Status:** Complete — 2026-10-09
**Story:** [4.6 Selection From the Overview](STORY.md)
**Depends on:** 4.6.5

## Objective

**Close a question declined twice, and replace a mechanism this story
destroys.**

## What the user can see when this lands

**Nothing.** This is a decision written down and a guard put back.

## Work

### ADR 0039 — `Region` is a tab stop unconditionally

**Decided: keep it unconditional, and record it rather than decline it a third
time.** Three declines is how a question stops being decidable.

**The reframing is the valuable part, and it must be in the ADR**: the question
was never _does this region scroll_. It is **can a tab stop appear and
disappear under a reader**, and the answer must be no.

**Why both candidate conditions fail.**

_Conditional on actual overflow_: overflow is a function of **height**, and the
measurement behind the premise — _no region on `/` scrolls at any of the four
widths_ — is **four width/height pairs, not four widths**. `min-height: 82vh`
with `minmax(min-content, 1fr)` rows means a region's share shrinks with the
viewport while its content does not, so a short window is the ordinary case
where one scrolls. `Region.tsx`'s own Task 1.13.4 comment already said it:
_"making it conditional would be a guess re-taken on every window resize."_

_Conditional on content being focusable_ — statically knowable, and **correct
about 2.1.1** — fails on a different axis: **the stop would appear and
disappear under a reader.** Three regions have content whose focusability is a
function of the frame, so the `Sector performance` stop would exist at paint,
**vanish when the first aggregate lands**, and return on a rollback or a
boundary trip. **A reader focused there has focus dropped to `<body>`, on a
timer nobody controls, invisible to everything below `pnpm e2e`.**

**Also record**: `overflow: auto` is load-bearing in **both** grids
(`SecurityExplorer.module.css` and `MarketOverview.module.css` each say so),
so decoupling only `tabIndex` is precisely the 2.1.1 failure. And the
blast radius as **measured**, not as assumed: **`Panel` has exactly one
production consumer** — `Region` — and **`Region` is on two routes**, not five,
with ~20 live claims in documents and specs depending on the current
behaviour.

**Reversal trigger, as a condition:** _the first region on this screen whose
content holds a keyboard stop in **every** state it can be in_ — including no
frame, a refused section, an empty answer and a tripped boundary. Nothing on
this screen is close.

### The guard this story destroys, and the replacement

**`scrollable-region-focusable` does not fire while a scrolling box contains
something focusable** — `Region.tsx` says so, and it is _"why this stood for
five stories."_ **Once rows in three regions are focusable, axe can never
report those regions again**, whatever `scrollable` does. The claim _every
region is reachable by keyboard_ then reads identically whether the mechanism
is there or not: a comment and a line in `docs/GAPS.md`.

**The replacement, which costs no new fixture:** `overview-region-order.spec.ts`
already walks the six sections in DOM order at 768 and 390 — read each
section's `tabIndex` and assert `0`. It runs on CI's bare store and goes red
the moment somebody makes `scrollable` conditional and gets it wrong. **A
sibling assertion for `/securities`' regions**, which is the route with the
long table and the original defect's shape.

**The break** removes `scrollable` from `Region.tsx` and proves it red. Per the
2026-09-26 rule, **write the file the next story would write first** — a
`Region` passing `scrollable={false}` for a reserved region — run the check,
**keep the transcript if it passes**, then fix.

### Boundaries

Not a change to `Panel` or `Region`'s behaviour. Not the journey spec (4.6.7).

## Done when

1. `docs/adr/0039-*.md` records the decision, the two failed conditions, the
   measured blast radius and the condition-shaped reversal trigger
2. A browser assertion holds the tab-stop spine on both routes, with a break
   and a passing-wrongly transcript
3. The `docs/GAPS.md` entry that recorded the open question is discharged with
   a dated note naming the ADR
4. `pnpm verify` and `pnpm e2e` green

---

## What was done

1. **[ADR 0039 — A region is a tab stop unconditionally, and the guard axe can
   no longer give](../../../docs/adr/0039-a-region-is-a-tab-stop-unconditionally.md)**,
   indexed in `docs/adr/README.md`. Three decisions: the prop stays
   unconditional with the reframing as the argument; the guard moves from axe to
   a browser assertion on both routes; the blast radius is recorded as measured.
2. **`expectEveryRegionIsATabStop` in `e2e/support/app.ts`**, called from
   `overview-region-order.spec.ts` (768 and 390, seven regions) and
   `securities-route.spec.ts` (1280×480, eight regions). One home for the claim,
   two routes.
3. **`pnpm break a-region-stops-being-a-tab-stop`** in `scripts/breaks.mjs`.
4. **`docs/GAPS.md`'s ≥861 focus-order entry** carries a dated discharge of its
   six-tab-stops premise and keeps its own subject open.
5. **A comment paragraph in `Region.tsx`** pointing at the ADR and the two
   specs, so the claim and its mechanism sit together.

## The three re-taken counts

| Claim                                  | Brief         | Measured                                                                     | Command                                                                                               |
| -------------------------------------- | ------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Panel`'s production consumers         | exactly one   | **exactly one** — `Region.tsx`, and no other importer of any kind            | `grep -rln 'Panel/Panel.js' --include='*.ts*' apps/frontend/src e2e`                                  |
| `Region`'s routes                      | two, not five | **two** — `MarketOverview.tsx`, `SecurityExplorer.tsx` (+5 stories, 2 tests) | `grep -rln 'Region/Region.js' --include='*.ts*' apps/frontend/src`                                    |
| Live claims depending on the behaviour | ~20           | **20 files, 54 lines** — so ~20 by file and an undercount by passage         | `git grep -nE 'scrollable\|tabIndex=\{0\}\|tab stop\|scrollable-region-focusable' HEAD -- <live set>` |

None of the three had moved. The third is the only one that needed a definition
to be reportable: the live set is shipped code, `e2e/specs`, `e2e/README.md`,
`docs/GAPS.md` and ADR 0013 — `planning/*/TASK-*.md` carries many more and is
**historical**, so it is not swept.

The `min-height: 82vh` / `minmax(min-content, 1fr)` claim is in the tree as
stated (`MarketOverview.module.css:158–160, 193`) — and reading it was what
turned the overflow argument from an argument into a measurement, below.

## The measurement that falsifies the premise, and it falsifies UPWARD

**The handed-down claim is false, not merely under-measured.** _No region on `/`
scrolls at any of the four widths_ (Task 4.3.1, repeated in `STORY.md`) was
taken at four width/height pairs. A throwaway comparing `clientHeight` against
`scrollHeight` for every `section[aria-labelledby]` at **thirteen** pairs on both
routes, verbatim at the ends that matter:

```
=== / 1440x700
  -> 0 of 7 scroll
=== / 1440x680
  Unusual activity         client  117  scroll  121  SCROLLS +4
  -> 1 of 7 scroll
=== / 1440x500
  Market topology          client   82  scroll   85  SCROLLS +3
  Unusual activity         client   82  scroll  121  SCROLLS +39
  -> 2 of 7 scroll
=== / 1280x480
  Market topology          client   79  scroll   85  SCROLLS +6
  Unusual activity         client   79  scroll  121  SCROLLS +42
  -> 2 of 7 scroll
=== /securities 1440x900
  Tracked universe         client 18893  scroll 18893  fits
  -> 0 of 8 scroll
```

**The first height at which a region on `/` scrolls is between 681 and 700 at
1440**, and the cause is in the stylesheet: row 1 of `.regions` is a `calc()`
length derived from `82vh` with **no content floor**, while rows 2 and 3 are
`minmax(min-content, 1fr)` and have one. `Market topology` and `Unusual
activity` are on row 1.

And the mirror, which is the part worth keeping: **0 of 8 regions scroll on
`/securities` at any pair**, `Tracked universe` included at 18,893–31,823 px. The
route with the original defect's shape is the route where the rule is least
triggered; the long table scrolls the **page**.

Swept the same day per `CLAUDE.md`: `STORY.md` has a dated amendment, and the
ADR carries the rows. Task 4.3.1's own record is historical and left standing.
The instrument is deleted.

## The passing-wrongly trial, and it found a real hole

Per `CLAUDE.md`'s 2026-09-26 rule, the defect **the next author would write** was
tried before the loud one: `scrollable={children !== undefined}` in `Region.tsx`
— a stop only where there is content, which is the better of the two conditions
the ADR rejects.

```
  2 failed
    [chromium] › e2e/specs/overview-region-order.spec.ts:89:3 › the landing route's regions are drawn in DOM order at 768
    [chromium] › e2e/specs/overview-region-order.spec.ts:89:3 › the landing route's regions are drawn in DOM order at 390
  1 passed (2.7s)
```

```
    - Expected  -  1
    + Received  + 10
    -   "notStops": Array [],
    +   "notStops": Array [
    +     "Market topology @ tabIndex -1",
    +     "Unusual activity @ tabIndex -1",
    +     "Current investigations @ tabIndex -1",
    +   ],
```

**The `1 passed` is the finding.** The `/securities` assertion **passed wrongly**
against that defect, because all eight of that route's regions have content. The
landing route is the only surface in this product that draws a `reserved` region
and therefore the only one that can see the condition a re-implementer reaches
for — which is why the break's command runs both specs and why the floor on `/`
is seven rather than six.

Then the loud form, `scrollable` deleted outright: **3 failed**, all three
assertion failures naming the regions, including eight on `/securities`.

```
$ pnpm break a-region-stops-being-a-tab-stop
✓ apps/frontend/src/components/Region/Region.tsx broken → red → restored byte-identical.
  matched: tabIndex -1
```

## What is owed to 4.6.7

- Nothing from this task is unfinished, and no acceptance criterion moved.
- `docs/GAPS.md` gains no new entry from here **on purpose**: the claim became
  mechanical, which is that file's own rule for what must leave it.
- The story close should note that the ≥861 focus-order entry is now half
  discharged, and that `/investigations` and `/replay` draw no regions and are
  therefore outside the new guard's reach.
