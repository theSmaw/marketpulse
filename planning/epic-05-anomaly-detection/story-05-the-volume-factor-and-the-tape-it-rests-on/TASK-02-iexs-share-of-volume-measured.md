# Task 5.5.2 — IEX's share of volume, measured

**Status:** Not started
**Story:** [5.5 The Volume Factor, & the Tape It Rests On](STORY.md)
**Depends on:** 5.5.1

## Objective

**Every coverage figure in this repository is a minute-presence share. There is
no measurement anywhere of IEX's share of VOLUME**, and a security present in
65% of minutes may carry 2% of the shares. AC 1 gates the story on taking it.

Gate 1 established that AC 1 is **not** a gate on the whole story — AC 2's
same-tape rule removes the cross-tape bias AC 1 exists to bound — but the
measurement is still owed for two narrower things: a bound on the fallback, and
the product input on whether a live `iex/iex` figure is worth drawing at all.
**And Gate 1 widened it**: without per-bucket dispersion, AC 7's sample floor is
**chosen rather than derived**.

## What the user can see when this lands

**Nothing.** An operator surface and a dated observation.

## Work

- **Extend `GET /diagnostics/baseline-cost` rather than adding a route.** It
  already ships, already loops one security deliberately, already returns
  `sipRows`/`iexRows` via `store.tapeCounts`, and the owner already ruled
  (2026-10-14) that AC 1's _not in a route_ governs **computing for a reader**,
  not **measuring**. `CLAUDE.md`'s _run it, record, delete_ shape does **not**
  apply: that is for a throwaway harness, and this is a permanent operator
  surface whose existing justification covers the new question unchanged.
- **Report the ratio BOTH ways, because `STORY.md`'s single
  `sum(iex)/sum(sip)` conflates two different questions.** Over **all** `sip`
  minutes it is the **bias** of an `iex` numerator over a `sip` baseline —
  minutes IEX never printed stay in the denominator and contribute 0, which is
  honest because IEX's volume genuinely was nothing there. Restricted to
  **minutes present on both tapes** it is **IEX's share of volume**. The two
  differ by exactly the minute-presence shortfall, and the pair factors the bias
  into coverage × venue share.
- **An absent IEX bar is never a 0.0 sample in the per-minute distribution**
  (AC 4). It is excluded from that distribution and present in the all-minutes
  denominator.
- **Summed-then-divided for the headline, with the per-minute distribution
  beside it.** `Σiex/Σsip` is the volume-weighted mean of the per-minute ratios;
  the unweighted mean is a different number, because the intraday curve is
  U-shaped and thin midday minutes would get equal weight with the open. Carry
  **p10 / median / p90**, because the factor compares one 5-minute bucket rather
  than a session and the dispersion decides whether any single constant is
  defensible.
- **Carry per-bucket dispersion (CV)**, which is what AC 7's floor is derived
  from: relative SE ≈ `1.253·CV/√n`.
- **Reconciled is a per-tape count, not a ledger read** — `bar_coverage` is
  tape-blind (see 5.5.1). A session qualifies if it holds ≥1 `sip` row for that
  security **and** is on or after **2026-09-23**, the live writer's start date,
  because an earlier session cannot hold IEX.
- Every numeric declared `["number","null"]`. `fast-json-stringify` turns a
  `null` under `"number"` into **`0`** — here, _we could not measure_ into _IEX
  carries none of it_.
- **Keyed on `securities.id`, not reached through a join** — `windowQuery`'s
  measured finding: through a join the top node is a `Sort` **per security**,
  516 times. Sums come back as **strings** (`bigint`); parse beside the query.
- **Run it against the deployment and record the body VERBATIM** in this file.
  Then say plainly what it does and does not support: a 60-session window today
  exposes ~18 of ~62 sessions to two-tape writing, so any figure is a
  **partially-exposed** observation, and one session carries no variance.

## Done when

1. The route answers for a named security and in aggregate, with both ratios,
   the per-minute distribution and the per-bucket dispersion.
2. It has been **curled against the deployment** and at least one body is quoted
   verbatim here, with its date.
3. The figure's bound is stated: how many sessions were exposed, and that it is
   n=1 in sessions.
4. `pnpm verify` green; the query covered by `pnpm test:database` against a
   hand-built two-tape store, which **no existing database suite builds**.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
