# Story 5.4 — `Unusual activity` on the Landing Page

**Status:** **Complete — 2026-10-17.** `/`'s **last reserved region draws** — five of seven now hold figures. Six tasks, six PRs (#592, #593, #596, #597, #598, #600) plus a pipeline repair (#599). Nine ACs met and four met as amended; **none outstanding**. The figure it ranks is a **magnitude**, so a crash and a spike were the identical row until a direction glyph shipped; the region **could not hold one row at any viewport height** where it was reserved; **ADR 0040's own forecast was wrong on two of three counts**; a pass-through proved fidelity and never correctness for the **third** time in this epic; and adding the region to the kept grid found **six existing aggregates lying**. Ships owing **a person**: `LIVE-REHEARSAL.md` row 5.4, the fourth this epic owes, and AC 1's undeclared viewport height.
**Epic:** [Epic 5 — Anomaly Detection](../EPIC.md)
**Depends on:** 5.3
**Epic scope covered:** unusual-activity ranking

## Description

**This is the landing page's last reserved region, and it is here rather than
at the end of the epic on the owner's instruction — as early as is honest.**

The owner's Gate 1 decision was to get `/` moving before the composite score
exists, by shipping **band chips rather than a numeric score**. The earliest
point at which that is honest is **after Story 5.3**, not after 5.1: a band is
a classification of how unusual something is, and before the percentile exists
the only figure available is the relative move. Ranking on that and calling the
region `Unusual activity` would be the over-claim this epic is most exposed to.

**So this region ships ranked by the price percentile, saying so**, and Story
5.6 upgrades it to the composite. The region is drawn today in `Panel`'s
`reserved` state with an `EPIC 5` tag and a sentence; it has a name, a landmark
and a place in the grid at every width, and it has to be filled rather than
designed in.

**A measured layout problem has to be solved before a single row is drawn.**
`Unusual activity` sits on `.regions` **row 1**, which is
`calc((82vh - 2 * var(--space-24)) * 7 / 30)` — **a length with no content
floor**, where rows 2 and 3 are `minmax(min-content, 1fr)` and have one. At
**1440×680 the region already scrolls by 4 px with nothing in it but the hatched
placeholder** (`clientHeight 117` against `scrollHeight 121`); at 1440×500 it is
82/121, at 1280×480 the same. **No content fits at 680, including zero rows.** So
the question is not how many rows fit — and **the shortest supported viewport
height for this screen has never been stated**, having been mistaken for a width
question for two stories.

## What the user can see when this story lands

**The landing page's seventh region stops being a placeholder.** `/` draws a
short ranked list of the securities whose recent behaviour is least like their
own history — each row carrying its rank, its **ticker as the only link**, and
its **band** — with the region stating what it ranked over and how many names
it heard from.

**Every row's destination already draws the explanation**, because Stories 5.1
to 5.3 filled the security page first. This is deliberate: a list of names with
nowhere useful to go is the trap Story 4.5 shipped and Story 4.6 had to repair.

## Gate 1 — decisions taken 2026-10-15, and six false premises corrected

**Five roles shaped this story and between them found six false premises, three
of which are in the acceptance criteria below and two of which were written
into this file by my own hand-offs at Stories 5.2's and 5.3's closes.** The
criteria are **left standing** as the record of what was specified; this section
amends them and **wins** where it disagrees.

### The four decisions

