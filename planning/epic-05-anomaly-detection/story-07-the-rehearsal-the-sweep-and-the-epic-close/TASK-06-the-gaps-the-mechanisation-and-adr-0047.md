# Task 5.7.6 — `docs/GAPS.md`, four mechanisations, and the ADR nobody wrote

**Status:** Not started
**Story:** [5.7 The Rehearsal, the Sweep, & Epic 5's Close](STORY.md)
**Depends on:** —

## Objective

Three obligations in one task, because they share a subject: what Epic 5 leaves
standing, what of it can stop being prose, and the one decision in this epic
with no decision record.

## What the user can see when this lands

**Nothing.**

## Work

**The entry that was never written.** Task 5.3.5's record says the two-tape row
inflation (~25% of steady state) was handed to `docs/GAPS.md`. **It is not
there** — verified; its two siblings from the same list are. Third recorded
occasion of this exact class in this repository. Write it, with the index-only
`count(*) filter (where feed = …)` re-measure, the store named (**deployed
only**), and a condition.

**AC 6's three named candidates are 0 for 3, and that is the honest answer.**
The two-tape inflation needs a store with `iex` rows; the pooled distribution's
bias needs a magnitude over 2.19 M samples and its mechanisable half already
shipped (`the-opening-bias-is-read-off-the-figure`); the relative-move weighting
effect needs a cross-sectional measurement. Each gets prose with a `Re-measure:`
and a condition. Say plainly in the close that none of the three is a check,
rather than reaching for one.

**What IS a single grep, with a break each.** Use
`a-ranked-score-list-is-one-cohort` as the pattern: a derived corpus, a vacuity
**anchor**, a clause keyed on the operation rather than a name, and a plant
written as the file the _next_ story writes. **Confirm each check passes wrongly
on that plant first, and keep the transcript.**

1. **`a-factor-reads-no-clock`** — discharges the surviving half of a standing
   entry: the four clock lint rules are scoped to `packages/shared/src/**`, so no
   backend factor has ever been mechanically pure (all are clock-free today —
   verified 0 occurrences). The corpus is **`market-composite.ts` plus the local
   modules it imports**, not the package and not a filename list. The clause a
   re-implementer cannot avoid is **the import into the one translation site in
   front of the mint**. The draft keyed on the five known filenames is green on
   `breadth-factor.ts` containing `new Date()` — that is the plant.
2. **`no-renormalised-score`** — `one-comparator-for-the-order-of-a-composite-score`'s
   failure message asserts `score / max` is "not permitted **anywhere**" and the
   check holds it only on comparator lines. **The division is the clause.**
   `ScoreRanked` has no `max` member, so a renormaliser must reach for
   `AnomalyScore.max` by name. Green today on a renormalisation that never orders
   anything — a progress bar, a `%`-of-maximum label, or a stored `ratio` column
   a later ranker sorts on. **Either add the clause or narrow the sentence; do
   not leave a message claiming a prohibition the check does not carry.**
3. **Every `var(--x)` in a CSS module resolves to a declared property.** Two of
   this epic's five ambers — `--service-degraded`, `--provenance-synthetic` — are
   outside `TOKEN_NAMES`, so the startup throw does not reach them and a `var()`
   resolving to nothing renders an invisible marker with a green `verify`.
   Stronger than adding two names, because Epic 6 adds a topology palette.
4. **`rowFloor: 6`** — a one-line repair, not a new check.
   `check-invariants.mjs:293` registers Epic 5 with `rowFloor: 1` against **six**
   rows, so five could be deleted and the anchor would still pass. Epic 3 and 4
   both carry 7 against 7. **This protects AC 3 and is the cheapest item here.**

**Four owners AC 8 forbids.** Three `docs/GAPS.md` entries name a **merged task**
as owner (`:4979`, `:5000`, `:5066`) — strictly worse than an epic number,
because the owner can never act — and one names an epic (`:4376`). Discharge or
re-own all four to a condition. Two are discharged by their own text: the
excess-move entry says "discharged the day a frame carries it", and a frame does.

**A gap this task should name rather than fix.** "Every `pnpm invariants` entry
is break-verified" is stated in `CLAUDE.md` **and** `docs/GAPS.md` and is checked
by nothing — and it cannot be audited by grep, because a break's `expect` is
sometimes an invariant's id and sometimes a substring of its failure message. It
is `every-break-can-still-land` with the arrow turned. A `provesInvariant` field
would make it one grep; that is a touch on every entry in a 5,900-line registry,
so write the entry and take the check only if there is room.

**ADR 0047 — a derived statistic reads the raw store and refuses rather than
adjusts.** The decision reverses Story 5.1's Gate 1 decision 1, answers
`PROVIDER.md` §3.1's standing rule, and rests on two arguments nobody had weighed:
a nightly provider fetch is ~1,172 paged requests against a ~3.3/s bucket, and a
provider-fetched baseline is **not reconstructible from anything we stored**,
which is invariant 4's and Epic 13's. It is validated rather than argued —
refused **5 of 516**, four on exact split factors, two above 1.0, which is why
the bound is a ratio and its reciprocal. Today it lives in a task file, a story
file, a `PROVIDER.md` blockquote and a **measurement note inside ADR 0044's
amendment**; `grep -n "provider" docs/adr/0044*.md` returns **zero**, and 0044's
four rejected alternatives do not include _ask the vendor_. Write it with three
rejected alternatives (ask the provider; adjust stored raw bars ourselves;
publish unadjusted and say nothing), its consequences, and a reversal trigger as
a condition — _the first reader that needs a total return rather than a price
return_, which needs `dividend` and the vendor's `split` parameter does not
supply it. Index it; point `PROVIDER.md` §3.1/§3.5 and ADR 0044's amendment at it.

**Not a new ADR:** the cohort rule, no-renormalisation and score-with-its-
explanation are all already in ADR 0046 §2 and §3 — checked in the text, not the
index. Absolute-versus-cross-sectional calibration is adequately recorded there
as a premise; if it wants a Decision clause it is a dated **amendment** to 0046.

**The withdrawn sentence, decided at Gate 1.** `Measured, but no history to rank
it against.` is **withdrawn**, recorded as a withdrawal with the arm's reversal
condition beside it — _the first nightly pass that stores a distribution of a
factor's own quantity_, on which firing the arm is deleted rather than
re-purposed, and the band floors' own trigger fires in the same commit.

## Done when

1. The two-tape entry exists; the three named candidates carry prose, a
   re-measure, a store and a condition.
2. Four checks land, each with a `pnpm break` entry, each proved red, and each
   with its wrongly-passing plant transcript recorded.
3. The four forbidden owners are discharged or re-owned to conditions.
4. ADR 0047 is written, indexed, and pointed at from the three documents that
   currently carry its decision.
5. The withdrawal is recorded with its trigger.
6. `pnpm verify` green with its invariant count quoted.

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
