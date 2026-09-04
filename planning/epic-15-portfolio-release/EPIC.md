# Epic 15 — Portfolio Release

**Status:** Not started
**Sequence:** 15 of 15 — follows Epic 14 (Performance & Scale Validation)
**Spec references:** PRODUCT_SPEC.md §38 (V1 flagship demo), §39 (portfolio narrative), §40 (success criteria)

## Goal

Turn the working system into a polished engineering portfolio piece.

## Outcome

Someone encountering MarketPulse for the first time can understand both the product and the engineering behind it.

## Scope

- Production deployment
- Polished demo scenario
- Seeded historical replay
- README
- Architecture diagrams
- Architecture overview
- Agent architecture documentation
- Performance report
- ADRs
- Testing strategy documentation
- End-to-end journey suite — **the harness exists, the suite has never had an owner**
- Demo walkthrough
- Screenshots/video
- Error-state polish
- Accessibility review
- Final UX polish

## Exit criteria

A technical interviewer can:

1. understand MarketPulse within a minute;
2. run or access it;
3. see a compelling demo;
4. inspect the architectural decisions behind it;
5. find concrete evidence of performance, agentic UI, real-time architecture and human-in-the-loop design.

## What Epic 1 hands this epic (2026-09-04)

**The end-to-end suite is a genuine hole in the roadmap and Epic 1 handed it
here explicitly.** `PRODUCT_SPEC.md` §41 puts "E2E tests" in **Phase 6 —
Portfolio polish**, whose home is this epic, and this epic's scope carried only
"Testing strategy documentation". So the **suite** was owned by nobody, which is
recorded in `../epic-01-application-foundation/EPIC.md` as a question left open
on purpose rather than an omission to fix there: answering it in Epic 1 would
have meant scoping tests for fourteen epics of features nobody had written.
Ownership is assigned here to match the spec.

**What already exists is a harness, not coverage.** Story 1.13 delivered
**Playwright 1.62.1**, a fourth workspace package at `e2e/`, ten local journeys
gating a merge as the `e2e` job, ten deployed journeys running after one as
`check-deployed`, an axe accessibility gate before the merge and an axe
**report** after it, and `docs/adr/0013-*`. So the tool, the specs' home, the CI
position, the post-deploy position and the rules for writing a spec
(`e2e/README.md`) are all decided. What does not exist is journeys over a
product — the twenty that exist drive an application that barely has behaviour.

**Epic 8 is where the suite should start growing, not where it starts
existing.** That is the checkpoint at which MarketPulse is a credible non-AI
product and the first point with journeys worth asserting on in quantity.
Treating this epic as the owner means the suite is _reviewed and completed_
here, not written from nothing here.

**Two other scope items are further along than they read.** "ADRs" — thirteen
already exist, `docs/adr/0001-*` through `0013-*`, so this epic's work is the
overview and the gaps rather than the record. "Accessibility review" — an axe
gate already runs against a real renderer on every merge, with the landing route
at 0 violations / 37 passes / 1 inconclusive, and Task 1.13.6 made that gate
assert it is not blind; what remains here is the judgement axe structurally
cannot make, including `color-contrast` over the non-text elements this product
encodes with. **"Production deployment" is not further along**: Epic 1 delivered
a _development_ environment and said so, and everything about promoting one to a
release is still this epic's.