1. **The region ranks by the price percentile and draws the ORDINAL — there is
   no band chip in this story.** `packages/shared/src/anomaly.ts` deliberately
   refuses to hold the score→band boundaries (_"inventing thresholds now would
   be a number that outlives the guess that produced it"_), the four bands are
   defined for the **composite 0–100 score**, and this story ranks on one factor
   of four — so a chip here would read `extreme` on price alone. `AnomalyBadge`
   is drawn by **no shipped route** today. **This amends AC 11**: _nothing is
   unusual right now_ is read off the **ordinal** (a row reading `62nd
percentile` is visibly ordinary), not off band names. Alternative rejected:
   inventing the cut-points, which pays for them twice because Story 5.6
   re-derives them. **Reversal trigger: the first surface that needs to say how
   unusual something is without room for an ordinal.**
2. **Out of hours the last session's closing score is drawn, from a NIGHTLY
   PERSISTED row.** As written AC 12 was **unsatisfiable**: migrations stop at
   `0013`, there is no score table, and `trailing-window.ts` has **no
   store-backed fill** by Epic 5's own Gate 1 decision 3 — so a restarted
   replica (every merge) holds nothing, while a process that was up at the bell
   would serve yesterday's 15:55→16:00 pair **for ever**, because eviction is
   relative to `newest.bar.startsAt − retainMs` **inside `record()`** and
   nothing arrives when the market is shut. The baseline job already performs
   this read in **11.78 s**, so one row per security per session keyed by the
   session is [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)'s
   proven shape. **This dissolves the AC 3 ↔ AC 12 contradiction** rather than
   trading it: `MeasuredQualifier` has exactly two members, `observed` (minutes)
   and `session` (a date), so a persisted per-session score means the region
   genuinely **has** a session basis and `describeMeasuredSet`'s existing two
   grammars both apply — no third member, and no widening of the module
   `Market breadth` and `Movers` both read.
3. **The grid is RE-AREAED rather than floored**:
   `"topology topology" / "sectors unusual" / "movers breadth"`.
   **Corrected 2026-10-15 by Task 5.4.1 — that template is MINE and it is
   wrong: it names five areas for a SIX-region grid, omitting
   `Current investigations`.** A `grid-area` naming an undeclared area is not an
   error — it is auto-placed into an **implicit** row and looks plausible, which
   is the precise failure this stylesheet's own breakpoint comment exists to
   refuse. The shipped template has **four** rows, the fourth full width on an
   **`auto`** track rather than a third member of the `repeat(2, …)`, because a
   fourth `1fr` would hand a hatched placeholder the same 491 px as eleven drawn
   sectors. It resolves to `1392 × 103` at the foot of the page. **This amends
   AC 1 and AC 2**, whose shared premise — that the question is how many rows
   fit at a declared height — is false. Measured 2026-10-15 against the running
   pair: the region's own chrome is **exactly 159 px** (border 2, header 47,
   body padding + `.content` margin 48, list heading 16, two-line footer 48),
   which is **precisely today's 1440×900 box of 159**. So **zero rows fit at
   every viewport height**, one row needs 185 and five need 293 against a track
   of `(82vh − 48) × 7/30` — five rows would require a **~1950 px viewport**.
   **The binding case is 900, not the 680 this file diagnosed**, and the
   shortest supported height does not decide this region at all. Re-areaing
   gives row 1 a **1392 × 161** box spanning both columns, which is a _better_
   resolved box for Epic 6's renderer than 1026 × 161, and puts this region on a
   `minmax(min-content, 1fr)` row at ~491 px. Alternatives measured and
   rejected: a content floor on row 1 (+150 px once, document 1722 → 1872,
   four regions and the source note displaced, and the region stays 308 px
   wide); an internal scroller (AC 2 and §5.5 both refuse it).
4. **The frame section ships the factor values**, on **invariant 5** grounds —
   a drawn figure owes the figure it came from, and they are what lets a browser
   spec recompute rank order from the row's own factors. **This amends AC 8,
   whose stated justification is false twice over.** `breadth` is already a
   reduction on this frame and `overview-breadth-counts.spec.ts`' own header
   says so in those words, so an anomaly top-N is **not** "the first section on
   this frame that is a reduction rather than a selection" — it is the first
   ranked **list** whose rows cannot be re-derived from the snapshot. And
   shipping the factor values does **not** restore ADR 0038's property: the
   **cut** needs the population's 101 breakpoints × 501 securities (~417 KB),
   which is never going on this wire. Measured rather than estimated:
   **223 B a row, 1,281 B at five rows** — so AC 8's `~2.4 KB a section`
   presumed ten rows, which AC 1 explicitly refuses to decide.

### The other two false premises

