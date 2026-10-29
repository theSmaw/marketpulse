# Task 5.7.6 — `docs/GAPS.md`, four mechanisations, and the ADR nobody wrote

**Status:** **Complete — 2026-10-29. Four new checks, 74 → 78 invariants, and one of them found a LIVE DEFECT on `main` while being proved** — `SourceNote.module.css` read `--color-ink-secondary`, a token this product has never declared. AC 6's three named candidates are **0 for 3** and that is the honest answer. ADR 0047 written for a decision that had none. And `pnpm links` turns out to be **blind to an untracked document**.
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

## Amended by Task 5.7.2 — 2026-10-29: two more checks, and both come from verdicting the criteria

**5. `an-arrival-mark-is-keyed-on-the-arrival`** — Story 5.4's **AC 6** turned
out to have **no mechanical holder at all**. The criterion is _the arrival disc
keeps its shipped meaning and is not re-pointed at the figure_, it is mentioned
by number **nowhere** in its own story's directory, and the only instrument is a
grep over one file. Two things make it worth a check rather than prose. Its
subject is this repository's **most-repeated defect class** — a mark that says
_a bar arrived_ being quietly re-pointed at _this number changed_. And since
Task 5.6.7 the score is the row's **only** figure, so the defect is now
**cheaper to write** than when the AC was drafted.

The clause: no shipped file keys an arrival mark on anything but `arrivalKey`'s
answer — whose identity is the observation's own content,
`` `${startsAt}:${close}:${volume}` ``. The corpus is every shipped source file
in the three trees, not the four directories that draw rows, because a new
region is a new directory by this repository's convention and the first version
of `one-home-for-imperative-navigation` was **green on the file Epic 5 would
write** for exactly that reason. The plant is the defect the next author
actually writes: `arrival: String(row.score)`. Confirm the naive draft passes
wrongly on it **first**.

**6. `every-story-publishes-a-per-criterion-verdict`** — and this is the check
that would have prevented half of Task 5.7.2's work. Epic 5 has **59**
acceptance criteria and **33 had no verdict**, because 5.4, 5.5 and 5.6 each
closed without the `## Gate 2 — the acceptance criteria, verdicted` table that
5.1, 5.2 and 5.3 published. Epic 4's close found the same thing (three of eight)
and wrote it down, and the practice then got **worse**, not better: the three
stories that skipped it are the three most recent in this epic.

The clause keys on the thing a re-implementer cannot avoid: a story whose
`**Status:**` says complete carries a section naming its criteria and their
verdicts. The corpus must be `epicsWithStories()`' walk — every
`story-NN-*/STORY.md` under every `epic-NN-*` — and **never a list**, which is
the corpus failure this repository has recorded four times. Note the awkward
half honestly in the check's comment: it can see that a **table exists**, never
that its verdicts are **true** — which is the cheapest honest proxy and is how
`pnpm invariants`' own docblock describes every entry in it.

**It will go red on existing stories the moment it lands**, which is the point
and also the cost: either this close writes the three missing tables (Task 5.7.2
does, for Epic 5) or the check is scoped to stories closing after a stated date,
and a date is not a condition. Resolve that before writing it rather than
discovering it in the red.

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

## What was done — 2026-10-29

### AC 6's three named candidates are 0 for 3, and that is the answer

Story 5.7 names three claims for mechanisation. **None of them is a check**, and
saying so plainly is the deliverable rather than a shortfall:

- **The two-tape row inflation** needs a store with `iex` rows. The local store
  holds **48,449,712** `sip` and **zero** `iex`; CI holds zero bars. **And it
  was never written down at all** — Task 5.3.5's record says it was handed to
  `docs/GAPS.md` and it is not there, while its two siblings from the same list
  both are, which is what makes the absence invisible. **Third recorded occasion
  of a claim handed to that file and never arriving.** Written now, with an
  index-only re-measure, the store named, and a condition that **deletes** the
  entry rather than re-measuring it.
- **The pooled distribution's bias** — its mechanisable half already shipped
  (`the-opening-bias-is-read-off-the-figure`); what remains is a **magnitude**
  over 2.19 M samples. Left alone, owner already a condition.
- **The relative-move weighting effect** — the clause is already one home; the
  **effect** is a cross-sectional measurement. No grep can see it.

### Four checks that ARE a single grep: 74 → 78, each proved wrongly-passing first

Plus one one-line repair. Every one was **confirmed green on its own plant
before being fixed**, which is the step this repository shipped four guards
without in a single story.

**`the-epic-5-rehearsal-floor-is-current` — the repair, and it protects tonight.**
Epic 5 was registered with **`rowFloor: 1`** against **six** rows, so five could
be deleted and the anti-vacuity anchor would still pass — against an anchor whose
own purpose is _"a reformatted or relocated table makes this check pass without
reading anything."_ Raised to 6. Proved by removing five rows from a copy:

