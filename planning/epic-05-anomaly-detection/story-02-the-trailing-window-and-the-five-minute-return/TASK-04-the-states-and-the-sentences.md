# Task 5.2.4 — The States & the Sentences

**Status:** Complete — 2026-10-14 — the eight states are asserted by string, the region is **106 px in all four widths across ten states**, and the pass-through spec is **green on the producer break** until it reaches outside the frame
**Story:** [5.2 The Trailing Window, & the 5-Minute Return](STORY.md)
**Depends on:** 5.2.3

## Objective

**The state every gated run is permanently in is not the state anybody designs
against.** CI's store is 516 securities and zero bars and its feed is
`provider=none`, so the window there **never holds one entry** — every gated run
renders an absence, for ever. Story 5.1 shipped the adjacent defect and repaired
it: _nothing has reached us yet_ and _everything reached us and none of it had a
move_ were one sentence for a day.

**For a window there are four absences, not two**, and they must not collide.

## What the user can see when this lands

**The region is honest in every state**, and no two of them read alike.

## Work

- **Eight states, drawn and asserted.** The four absences first, because they
  are the ones that collapse:
  1. **the security unresolved** — held room, geometry only, the region-level
     sentence after the 2,000 ms floor;
  2. **no window payload yet** — deliberately the same as 1, which is
     `RelativePerformance`'s own reasoning rather than a third state;
  3. **payload arrived, zero bars for this symbol** — CI's permanent state, and
     a restarted replica's: the figure slot carries **words**;
  4. **one bar held, earlier endpoint absent** — **refused**, with the one
     instant it has and `observed 1 of 5 minutes`, because without them 4
     collapses into 3 and _refused_ and _heard nothing_ are the two facts that
     look identical;

  then 5. a legitimate partial (2 ≤ k ≤ 4); 6. k = 5; 7. a return of **exactly
  zero**, which is `PriceChange`'s `unchanged` and must not be confusable with a
  refusal; 8. a valid figure whose window ended forty minutes ago — **nothing
  changes**, because the instant is the age and there is no verdict.

- **Two new sentences, and no more.** Eight absence sentences are already
  approved and named in `relative-performance.ts`; neither of these can be one
  of them:
  - the **region-level noun**, which names its own region — four already read
    `No prices yet.` / `No count yet.` / `No sector moves yet.` /
    `No moves to rank yet.` on `/` and `No comparison yet.` on this page, so
    **this is the sixth of its kind and not the fifth the story's own Design
    work section says.** `NO_COMPARISON` names the comparison region and reusing
    it would put one string in two regions.
  - the **missing-endpoint refusal**. `NO_CLOSE` says _no close to measure
    from_ and a close is a **session** artefact off the universe answer; what is
    missing here is a **minute bar at an instant**. Reusing it would tell a
    reader the store lacks a close when it lacks a minute.
- **One height across all eight, at four widths**, reserved band by band and
  never a `min-height`. The qualifier gets a **two-line floor at 390**, because
  its width is a function of the printed instants and the k-count — a one-line
  reserve makes the region's height depend on the digits of the day.
- **A browser assertion that asserts NO number**, and is a **pass-through**
  rather than a furnished frame. Task 4.3.8 found **four** overview specs green
  against a server with the ranking deleted, each asserting its own fixture. So:
  forward this product's own frames, assert the drawn figure equals what the
  server sent — **strictly weaker than correctness, and say so** — plus the
  honest-absence string by **exact text**, the region's one height, and the tab
  stop.
  - **The equivalent break is the one that matters**: delete the refusal from
    the producer and watch the spec stay green. If it does, the spec is serving
    its own answer.
- **No live region.** The figure changes about once a minute and an unprompted
  polite update is the open listening item with six entries. Declare it quiet
  **with a reversal trigger**, and add the listening question to that item
  rather than claiming it answered.

## Done when