5. **AC 9 is wrong that three triggers fire together.** ADR 0040's primary
   fires. **ADR 0038's frame-grain does not**: that trigger is about a
   **cadence** differing from the applied batch, and a 60-session baseline is an
   **input that changes nightly** — exactly `lastCloses`' shape, which has
   ridden this frame since Story 4.2 and never fired it. Each is still evaluated
   in writing, and the grain trigger is recorded **unfired**.
6. **The shared eligibility pass does NOT "split"** — the word is my own
   hand-off's and it is wrong. There is one call site of `eligibleMoves`, pinned
   by `breadth-is-counted-over-the-equities-alone`. This region needs a
   **different predicate**, which is a **second pass plus an intersection**
   computed downstream, leaving breadth's and movers' array byte-identical;
   "splits" implies mutating the shared one, which is the regression that
   invariant exists to refuse. `windowMinutes` therefore stays **one number per
   frame** (the freshness cutoff, which this region reuses), the 60-session
   lookback ships as **section data**, and the single `observedAt`/`computedAt`
   pair stays true of the whole frame — [ADR 0043](../../../docs/adr/0043-two-five-minutes-a-freshness-cutoff-and-a-measurement-span.md)
   having already settled that a cutoff and a lookback are different quantities.

### Three constraints found in shaping that no criterion covers

- **`pnpm probe` cannot perform AC 1's runs.** `scripts/probe.mjs` hard-codes a
  four-entry `VIEWPORTS` table and `--widths` only **filters** it; there is no
  height flag. Task 5.4.1 adds one.
- **The ranking is coverage-biased and no denominator sentence discloses it.**
  IEX per-symbol coverage runs from ~2.1% (`ERIE`) to near-complete, and a
  top-N **selects the tail**, so a sparsely-covered security enters the ranking
  only on the minutes it happens to hold a pair exactly five minutes apart.
- **`band` already names two things in this code.** `ReturnBand` /
  `fiveMinuteReturnBand` use _band_ for **a horizontal row** of
  `Abnormal-move indicators`, not a classification. Decision 1 keeps them apart
  for now by shipping no chip; whichever story ships the chip renames one.

### Handed sideways to Story 5.6 by this gate — the amber collision is YOURS

**`market.css` resolves `--anomaly-high`, `--feed-stale`, `--service-degraded`
and `--provenance-synthetic` all to `--palette-amber: #e2b544`** — one hex
value, four meanings, verified 2026-10-15. Decision 1 means **no amber fill
appears in this region**, so the conjunction never occurs on `/` in this story
and the collision is **not 5.4's to take**. It becomes real the moment a band
chip is drawn on `/`. It stays _correct_ either way, because neither is
colour-only — the chip writes its band name inside the fill and the feed cell
writes `STALE` — but it is not _coherent_, and the deferred-vs-degraded hatch
collision is the same mistake one channel over. **Prove it rather than argue
it**: the ramp's internal greyscale steps are 1.12 / 1.43 / 1.59 and the
chip-against-chrome step is **1.00**, which no greyscale simulation of the
region alone can show — it needs a **conjunction** row in the kept degraded
grid (a drawn chip _while_ the feed is stale), at four widths, in greyscale and
in colour.

### One residue the Gate 1 amendment absorbed, and it should not be absorbed silently

**AC 1's declaration obligation was dissolved rather than satisfied, and the
thing it asked for still does not exist.** Decision 3 above says the AC's shared
premise with AC 2 is false, and it is — the region is 491 px at 1440×680 and at
1440×900 alike, so the shortest supported height does not decide it. The row
count _was_ taken from measurement twice over (all three deliberate heights
probed in Task 5.4.1 with the instrument that task had to add, and ten rows from
a measured 168 px void against a 302 px budget at `27N − 1`).

**But no shortest supported viewport height is declared anywhere, and it remains
undeclared product-wide.** That is a live residue rather than a satisfied clause.
It was not invented here deliberately: UX recommended declaring **700** and was
explicit that it **could not be answered from this machine** without real device
and browser-chrome heights, and quoting heights nobody measured is what
`CLAUDE.md` forbids. **The cheapest instrument is the sitting already owed** —
Story 4.7's AC 5b on a real phone, which can report `window.innerHeight` while it
is happening, and `LIVE-REHEARSAL.md` row 5.4 is owed from the same session.

