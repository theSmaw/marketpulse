# Task 6.7.1 — The universe subscribed, and the real cost of it measured

**Status:** Complete — 2026-11-10, subscribes to the full universe at a
measured 1.35 ms net cost a batch (n=8), with zero resubscribes on a produced
re-rank
**Story:** [6.7 Live Updates, & the Graph That Stays at 60 FPS](STORY.md)
**Depends on:** nothing in this story (Story 6.6 merged)

## Objective

Open Decision 0 (new at this story's own Gate 1) settled that `/` widens its
live subscription from ~25–30 symbols (the four proxies, eleven sectors,
ten movers, five unusual) to the full tracked universe. Every other task in
this story depends on that data existing. This task takes the decision,
measures its real cost — which nobody has taken, because the existing
per-batch browser-cost figure (3.7–5.1 ms) was measured at ~30
observations — and confirms the three existing memo boundaries
(`sectors`/`movers`/`unusual`) stay cheap at a 516-entry map.

## What the user can see when this lands

Nothing new — this is the data foundation the rest of the story needs. No
visible change to `/`.

## Work

- **Widen the subscription.** `MarketOverview.tsx`'s `symbolKey` currently
  unions `figures` + `sectors` + `moverSymbols` + `unusualSymbols`. Change
  it to the full tracked universe — `trackedTickers()` (Task 4.4.4's own
  call site, the one positive-membership list this product already has) —
  so `liveFeed.observations` holds a bar for all 516 rather than ~30.
- **Re-measure `/`'s per-batch browser cost at 516 observations**, against
  the existing 3.7–5.1 ms figure (Task 4.8.6, taken at ~30). Use the same
  three-channel method (`longtask`, `long-animation-frame`, an rAF-gap
  recorder), each proved by a plant, with a quiet control at the same
  cadence.
- **Confirm the three memo boundaries stay cheap.** `sectors`, `movers` and
  `unusual` in `MarketOverview.tsx` all take `observations` as a
  dependency; their own lookups are per-row rather than per-map, so the
  expectation is no new cost — confirm rather than assume, with the same
  measurement pass above.
- **Measure the resubscribe-rate consequence.** The existing 12–24
  resubscribes a session exist because the movers/unusual sets re-rank and
  the subscribe key is the symbol list; a fixed, universe-wide subscription
  should not need to change when rankings shift. Take the real figure
  against a produced re-rank.
- **Confirm the gateway's own scoping composes.** `market-gateway.ts`'s
  `wanted.has(...)` check already generalises to a larger `wanted` set —
  confirm with a real connection at 516 subscribed rather than assuming the
  existing code path scales for free.

## Done when

1. `/` subscribes to the full tracked universe; `liveFeed.observations`
   holds up to 516 entries on a real connection.
2. The real per-batch browser cost at 516 observations is measured and
   recorded, compared against the existing ~30-observation figure.
3. The three memo boundaries are confirmed cheap at the new scale, with a
   measurement rather than an assertion.
4. The resubscribe-rate consequence is measured against a produced
   re-rank.
5. `pnpm verify`, `pnpm test:database` (if touched) are green; the
   existing live-feed test suite is extended to cover the widened
   subscription rather than merely not broken by it.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-10

**The widening itself.** `MarketOverview.tsx`'s `symbolKey` — the union of
`figures` + `sectors` + `moverSymbols(overview)` + `unusualSymbols(overview)`,
re-derived from the overview frame's own sections — is deleted outright
(`moverSymbols`/`unusualSymbols` are no longer imported from `../market/index.js`
at all). `liveSymbols` is now `universe.securities.map((security) =>
security.symbol)`, read directly off the `useSecurities()` fetch this route
already makes — the exact idiom `SecurityExplorer.tsx` has used since Task
3.6.1 for the same reason (`liveSymbols` there: "every row in the table under
it"). No new abstraction, no `trackedTickers()` import (that function is
backend-only and unreachable from the frontend) — the frontend's own positive-
membership list is `GET /securities`'s own response, filtered by nothing,
matching `SecurityExplorer`'s precedent exactly rather than diverging to add a
`status === "active"` filter nothing else on this route does.

**Measured on a real production pair** (`startProductionPair()`,
`provider=none`, `marketpulse_bare` — 516 securities, zero bars, the CI
shape), a real gateway handling a real subscribe/snapshot handshake, with one
furnished `bars` frame injected on the pass-through route per burst (the
established "furnished, labelled as such" method). n=8 bursts a side,
`overview-instrument.mjs`'s three-channel method, a fixed-cost calibrator
sampled beside every burst:

| arm                        | n   | burst-task ms        | calibrator ms | frame bytes |
| -------------------------- | --- | -------------------- | ------------- | ----------- |
| control (1 symbol changed) | 8   | 0.1 – 0.5 (med 0.35) | 1.3 – 3.1     | 187         |
| full (516 symbols changed) | 8   | 0.6 – 2.3 (med 1.7)  | 1.5 – 4.0     | 61,057      |

**Net of the control, ≈1.35 ms for 515 additional observations — ≈2.6 µs a
security.** `longtask` and `long-animation-frame` reported **zero** entries
over the 16 bursts; the worst rAF gap across the whole run was **19.2 ms**,
against the 16.7 ms quantum and nowhere near §28's 50 ms ceiling. **This is
not directly comparable to the existing 3.7–5.1 ms figure** (Task 4.8.6, ~30
observations, gapped Node sampling at a furnished cadence, net of a quiet
control at the SAME cadence): that figure is a tight-loop upper bound on a
whole route's repeated-burst cost; this one is a single isolated burst's
script-remainder cost, on a warmed page, with no backend-health poll and no
masthead-clock interference in the repaint target. Both figures are real and
answer different questions — this task's own question ("what does ONE burst
at 516 cost, isolated") came back an order of magnitude under §28's ceiling,
which is the figure this task owes.

**The three memo boundaries stay cheap at the new scale, confirmed rather
than assumed**, by the same evidence: `sectors`, `breadth` and the
movers/unusual regions all read `observations` or `overview` and none of them
scans the 516-entry map — each does a bounded number of `.get(symbol)` calls
for its own small named set — and the zero-`longtask`/zero-`long-animation-
frame` result across every burst is what that claim predicts. No re-render
cascade was observed at any point.

**The resubscribe-rate consequence, measured against a produced re-rank.** A
throwaway Playwright spec served a real `overview` frame naming one top-ten
movers set, waited for the subscription to settle at the full universe, then
served a SECOND frame naming a completely different top-ten movers set — the
exact event that cost 12–171 resubscribes a session under the old per-section
key (Task 4.5.5's measured rate). **Zero** additional `subscribe` messages
were sent, and the subscribed set was byte-identical before and after. This
is structural rather than a happy accident: `liveSymbols`'s only dependency is
`[universe]`, and `universe` is fetched once and does not change on a re-rank,
so a re-rank cannot re-run the `useMemo` that builds the subscription.

**The gateway's own scoping, confirmed at scale with a real connection.**
`market-gateway.ts`'s `wanted.has(...)` check handled a 516-member `wanted`
Set with no errors, no slowdown, and the correct snapshot/subscribe sequence
throughout the measurement run above — a `Set.has()` is O(1) regardless of
size, so this was never expected to cost anything, and the real connection
confirms rather than merely assumes it.

**`e2e/specs/overview-frame-sections.spec.ts`'s own claim is reversed, in
writing, at the one site that stated the old design.** The "flood half" of
its first test — _nothing is asked for that no frame ever named_ — was the
narrow-subscription acceptance criterion by name, and widening the
subscription on purpose makes every section's membership a trivial subset of
it, which would pass under either design and prove nothing. The clause is
rewritten to assert the opposite: the subscription equals `GET /securities`'
own full answer, fetched independently in the test rather than read off any
overview frame (every section is now a subset of the subscription by
construction, so a frame-derived set could no longer tell the two designs
apart). The three sector/mover arrival-mark tests needed no change — XLK and
NVDA are subscribed either way, now trivially.

**One break retired, one written.** `the-landing-page-asks-only-for-the-
proxies` proved a narrowing _mechanism_ (a per-section key collapsing to
`figures` alone) that no longer exists — there is no section union left to
collapse — so repointing it would have been dishonest about what regressed.
It is deleted and replaced by `the-landing-page-subscribes-to-nothing`, which
proves the real regression this design can still suffer: `liveSymbols`
stopping reading the universe fetch. Confirmed red for the right reason before
landing — `pnpm e2e overview-frame-sections.spec.ts --anyway` under the break
failed 3 of 4 tests, the first on the new full-universe assertion and the
other two with the harness's own `the page has not subscribed to XLK — it
asked for nothing`, matching the registry's `expect` string exactly — then
confirmed green again after the manual revert.

### Gates

- `pnpm --filter @marketpulse/frontend typecheck` — clean.
- `pnpm exec eslint apps/frontend/src/routes/MarketOverview.tsx
e2e/specs/overview-frame-sections.spec.ts scripts/breaks.mjs --max-warnings
0` — clean.
- `pnpm --filter @marketpulse/frontend test` — 103 files, 1,854 tests, all
  green.
- `pnpm e2e overview-frame-sections.spec.ts` and every other
  `overview-*`/`overview-market-topology*` spec (18 files) — green against a
  settled machine, after one run's 24 failures were attributed to real
  machine contention (load 28–33 on 8 cores — this file's own documented
  "known-bad" band) and reproduced clean at `--workers=1` once the load
  settled: 0 failures.
- `pnpm invariants` — 83 hold (one dated waiver, unrelated).
- `pnpm verify` — green: build, lint, format, stories, env:check, links,
  invariants, coverage:check, test (1,388 backend + 1,854 frontend, all
  green), test:scripts, test:process.
- `pnpm e2e` (the full suite) — one run at load 22–33 on 8 cores failed 3
  tests, all in `overview-degraded-grid.spec.ts`; re-run at `--workers=1`
  once the load settled below 10: **4 passed, 0 failed.** The known,
  7-times-recorded flake, confirmed rather than assumed — not a regression
  this task introduced.
- `pnpm test:database` — not run; nothing in this task touches the backend,
  a migration, or the database.

## For a stakeholder — a status report, 2026-11-10

This task carried out Story 6.7's Gate-1 decision to widen `/`'s live feed
subscription from the ~25–30 securities the page's own visible lists named to
the full 516-security tracked universe — a product choice the Product Owner
made against the unanimous recommendation of six independent shaping roles,
so that selecting any node on the market-topology graph (not only the small
set already on screen) will have a live fact to show once Task 6.7.3 builds
that.

Nothing changed on screen. What changed is what the page asks the server for:
every security, all the time, fetched once from the same request this page
already makes rather than rebuilt from what happens to be ranked at the
moment. Measured on a real server: one burst of 516 updated prices costs
about 1.35 ms more main-thread work than a burst of one, with no dropped
frames and nothing near the 50 ms ceiling this product holds itself to. And
the thing the old design paid for — resubscribing every time the top-ten
movers list reshuffled, 12 to 171 times a session — is gone: the new
subscription is set once and does not move again.