1. All eight states render, each with its own drawn text, and **3 and 4 do not
   read alike** — asserted by string rather than by eye.
2. The region is **one height in every state at every width**, measured with
   `pnpm probe` and the figure recorded; no `min-height`.
3. Exactly two new sentences exist, each with its recorded reason for not being
   one of the eight already approved.
4. The browser spec asserts no number, forwards the server's own frames, and
   **goes red when the refusal is deleted from the producer** — performed, with
   the transcript.
5. The accessibility tree carries no placeholder value in any state, and the
   quiet decision has a reversal trigger.
6. `pnpm verify` green; `pnpm e2e` green on the specs this touches.

## Amended by Task 5.2.3 — 2026-10-14: one copy decision is yours, and one spec class is now this page's problem

**The qualifier repeats the date**, and whether it should is this task's call
because this task owns the region's copy. It prints
`Oct 14 · 14:01 EDT → Oct 14 · 14:06 EDT · observed 3 of 5 minutes`, because
`formatBarInstant` is the one home for an instant and has no time-only form.
The reasoning for keeping it is real — a time-only second endpoint is a **second
spelling** of an instant, and the first endpoint's date is load-bearing, since a
process quiet since Friday holds a valid pair days old — and it is still a
repetition a reader notices. **If you change it, the change is a conditional
grammar** (same day → time only), which is the thing UX warned against for the
k-count; weigh that rather than re-deciding it by eye.