## Acceptance criteria

1. **The shortest supported viewport height is declared**, and the row count
   is **taken from a probe at that height with real content in it** rather than
   argued. `pnpm probe / --widths 1440,1024,768,390` plus deliberate runs at
   **1440×700 and 1440×680**. A tolerance is measured, never argued.
2. **No internal scroller.** A ranked list whose cut is invisible is the
   failure `MARKET-OVERVIEW.md` §5.5 exists about — _a ranked list looks
   equally confident whether its input was complete or not_ — and a 117 px
   window showing two of twenty rows layers a second, worse cut on the
   population cut the region must already confess. Whether row 1 gains a
   content floor is a **shared decision with Epic 6**, whose renderer needs a
   resolved box, and it fires `MARKET-OVERVIEW.md` §1.4's own trigger if
   filling this region moves a figure a reader is reading.
3. **The region states its own cut as well as its population** — how many are
   above the line, not just how many were heard from — from the **one builder**
   breadth's and movers' footers already use, in the grammar keyed on the basis
   the wire sent. A second builder is the duplication this repository fails a
   build over.
4. **One tab stop per row, and the ticker is the only activatable thing.** The
   figure is never the link; a reader dragging to select a number must not
   navigate. Destinations are resolved at render from the row's own identity, so
   the activation race is unrepresentable on a re-ordering list.
5. **The ranked-surface treatment is inherited, not re-decided** — ADR 0041:
   the FLIP on transform only, `--motion-duration-settle` twice, one settle for
   the whole list with no stagger, DOM order equal to visual order, rows and
   roving stops keyed on **symbol**, arrows **clamp** rather than wrap, the
   printed ordinal as the record that survives reduced motion, and `ORDER HELD`
   scoped to the region.
6. **The arrival disc keeps its shipped meaning and is not re-pointed at the
   score.** It fires when **a bar arrives for that security** and on nothing
   else. A score is the first figure in this product that can change with **no
   bar for its security at all** — its peers moved, or the window rolled
   forward — and a second meaning for one mark is this product's most-repeated
   defect.
7. **The tie-break is declared and reproducible.** Scores are integers over
   501 securities, so ties are routine rather than rare; two equal at displayed
   precision must never swap, a security with no score has **no rank**, and
   there is no `?? 0` anywhere. **Recommend ticker ascending**, because
   §5.2's checkability depends on the drawn order being reconstructible from
   the frame, and Task 4.5.8 broke a cut while every frame-checkable claim
   stayed green and 271 of 503 securities outranked the weakest row drawn.
8. **The frame section ships the factor values, not just the band.** An
   anomaly top-N is the **first section on this frame that is a reduction
   rather than a selection** — a reader holding the snapshot and the aggregate
   can re-derive which securities were eligible and what their moves were, but
   **cannot re-derive a score that depends on a 60-day baseline the frame does
   not carry**. Shipping the factor values per row (~240 B a row, ~2.4 KB a
   section, against the movers' measured 124.3 B a row) restores the property
   ADR 0038's grain rule exists for.
9. **Three recorded reversal triggers fire together the first time a score
   reaches this frame**, and each is evaluated in writing: ADR 0040's primary
   (_an anomaly score over a trailing session_ — the shared eligibility pass
   **splits**, and the window sentence becomes per-region rather than
   per-screen), ADR 0038's frame-grain (_a cadence that differs from the
   applied batch_), and ADR 0038's narrower one when Epic 7's tools arrive.
10. **The region's states join the kept grid** — thirteen states × four widths
    × seven surfaces, partition by drawn string equal to partition by declared
    class, failing in both directions. New surfaces mean new declared classes,
    and the rule is that **a content class is one aggregate**.
11. **The ordinary case is not an apology.** The region draws its rows
    whenever anything is scored, with the band carrying the verdict per row, so
    _nothing is unusual right now_ is read off the band names rather than off a
    sentence. `No scores yet.` remains for the genuinely unscored state, in the
    region's own words and honest at zero.
