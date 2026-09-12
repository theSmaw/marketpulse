# Task 2.13.10 — Deployed, the four tests applied, documented, and an ADR

**Status:** Not started
**Story:** [2.13 Volume Chart & Time-Window Selection](STORY.md)
**Depends on:** 2.13.9

## Objective

Close the story: verify it **on the deployed site** rather than on a developer's
machine, apply the four design tests to what is actually on screen, finish
`VOLUME-AND-WINDOW.md` as the subject document, and record the decisions as an ADR.

## What the user can see when this lands

**Volume and a window control on the live site**, cold and from a deep link, at three
viewports — and the epic's exit criterion met in substance: search for NVDA, open it,
inspect recent historical **price and volume** over a period of their choosing.

## Work

- **Verify deployed, and note the two stores photograph differently.** The deployed
  store is backfilled nightly and answers the default window in full; a developer's
  answers it four-fifths short. **Both are correct** (`CHARTING.md` §11.3), and the
  deployed environment is the one place the coverage treatment is _not_ under
  observation — so a window that is short deployed is worth finding and showing,
  which a wider window now makes easy.
- **Poll for coherence rather than checking once.** The frontend's upload is not
  atomic: for roughly two seconds around a deploy that changes the artefact a cold
  load can be broken, in two distinct ways, and the window **opens** at the second
  the deploy step reports success.
- **Deep-link the window.** A cold load of a URL carrying a non-default window is the
  one path that exercises the address, the server's resolution and the first paint
  together — and `staticwebapp.config.json` is part of the artefact precisely so that
  works. Remember **three hosts behave differently** for an unmatched path; say which
  one you tested.
- **Apply the four tests to a screenshot of the deployed page**: would a stranger
  believe this is a real funded product; does it look designed rather than defaulted;
  is there a moment in it worth showing somebody; **does it feel alive**. The fourth
  has been answered "not yet, and not from here" **twice**, deferred by name to Epic
  3's motion vocabulary against real moving numbers. This story is the strongest case
  it will get before then, because a window change is a real transition between two
  real datasets — so answer it honestly and, if it is still no, say what would change
  it and who owns that.
- **Finish `VOLUME-AND-WINDOW.md`.** Everything the eight tasks before this found, in
  the shape `CHARTING.md` uses: what was measured, what was rejected, what a green
  check does and does not certify. Include the list **Story 2.14 inherits** in one
  place — the window vocabulary, the timeframe mapping's home, whatever the states
  left unplaced for provenance, and the new fixtures — because §17.5's equivalent
  list is the thing this story found most useful at its own start.
- **Write the ADR.** ADR 0027 is the last one; this is **0028**. Its subject is the
  decisions 2.13.1 and 2.13.2 took that outlive this screen: the window vocabulary
  Epic 8 reuses and Epic 11 pushes through `setTimeWindow`, the timeframe mapping, and
  the shared-axis property. ADRs are never renumbered and their decisions are never
  rewritten; a present-tense description that becomes false gets a dated amendment
  beside it. Update `docs/adr/README.md`'s index in the same change.
- **Sweep upward, and do it here rather than at the epic close.** A measurement that
  falsifies a governing document is swept the same day, and falsification travels
  **upward** — this story's figures touch `CHARTING.md` §16.5's trigger (which fires
  if a window wider than three months at `1d` is offered), `CLAUDE.md`'s gap list,
  `EPIC.md`'s status paragraph and the "What a user can see today" paragraphs in
  `CLAUDE.md`. Amend live claims, leave historical records standing, and grep for a
  sentence duplicated for legibility before correcting it.
- **Add this story's new unchecked claims to `CLAUDE.md`'s gap list**, and make
  mechanical whatever can be: a prose entry with a re-measure command is a check
  nobody runs, and a `verify` step is one that cannot be skipped. `pnpm
coverage:check` is the precedent for that migration. Every entry that stays needs
  its break **performed**, not assumed — a break that does not go red is equally
  evidence the break did not land.
- **Run the gates this change can break**, not only the one a task file names:
  `pnpm verify`, `pnpm e2e` and `pnpm test:database` if anything touched the data
  path, plus `pnpm e2e:deployed`.

## Done when

- Volume and the window control are verified on the deployed site, cold and from a
  deep link, at three viewports
- The four tests are applied to the deployed page and answered in writing, test 4
  included
- `VOLUME-AND-WINDOW.md` is complete, including what Story 2.14 inherits in one place
- ADR 0028 exists, the index lists it, and nothing earlier was renumbered
- Every document this story falsified is amended, dated, with historical records left
  intact
- `CLAUDE.md`'s gap list carries this story's unchecked claims, each with a re-measure
  that was actually performed
- `pnpm verify`, `pnpm e2e` and `pnpm e2e:deployed` pass
- The epic's exit criterion is demonstrated end to end on the deployed site and
  `EPIC.md` says so

## Notes

The fence is Story 2.14. The feed label's wording, a stitched series naming two
sources, the curated file's age, and the epic's formal close are **all** 2.14's. What
this task owes is an accurate statement of what is left.

And the honest caveat, in the shape 2.12.10 used: a green run here certifies the
chain and not coverage, the figures are one machine on one day, and nothing re-takes
them. What is mechanical is said to be mechanical; everything else is prose with a
date on it.

---

## Amended 2026-09-12 by Task 2.13.1 — one conditional sweep is now unconditional

`CHARTING.md` §16.5's reversal trigger is _"the first window control offering a
range wider than three months at `1d`"_, and the sweep bullet above is written as
_"which fires if a window wider than three months at `1d` is offered"_.

**It is offered.** [`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) §1.2 settled a
1Y window at `1d` — 252 sessions, 17.0 ms per render — so the trigger has fired
and §16.5 needs a dated amendment saying so rather than a re-reading of its
condition. Its 672-session row also becomes a historical figure at this close:
"max" was declined, so no control can reach it.

Two smaller carries for the same sweep:

- **§17.5 item 5's `1d` branches stop being unexecuted** the moment 2.13.6 ships
  a 3M window. Amend that item rather than leaving it as a standing warning.
- **The window vocabulary is the half of this story ADR 0028 exists for.** §4's
  table — the label, the accessible name, the address, the spoken sentence, the
  timeframe and the session count — is what Epic 8 reuses, Epic 11 pushes and
  Epic 13 distinguishes its scrubber from, and §4(b)'s "the address admits any
  count the control does not offer" is the single decision with the longest
  reach in it.