```
  ✗ the-epic-close-cannot-outrun-the-rehearsal-ledger
    LIVE-REHEARSAL.md's ledger has 1 rows for Epic 5; it had 6 when this check
    last read the file and the list only grows.
```

**`a-factor-reads-no-clock` — and the framing in `docs/GAPS.md` is what had kept
it open.** That entry argued the clock lint rules could not be widened to
`apps/backend/src` without an exemption list for `index.ts` and
`market-gateway.ts`. **The corpus did not have to be the package.** It is keyed
on `market-composite.ts` **plus the local modules it imports** — the one
translation site in front of the mint — so the clause is the **import**, and no
exemption list is needed because the corpus contains only factors by
construction. The plant was **the draft that entry's own text invites**: a check
keyed on the five filenames it prints, green on a new `breadth-factor.ts`
holding `const asOf = new Date();`.

**`no-renormalised-score` — and a sibling's failure message was claiming a
prohibition nothing held.** `one-comparator-for-the-order-of-a-composite-score`
asserts _"the order that is NOT permitted **anywhere**: `score / max`"_ while
holding it only on lines putting two `.score` reads either side of an operator.
The clause was **added** rather than the message narrowed, and the sibling's
message now names its holder. The plant is the one both existing checks were
green on: **a renormalisation that orders nothing** — `Math.round((100 *
score.score) / score.max)` as a `%`-of-maximum label. Measured: `75 invariants
hold.` with it live.

**`a-var-read-resolves-to-a-declared-token` — and it found a live defect on
`main`.** `tokens.ts` throws if a **declared** token is missing from the
stylesheet, and two of Epic 5's five ambers are not in `TOKEN_NAMES` at all. The
check asserts the other direction: every `var(--x)` read resolves to something
declared. Alongside the plant it reported **`SourceNote.module.css:231`**
reading **`--color-ink-secondary`** — a name this product has never declared,
six lines from six correct spellings of `--ink-secondary` in the same file.

**It was a visual no-op, and the reason matters more than the repair.** An
undeclared `var()` is invalid at computed-value time, so `color` **inherited** —
and `.note` sets the very same token, so the two agreed **by accident**. It
would have bitten the first day those two inks differed, which is the
content-of-a-kind-the-rule-has-never-held failure this repository already
records for `composes:`.

**`an-arrival-mark-is-keyed-on-the-arrival` — Story 5.4's AC 6, which had no
holder at all.** Two clauses, because there are two ways to mint one (a property
and a `useArrival(` argument list — a clause on assignments alone is green on
`useArrival(symbol, String(price), …)`). The corpus is **every shipped source
file in three trees**, and the plant proves why: the naive draft keyed on the
four row-drawing directories was green on
`AnomalyHistory/AnomalyHistory.tsx` holding `arrival: String(row.score)` — **the
region Epic 5 defers and the next story writes.**

**All four breaks run by me rather than taken on report:**

```
✓ apps/backend/src/return-percentile.ts broken → red → restored byte-identical.
  matched: a-factor-reads-no-clock
✓ apps/frontend/src/market/anomaly-score.ts broken → red → restored byte-identical.
  matched: no-renormalised-score
✓ apps/frontend/src/components/AbnormalMove/AbnormalMove.module.css broken → red → restored byte-identical.
  matched: a-var-read-resolves-to-a-declared-token
✓ apps/frontend/src/market/unusual-activity.ts broken → red → restored byte-identical.
  matched: an-arrival-mark-is-keyed-on-the-arrival
```

**Two stated false negatives, chosen over false reds.** `no-renormalised-score`
ignores a `max` divisor on a line that never mentions a score, because
`chart-time-axis.ts` divides by `MAX_HOURLY_TICKS` and a subject-blind clause
would be red on an axis stride. `a-factor-reads-no-clock` reads **direct**
imports only. Both limits are in the checks' own comments — a check that cries
wolf is disabled by the next person who trips over it.

### A gap found by watching a count rather than a verdict

**`pnpm links` is blind to an untracked document.** `check-links.mjs` builds its
corpus with `git ls-files`, so a brand-new Markdown file is invisible to it.
Writing ADR 0047: the run said `600 documents, 1907 cross-file links, 0 broken`
**before** the ADR existed and said **exactly the same** after it was written.
One `git add` later: `601 documents, 1911 cross-file links, 0 broken` — four
links that had never been checked.

**Only the count betrays it**, and the failure direction is the dangerous one —
silent, and affecting precisely the document most likely to have a wrong
relative path, because a new file is the one whose `../..` depth nobody has got
right yet. Recorded rather than repaired: making the corpus disagree with CI's
committed tree would be a worse property than this one.

### ADR 0047, for a decision that had no record