12. **Out of hours, the last session's closing scores are drawn and labelled
    with their instant.** An anomaly score has **no session basis** the way
    breadth and movers do, and the market is shut about 80% of the week — a
    region blank in four of five screenshots looks broken.
13. Scoring is over the **501 equities**, by the same positive-membership
    selection breadth and movers use, and the region says so. Scoring the
    fifteen proxies would make this region and `Market proxies` /
    `Sector performance` non-independent.

## Design work

**The region has never been drawn, and the canvas has no anomaly page at all** —
27 files and none on this subject. What exists to build from: the amber ramp as
tokens, with greyscale separations measured at **1.12, 1.43 and 1.59**, which is
_why_ the band name is written inside the fill; the constraint that the ramp is
**fills, never text, at any size**; and `AnomalyBadge`'s four named bands.

**One token-level collision to take to Design rather than inherit:**
`market.css` says the amber ramp is _"for anomaly intensity **and** for the
stale-data marker"_ — so from this story amber means _unusual_ in one place and
_stale_ in another, **on the same screen**. Colour is never the sole encoding, so
it stays correct; two meanings for one ramp is still a decision worth taking.

**And deleting this region's `reserved` panel leaves a finding live for Epic
6's.** Task 4.7.9 row 08 found that a rollback omitting a section draws a region
**exactly like one this product has not built yet** — same hatch, same muted
sentence, differing only by the **absence** of an `EPIC n` badge.

## Out of scope

The composite 0–100 score and the numeric figure on this list (Story 5.6), the
volume factor, and any score in the universe table.

## Handed here by Story 5.2's close — 2026-10-14: you are the story that fires two triggers, and one of them is in Epic 5's own file

**1. The figure you will rank already exists and is computed for ONE security on
demand.** `fiveMinuteReturn(window, { asOf })` is pure, takes the trailing window
and an `asOf` as arguments, and refuses rather than stretching. Nothing computes
it for 516 securities, and that is the line.

**2. Computing it per security in the socket callback fires Epic 14's THIRD
condition**, which lives in `EPIC.md` rather than in Epic 14's file: _the first
computation added to that callback that **derives a figure per security**, rather
than ranking or counting figures the join has already produced._ Story 5.2
evaluated it and it did **not** fire, for exactly one reason — a ring-buffer push
is storage, and the return is computed on demand for the security on screen.
**You are the story that changes that**, and the trigger is written against you
in all but name.

**3. And putting it on `/` fires the SECOND condition too** — _the first surface
on `/` that renders one element per tracked security_ — unless you rank into a
short list, which `PRODUCT_SPEC.md` §9's _Unusual activity_ panel already is.
Epic 5's `EPIC.md` says the honest alternative is a **top-N feed** and leaving the
universe table alone; Story 4.5 shipped the ranking-is-a-SELECTION idiom
(`moveRankingKey`, `compareByMove`, `selectMovers`, with
`one-comparator-for-the-order-of-a-move` refusing a second comparator) and you
should inherit it rather than write a second.

**4. Measure before you merge, not after.** Story 5.2's window costs are in Task
5.2.5's record with their caveats; the thing nobody has measured is **the return
computed 516 times a batch**, which is your arm. The two caveats are not optional
and are stated separately: a gapped Node sample inflates and the calibrator
**does not divide out** (4.38× subject against 2.29× calibrator), while a browser
figure reads ×1.00.

**5. ADR 0040's reversal trigger is yours to evaluate.** _The first aggregate on
this screen whose honest window is not breadth's_ — Story 5.2 recorded that it
did not fire, because a five-minute return is not an aggregate and is not on `/`.
**A ranked list of these figures on `/` is both.** If its honest window is not
breadth's five minutes, that trigger fires and the frame grain goes with it.
[ADR 0043](../../../docs/adr/0043-two-five-minutes-a-freshness-cutoff-and-a-measurement-span.md)
is why the return's span and breadth's cutoff are different quantities that
happen to share a number.

