# Task 4.8.13 — The suite's own two repairs: an assertion that sees its subject, and axe at a size that means something

**Status:** Not started
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.9

## Objective

**Added 2026-10-10 at the owner's decision**, from Task 4.8.9's
characterisation. Two repairs to the browser suite, both of them to the suite's
own instruments rather than to the product.

## What the user can see when this lands

**Nothing.** A reader sees nothing; a developer sees a suite that fails one run
in four stop doing that, and a slow family stop being slow for a reason that
bought no coverage.

## Work

### Repair 1 — the predicate counts the wrong elements

`security-gap-fill.spec.ts:165` fails at **25.0% per execution at the suite's
own four workers** (12 of 48) and 4.2% at one. **13 of 13 failures are line
219**, never 220, every one `Received array: [2]`.

**The assertion cannot see its subject.** ADR 0028's cover is `ChartPending`,
which is in full a `<div aria-hidden="true" className={styles.pending} />` with
**no text**, and the word `Fetching` exists nowhere in this product — `grep`
exits 1. What the predicate actually matches, quoted off the running pair at
t = 150–200 ms:

    p "Loading securities. Anything typed is kept and will match as soon as they arrive."
    p "Loading the tracked universe…"

**`SecuritySearch` and `UniverseTable` — the 518-row Explorer shell's own first
load, racing the sampling loop's start.**

**Count the cover by its own identity rather than by text.** It is
`aria-hidden`, so it is deliberately invisible to an accessible-name query —
which is the reason the text route was reached for in the first place. Prefer
the class the component already owns or a test id it is given here; do **not**
reach for a text match on a sibling, and do not widen the window to make the
race less likely, which is what the spec's own comment already tried.

**And the spec's own comment is a live false claim**, amended by 4.8.9 and worth
reading before editing: it attributed the flakiness to the sampling budget and
the final assertion.

**The acceptance figure is a rate, not a pass.** Re-run at **n ≥ 24 at four
workers**, under 4.8.9's protocol — the load gate refuses rather than warns,
`pgrep -f` first, load recorded either side — and **report the rate with its
confidence interval.** A single green run proves nothing at 25%.

### Repair 2 — axe over 518 identical rows buys runtime and no coverage

The suite's slow family is **eight tests at 15–49 s against a 30 s per-test
ceiling, six of them axe over all 518 rows at four viewports**. That is why
every recorded failure set is **disjoint**, and why a suite run takes this
machine from load **5.31 to 31.04** — **the browser suite is its own plant.**

**Scope the axe passes to a trimmed universe** — the route's own `GET
/securities` intercepted at ~20 rows, which Task 4.8.6 already does for its
control arm and Task 4.8.2 for its render counts — **and keep one
full-universe pass**, because the claim _axe is clean on the real page_ is
worth holding somewhere.

**The argument, which belongs in the spec rather than in this file:** axe's
findings are per **rule** and per **element kind**, not per element, so 518
rows of one shape exercise the same rules as 20. What 518 rows uniquely test is
**duration**, and that is `pnpm probe` and Epic 14's job rather than axe's.

**Two traps named before you meet them.** `e2e/README.md` records that **axe's
scope changes the answer** and that the two scopings must never be compared —
so the trimmed pass and the full pass are **two assertions, not one with a
different input**, and each says which it is. And a permutation grid conflicts
with landmark uniqueness only for landmarks with **no accessible name**, which
is a property of the page rather than of the row count.

**Measure the prize rather than asserting it**: the family's durations before
and after, at the same worker count, with the load recorded.

### Boundaries

**No product code.** If either repair wants a change under `apps/`, that is a
finding to report rather than a licence — the exception is a **test id on
`ChartPending`**, which is the one product edit this task may make, and only if
the class it already owns will not serve.

Not the other three flakes: `securities-route`'s margin, the process-suite
sighting (**measured as the machine at 79.2% under a plant and 0 of 48
quiet**) and `index.process`'s unreproduced one all stay as 4.8.9 recorded
them.

## Done when

1. The gap-fill assertion counts the cover by its own identity, and the
   wrong-subject match is gone
2. Its rate is re-taken at **n ≥ 24 at four workers** under 4.8.9's protocol,
   reported with a confidence interval
3. The axe passes run against a trimmed universe with **one** full-universe
   pass kept, each saying which it is
4. The family's durations are measured before and after at the same worker
   count
5. `docs/GAPS.md`'s entries for both are amended with what is now true
6. `pnpm verify` and `pnpm e2e` green — and if `e2e` is not green, the failures
   are characterised against 4.8.9's two families rather than re-run