**A derived statistic reads the raw store and refuses rather than adjusts.** It
reverses Story 5.1's Gate 1 decision 1, answers `PROVIDER.md` §3.1's standing
rule, and is why 5 of 516 securities draw no percentile — and it lived in a task
file, a story file, a `PROVIDER.md` blockquote and a **measurement note inside
ADR 0044's amendment**. `grep -n "provider" docs/adr/0044*.md` returns **zero**,
and 0044's four rejected alternatives do not include _ask the vendor_, because
that is a different question answered in the same task.

Three alternatives rejected by name, the consequences including that
`split-adjusted` now has **one** reader, and a reversal trigger that is a
condition: **the first reader that needs a total return rather than a price
return** — because a split is a discontinuity with no economic content and a
**dividend** is not, and the vendor's `split` parameter does not supply it.

**Not** new ADRs: the cohort rule, no-renormalisation and
score-with-its-explanation are all already in ADR 0046 §2 and §3 — checked in
the text, not the index.

### Four owners AC 8 forbids, and the withdrawn sentence

Three `docs/GAPS.md` entries named a **merged task** — worse than an epic number,
because the owner can never act. Two are **discharged on their own terms** (one
says _"discharged the day a frame carries it"_, and a frame does); the third is
**split**, its reader half discharged and its cold-figure half re-owned to _the
first measurement of this pass on a store that has not already served it_. One
named an epic and is re-owned to a condition. All four struck rather than
deleted, so the record survives.

And the owner's sentence `Measured, but no history to rank it against.` is
**recorded as withdrawn** in the arm it belonged to, with the reasoning — the
fact is about the **product**, not the security; what it says is already drawn in
one home inside the cell's budget; its only honest alternative home exists on 4
of 39,936 pairs so it would ship unseen and unverifiable; and the arm itself is
scheduled for **deletion** when its condition fires. A sentence silently dropped
looks identical to one nobody got round to.

### And the three stories whose verdicts live in the close

5.4, 5.5 and 5.6 each gained a dated `## Gate 2` section saying **where** their
table is and **why it is not here**: it was reconstructed from task files weeks
later, and a verdict written by somebody re-reading the record is a different
artefact from one written by the people who did the work. Putting it in the
story would disguise that.

### Gates

```
pnpm build         exit 0
pnpm lint          exit 0
pnpm format:check  All matched files use Prettier code style!
pnpm links         601 documents, 1914 cross-file links, 39 anchor links, 0 broken.
pnpm invariants    78 invariants hold.        (74 before)
pnpm test:scripts  pass 21, fail 0
pnpm --filter @marketpulse/frontend test SourceNote
                   4 files, 68 tests passed  (the live CSS repair)
pnpm break × 4     all red on the intended check, all restored byte-identical
```

Load read **before** the invariants run: `2.75 3.61 4.39`. One warning prints by
design and will until somebody clears it:
`⚠ Epic 4's rehearsal row 4.7 is WAIVED 2026-10-13`.

**And a process note worth carrying.** A git hook in this working tree
auto-stages edited files, so a **planted** file turned up in the index during the
break proofs. It was cleared, and the tree was checked for every planted string
afterwards — `breadth-factor.ts` and `AnomalyHistory/` do not exist, and the
remaining matches are the checks' own comments and the break registry's
substitutions. Worth knowing before any future break: **a plant can ride along
into a commit.**

## For a stakeholder — a status report, 2026-10-29

This repository keeps a list of things it believes about itself that no automated
check can confirm. The rule is that anything which _can_ become a check _should_,
and this task worked through Epic 5's share.

Three claims the story nominated turned out to be unmechanisable, and the useful
part was saying so clearly rather than building something that looks like a
check. One of those three had never actually been written onto the list at all,
despite a record saying it was — the third time that has happened here, and it
stays invisible because a reader who checks finds the two neighbours and stops.

Four new checks did land. One of them **found a real defect in shipped code while
being tested**: a stylesheet referred to a colour this product has never defined.
It had no visible effect, for a slightly alarming reason — the browser silently
ignored the instruction and inherited a colour that happened to be identical. It
would have become visible the first time those two colours differed, which could
have been any future change by anybody.

A second finding is about the checks themselves. One existing check's failure
message claimed to forbid something **everywhere** while actually only looking in
one place, so the prohibition had a hole exactly where the next person would walk
into it. And a check that validates document links turns out to be unable to see
a **brand-new** document at all — it reports success over a file whose links have
never been examined, which is precisely the file most likely to have one wrong.

Finally, a significant decision made a fortnight ago had never been written down
as a decision — only as a side-note in work about something else. It is the
reason five securities out of 516 show no figure rather than a wrong one, and it
reversed an earlier decision in the opposite direction. It now has its own record,
with the alternatives that were rejected and the condition under which it should
be reconsidered.