**6. A pass-through spec will not catch a wrong ranking.** Task 4.3.8's repair is
necessary and **not sufficient** — proved by Task 5.2.4, which broke a producer
into fabricating a figure and watched a pure pass-through stay green. Your spec
needs an **independent recompute** (`overview-movers-ranking.spec.ts` recomputes
all 503 moves) or an **external reference**; `docs/GAPS.md` carries both shapes
and the count of which existing specs have one.

## Handed here by Story 5.3's close — 2026-10-14: ADR 0040's reversal trigger fires on you, and it takes ADR 0038's frame grain with it

**1. The percentile you will rank exists, is refused honestly, and is per
security on demand.** `return_baselines` holds 101 breakpoints and a counted
`sample_count` per `(security_id, observed_at)`; the comparison is computed for
**one** security when somebody is looking. Nothing computes it for 516.

**2. ADR 0040's reversal trigger is _the first aggregate on this screen whose
honest window is not breadth's_ — and a ranked list of percentiles on `/` is
both an aggregate and on that screen.** Story 5.3 evaluated it and it did **not**
fire, because a percentile is one security's figure and is not on `/`. **It
fires on you**, and the lookback that fires it is the clearest instance the
condition has ever had: breadth's window is **5 minutes**, the baseline's is
**60 trading sessions**.

**What falls due in the same instant**, so it is not discovered mid-task:
`windowMinutes` stops being one number per frame; the **shared eligibility pass
splits**, because the population eligible for a five-minute return is not the
population with a 60-session baseline; the single `observedAt`/`computedAt` pair
stops being true of the whole frame; and **ADR 0038's frame-grain trigger fires
with it**. That is a product decision — two denominators on one screen — rather
than plumbing.

**3. You are also the story that fires Epic 14's backend condition**, evaluated
and unfired three times now: _the first computation added to that callback that
derives a figure per security_. Story 5.2 priced the window at **1.8–4.1 µs a
batch** and the worst case (516 in one batch) at **30.8–37.1 µs**; the percentile
lookup is a bounded search over 101 breakpoints and is cheap, but **516 of them
in the socket callback is the shape the condition names**.

**4. Eleven securities have no percentile at all today**, and your ranked list
must say so rather than rank them last. `BASELINE_MINIMUM_SAMPLE = 2500` refuses
`ERIE`, `NVR`, `AIZ`, `ESS`, `WST`, `GL`, `IEX`, `CINF`, `PKG`, `L` and `VRSN` —
and a twelfth class, the securities whose window crosses an unadjusted split,
refuses for a **different** reason that must not read the same. A ranked surface
that silently drops a refused security is `Movers`' own lesson one surface over:
**the population is part of the claim**.

**5. A pass-through spec will not catch a wrong ranking.** `docs/GAPS.md` carries
the two sufficient shapes and Story 5.3 proved they are not interchangeable: a
planted `rank × 0.8 when n > 500` left the **golden sample green** and was caught
only by an independent recompute.

## Gate 2 — the acceptance criteria, verdicted — reconstructed 2026-10-29 at Epic 5's close

**This story closed without a per-criterion verdict table, and so did Stories
5.5 and 5.6.** Stories 5.1, 5.2 and 5.3 each published one; three of six did not,
and they are the three most recent — so the practice got **worse** across the
epic rather than better, which is the same thing Epic 4's close found (three of
eight) and wrote down.

**The table for this story's thirteen criteria is in
[Task 5.7.2's record](../story-07-the-rehearsal-the-sweep-and-the-epic-close/TASK-02-the-fifty-nine-criteria-verdicted.md).** It is there rather than here deliberately: it
was **reconstructed from this story's task files** rather than written at this
story's own close, and a verdict written weeks later by somebody re-reading the
record is a different artefact from one written by the people who did the work.
Putting it here would disguise that. Each row names its instrument, says whether
it is a **re-take** (a command a clean clone can run) or a **dated reading**, and
— new at this close — **which store the reading came from**, because "verified"
in this epic frequently means verified in the **refusal arm** on a machine with
no bars.