**And the 2,000 ms floor is now a property any "nothing changed" assertion on
this page has to outlast.** `security-feed-degraded.spec.ts` went red on
`No return yet.` arriving, with the outage having nothing to do with it: its
baseline settled at ~200 ms and the floor fired afterwards, so the spec could not
tell _the feed died_ from _two seconds passed_. It is repaired with a bound
(`3_000`, deliberately not a copy of the product's 2,000). **Any new spec of
yours that compares the page across an interval inherits this**, and three
regions now carry the floor.

---

## What was done — 2026-10-14

### The headline, which is a correction to this task's own premise

**A pass-through spec is BLIND to the defect its own break describes, and
proving that is the most useful thing this task did.** The brief said: _delete
the refusal from the producer and watch the spec stay green. If it does, the
spec is serving its own answer._ The second sentence is **wrong**, and the
first is a measurement rather than a hypothetical — it was performed.

A gateway that answers an empty window with `0.00%` instead of refusing sends a
frame the browser then draws **faithfully**, so every assertion of the form
_the page agrees with the frame_ is green either way, **however honestly the
spec forwards the server's own bytes**. Pass-through removes the
_fixture-agrees-with-itself_ defect; it does nothing whatever about a producer
that is wrong. What caught the break is the one assertion that reaches
**outside** the frame — `GET /market-data` answering `{"feed":null}`, which
means this process has no provider, which means (Gate 1 decision 3: no
store-backed fill) it has **observed nothing**, which makes a measured
5-minute return from it fabricated by construction. That is
`overview-breadth-counts.spec.ts`' `tracked`-against-`GET /securities` shape,
and it is the clause the next author cannot avoid.

### What changed on screen

**One state draws something it did not: a refusal that holds a bar now states
its instant and its count** — `No bar five minutes back · Oct 14 · 14:06 EDT ·
observed 1 of 5 minutes`. Everything else is assertions, stories and words.

### The wire widened, and the two refusals now differ in SHAPE

`WireRefusedReturn` gained `seen: WireObservedSpan | null` — the newest bar's
endpoint, the observed count and the span — produced in the **same pass** that
picks the endpoints. `nothing-observed` is the only refusal that carries
`null`, so _we hold one bar and there is no pair_ and _we have heard nothing_
are told apart by the **frame's shape** rather than by four words in one
sentence. A renderer cannot collapse them because the data for one of them is
not there.

Three decisions inside it:

- **A required member holding `null`/`undefined`, never an optional one.**
  `exactOptionalPropertyTypes` makes _absent_ and _present as undefined_
  different types, and the required form is the one a fourth refusal cannot
  forget. Every construction site in three packages was a compile error until
  it said which — which is how the change was swept.
- **The decoder treats absent and `null` identically, and an unreadable span
  keeps the refusal.** A browser holding a bundle from before this field is an
  ordinary state across a deploy; throwing the frame away would put the region
  back on _no frame has arrived_, which is a different and **false** claim.
- **No tape line on a refusal, unchanged.** ADR 0029, and the distinction is
  the rule's own: `Measured on IEX` is a claim about a **measurement**, and no
  measurement happened. The instant beside it is a fact about a bar we hold.

### The frame's size, re-measured rather than estimated

| Frame                              | Bytes               |
| ---------------------------------- | ------------------- |
| A measured figure                  | **298** (unchanged) |
| A refusal with nothing observed    | 141 → **153**       |
| A refusal carrying its one instant | **249**             |

`"seen":null` is 12 B. The ratio Gate 1 decision 1 was taken on — against
+54,525 B a frame at 516 subscribed — is untouched, because this frame is about
**one** security.

### The eight states, and the two deliberate collapses

Asserted **by string**, in `AbnormalMove.test.tsx`, through a reader that walks
the `<p>` elements, drops every `aria-hidden` subtree and joins with `/` —
because `textContent` runs the four blocks together and a screen reader pauses
between them.

| #   | State                                | What it draws                                                                 |
| --- | ------------------------------------ | ----------------------------------------------------------------------------- |
| 1   | the security unresolved              | `` (room, nothing said) → `No return yet.`                                    |
| 2   | no payload yet                       | identical to 1 **by construction**                                            |
| 3   | payload, zero bars — **CI for ever** | `5-minute return / No bars observed yet`                                      |
| 4   | one bar, earlier endpoint absent     | `… / No bar five minutes back / Oct 14 · 14:06 EDT · observed 1 of 5 minutes` |
| 5   | a legitimate partial                 | `… / up +0.42% / … → … · observed 3 of 5 minutes / Measured on IEX`           |
| 6   | k = 5                                | `observed 5 of 5 minutes`, same grammar                                       |
| 7   | exactly zero                         | `… / unchanged 0.00% / … / Measured on IEX`                                   |
| 8   | the window ended 40 minutes ago      | **byte-identical to 5 but for the two instants**                              |

**1 and 2 are collapsed in the DATA, not in a branch.** The route maps both to
one `undefined` (`SecurityExplorer.tsx`), so the two drawings are identical by
construction rather than by a claim a test has to keep true — Story 4.7's
content classes, at one region. The consequence is a real behaviour change: the
figure is **withheld until `GET /securities` has resolved this page's
security**, because a figure under a name this product cannot say it tracks
(`/securities/ZZZZ` produces one) is the same class of claim as a figure under
the wrong name. The cost is the 174–277 ms that request takes, well inside the
2,000 ms floor, so nothing is drawn and then replaced.

**7 is the one state the no-dash rule reads backwards.** `—` is `unchanged` in
`PriceChange`, which is why no refusal may draw one — and it is exactly the
glyph a span in which the price did not move owes. What tells a reader it is a
reading is everything a refusal has not got: a figure, the spoken direction,
both instants, the count and the tape.

**8 changes nothing, and that is AC 6 rather than an omission.** The instant is
the age. The test asserts the absence of `ago|old|stale|behind|late|since`, and
the story exists so a reviewer looking for the missing badge finds the
argument.

### The height, probed

**106 px at every width in all TEN stories** — `pnpm probe --story
market-abnormalmove--<id>`, Chromium, 2026-10-14:

| Width | Story content box | Region height |
| ----- | ----------------- | ------------- |
| 1440  | 1374 px           | **106 px**    |
| 1024  | 958 px            | **106 px**    |
| 768   | 702 px            | **106 px**    |
| 390   | 324 px            | **106 px**    |

And on the route (`pnpm probe /securities/NVDA --within "Abnormal-move
indicators"`), where the column is what it will be in production: **419 / 446 /
318 / 308 px** of content and **106 px** of region at 1440 / 1024 / 768 / 390.
Task 5.2.3's figure holds, and the new clause costs nothing because the
qualifier's two-line reserve was already paid for — the refusal's clause is
**one** line at 324 px, photographed at 390.

### The browser spec

`e2e/specs/security-abnormal-move.spec.ts`, three tests, and it asserts **no
number of its own**:

- the band's lines are compared with the **recorded** frame — the digits via
  the shared `PERCENT_DISPLAY_DECIMALS`, the direction via the shared
  `directionOf`, the count from the frame's own `observed`/`spanMinutes` — and
  the file says in as many words that this is **strictly weaker than
  correctness**;
- the honest absence by **exact text**, from a table written out rather than
  imported, because importing the renderer's constants is the
  fixture-agrees-with-itself defect wearing a different hat;
- the one height, drawn against **no socket at all**;
- the tab stop, over every region on the route (ADR 0039).

**It inherits 5.2.3's finding**: the only interval it compares across is the
2,000 ms floor itself, and it waits for the **sentence** — a positive state —
rather than for a duration.

### The break, in both directions

`the-return-is-fabricated-rather-than-refused`, added to `scripts/breaks.mjs`
(`build: true`, the recorded reason). It was performed **by hand** rather than
through `pnpm break`, because `break-verify.mjs` refuses on an uncommitted
target and this task's own change touches that file; the entry's `find` was
applied programmatically from `BREAKS` itself, so the substitution is the
registry's and it reported **one occurrence**.

Red, with the other two tests still passing — the only red that proves a check
works:

```
  ✘  1 … › the region draws what the SERVER sent, figure or refusal (1.6s)
  ✓  2 … › a region with no frame at all says so, and is exactly as tall (3.7s)
  ✓  3 … › the region is a tab stop like every other (1.1s)

    Error: a gateway with no market-data provider has observed nothing, so a
    measured 5-minute return is fabricated
    expect(received).toBe(expected) // Object.is equality
    Expected: false
    Received: true
```

Restored, and green:

```
  ✓  1 … › the region draws what the SERVER sent, figure or refusal (1.5s)
  ✓  2 … › a region with no frame at all says so, and is exactly as tall (3.6s)
  ✓  3 … › the region is a tab stop like every other (1.1s)
  3 passed (6.8s)
```

**And note which assertions stayed green under the break**: every
page-agrees-with-the-frame one. See the headline above.

### No live region, declared with a reversal trigger

`AbnormalMove.tsx`'s docblock. The figure is replaced **6.8–16.1 times a
minute**, unprompted, and all four lines change together — a twenty-word
sentence against a 1,500 ms pacing floor the chart's reading already overruns.
`MarketProxyStrip`'s decision for the same arithmetic.

**Reversal trigger:** the first **terminal** state in this region — a word or a
figure the next batch will not replace, which a reader has to be told about
once rather than continuously. Story 5.6's band word is the candidate; a
changing number is not.

`docs/GAPS.md` gains a **TENTH** entry on the standing screen-reader item, with
three questions no DOM can answer: whether the silence is discoverable at all,
whether a listener arrowing line by line reads a band that agrees with itself
across commits, and how a refusal's three `·`-separated blocks are heard.

### The copy decision this task was handed, decided

**The repeated date is KEPT**, and the argument against it turned out to be
**stronger** than Task 5.2.3 recorded rather than weaker: the two endpoints are
exactly five minutes apart by construction and no such span inside the hours
the feed delivers bars for can cross a market date, so the second date is
**zero-information** and dropping it would be _unconditional_ rather than the
conditional grammar UX refused for the k-count.

Rejected anyway, on three counts: it needs a **second spelling of an instant**
beside `formatBarInstant`, which is the one home for one; the
zero-information argument rests on the **vendor's** hours and on
`RETURN_SPAN_MINUTES`, neither of which this module owns, so a widened span or
an overnight bar makes the dropped date the one thing the reader needed; and a
refusal now prints a **lone** instant, so a time-only form would have to decide
what `14:06 EDT` on its own means. **Reversal trigger:** the first width at
which the clause **clips** rather than wrapping inside its two reserved lines —
a measurement, and `pnpm probe` is where it comes from.

### The sentences, and a count in this task's own brief that is wrong

**There are four new sentences, not two.** The brief and the Work section
enumerate the region noun and the missing-endpoint refusal; the producer has
**three** refusals and each needs words. All four, with their recorded reason
for not being one of `relative-performance.ts`' eight, are in
`five-minute-return.ts`:

- `No return yet.` — the region noun. `NO_COMPARISON` names the region one
  down; reusing it puts one string in two regions.
- `No bar five minutes back` — `NO_CLOSE` is about a **session** close off the
  universe answer; what is missing here is a **minute bar at an instant**.
- `No bars observed yet` — the closest to an approved one (`NOT_HEARD`, _Not
  heard from_), and not reused because that string is private to the
  comparison region, and because it is a **row label** with its subject beside
  it while this stands alone in a figure's slot where _from_ has no object.
- `No basis for a percentage` — nothing in the eight is about a **divisor**.
  `NO_CLOSE` is an absence; this is a present value that cannot be divided by,
  and is what otherwise renders as `Infinity%`.

The region noun is the **sixth** honest-nothing noun in this product;
`STORY.md`'s Design work section said the fifth and is corrected there.

### One assertion amended rather than kept

`five-minute-return.test.ts`' _refuses with NO DIGITS rather than a zero_
asserted `not.toHaveProperty("observed")`. Half of it still holds and is
asserted (no `percent`, no `from`, no `to`); the other half is what made states
3 and 4 one picture. The count now lives under `seen`, which keeps the first
half literally true: there are no digits in the **figure**.

### Gates

`pnpm build`, `pnpm lint`, `pnpm format:check` (seven files written with
explicit paths — never `pnpm format`, which writes `notes.txt`), `pnpm test`
(453 + 1,082 + 1,497 passing, **no `Unhandled Errors` block**),
`pnpm test:process` (59), `pnpm stories` (44/44), `pnpm invariants`
(**58 invariants hold**, with Epic 4's dated waiver printed), `pnpm links`,
`pnpm env:check`, `pnpm coverage:check`. Browser:
`security-abnormal-move.spec.ts` (3), and the three specs this change could
reach — `security-feed-degraded.spec.ts`, `security-relative-performance.spec.ts`,
`security-explorer-shell.spec.ts` — **20 passed**. `pnpm verify` and the full
`pnpm e2e` are the orchestrator's.

## The orchestrator's half — 2026-10-14

### The finding, and it is a correction to this repository's doctrine rather than to one spec

**Task 4.3.8's repair has been treated as _the_ fix for a self-serving spec for
three stories, and it is necessary but not sufficient.** That task found four
overview specs green against a server with the ranking deleted, each asserting
its own fixture, and the repair — _forward the server's own frames_ — has been
quoted ever since. This task's own Work section quoted it and then prescribed
the wrong break on top of it: _delete the refusal from the producer and watch the
spec stay green; if it does, the spec is serving its own answer._

**It is not.** A pass-through forwards the server's bytes **honestly**, so the
browser draws a fabricated `0.00%` exactly as faithfully as it drew the refusal
and every _the page agrees with the frame_ assertion is green under the break —
no matter how pure the forwarding. **Pass-through kills the
fixture-agrees-with-itself defect and does nothing whatever about a wrong
producer.**

What catches it is an assertion that reaches **outside** the frame.
`GET /market-data` answering `{"feed": null}` means no provider, which with Gate
1 decision 3 (no store-backed fill) means nothing has ever been observed — so a
**measured** return is fabricated **by construction**. That is
`overview-breadth-counts.spec.ts`' `tracked`-against-`GET /securities` shape, and
it is the arm CI always takes.

The break is red for exactly that reason, with the file's other tests still
passing:

```
✘ the region draws what the SERVER sent, figure or refusal
  Error: a gateway with no market-data provider has observed nothing, so a
  measured 5-minute return is fabricated
  Expected: false
  Received: true
```

**This owes an upward sweep** — `CLAUDE.md` carries Task 4.3.8's lesson in the
form that is now known to be incomplete — and it is written into Task 5.2.5.

### Four other premises of mine that were false

- **"Without them, state 4 collapses into state 3."** It did not: 5.2.3 had
  already shipped `No bars observed yet` against `No bar five minutes back`. The
  clause is still right for a better reason — the two frames now differ in
  **shape**, so the collapse is **unrepresentable** rather than merely avoided.
- **"Two new sentences, and no more."** There are **four**. The producer has
  three refusal kinds and each needs words; the brief enumerated only the two it
  was arguing about. All four carry their recorded reason for not being one of
  the eight already approved.
- **The date-repetition argument understated its own counter-case.** A
  same-day → time-only rule would **not** be a conditional grammar, because the
  endpoints are five minutes apart and no such span crosses a market date. Kept
  anyway, for three recorded reasons — which is a decision made on its merits
  rather than on a bad argument.
- **`STORY.md`'s Design work still said _the fifth of its kind_** against Gate
  1's own correction **in the same file**. Corrected in place.

### The gates, and the one red

- `pnpm verify` — **exit 0** at load 7.53, `58 invariants hold.`, **3,091 tests**.
- `pnpm e2e` — **256 passed, 16 skipped, 1 failed** at load **20.79**:
  `security-window-change.spec.ts`' _a slow window change…_, which is the known
  flake (`CLAUDE.md`: 5.6% pooled at four workers, 0/24 at one). **Measured
  rather than assumed**: re-run on this checkout at
  `-g "a slow window change" --repeat-each=24`, four workers, load 16.78 →
  **24/24 passed**. At 5.6% per execution, `P(0 in 24) ≈ 0.25`, so this is an
  ordinary draw and one failure in a full suite is expected. The spec is
  untouched by this change.
- **Ten stories × four widths: 106 px in every cell.** On the route, region
  **106 px** with content boxes 419 / 446 / 318 / 308.

### One judgement I reviewed rather than re-took

The route now **withholds the figure until `GET /securities` resolves the
symbol**, which is how states 1 and 2 become one input rather than two that must
be asserted not to collapse. It matches `RelativePerformance`, which needs the
resolved row for the same reason, and it costs the 174–277 ms a cold universe
answer takes — during which the held room is drawn, which is the state the floor
exists for. **Accepted.**

## For a stakeholder — a status report, 2026-10-14

**The region is now honest in all eight of its states, and the test that proves
it found something about how we test.**

For three stories this product has relied on a rule learned the hard way: a
browser test must not supply the answer it then checks, so it should forward the
server's own messages. That rule is right and it is **half the problem**. A test
that faithfully forwards a _wrong_ message is still green — so we proved it, by
deliberately breaking the server into inventing a number, and watching the
faithful test shrug. What catches a lying server is a question asked
**somewhere else entirely**: this deployment has no market-data provider, so it
has observed nothing, so any number at all is invented. That assertion goes red.

The region draws the same **106 pixels** in every state at every width, so
filling it never shifts the page under a reader, and nothing it says when it has
no answer can be confused with anything else it says.

One test failed in the full browser run and it is a known intermittent one,
unrelated to this work — measured rather than assumed: run twenty-four times on
this exact checkout, it passed twenty-four times.
