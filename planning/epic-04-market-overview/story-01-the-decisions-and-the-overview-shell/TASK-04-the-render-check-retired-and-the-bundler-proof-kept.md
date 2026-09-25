# Task 4.1.4 — The render check retired, and the bundler proof kept

**Status:** Not started
**Story:** [4.1 The Decisions & the Overview Shell](STORY.md)
**Depends on:** 4.1.3

## Objective

**Story 1.4's render check sits in the topology region, and this epic is the
first thing with a reason to remove it — but it is load-bearing, and the load
it bears is invisible.**

The route file says so in its own comments:

> _"The `@marketpulse/shared` import is still the load-bearing line — it is the
> only thing proving the workspace dependency resolves through the bundler as
> well as through `tsc`, and the two use entirely different resolvers."_

And Task 1.5.1 recorded the number: routing the check out of the graph would
**quietly remove about 100 kB** from the artefact, _"one nobody should be able
to reclaim by accident."_

> **So this is a deletion with a trap in it, which is why it is its own task.**
> Delete the check and the bundler proof goes with it — silently, with
> `pnpm verify` green, because `tsc` resolves the workspace package perfectly
> well through a completely different resolver. The failure appears the day
> somebody changes a `package.json` and nothing notices.

## What the user can see when this lands

**The topology region stops being a demo and starts being an honest
deferral** — it names Epic 6 and says what will be drawn there, exactly like
the other regions.

The screen gets **quieter and more truthful** in the same change: a landing
page whose largest region is a component gallery is a landing page that looks
like a scaffold, which §5.6 names as the thing this product must never look
like.

## Work

- The render check removed from the route
- **The bundler proof replaced rather than dropped**, and the replacement is
  mechanical: a check that fails if the frontend bundle stops containing
  something that could only have come through `@marketpulse/shared`. The
  existing idiom is `pnpm invariants` reading `apps/frontend/dist/` — one
  invariant already does
- **A `pnpm break` entry for it**, and run: a check that has never gone red has
  never been tested
- The ~100 kB delta measured either side and recorded, because a number that
  moves and is not written down is indistinguishable from one that was
  mis-recorded
- Story 1.4's and Task 1.5.1's records left standing — they are history, not
  live claims

## Done when

1. The route renders regions and no component gallery
2. The bundler proof is a check rather than a component, break-verified
3. The artefact size either side is recorded with its date
