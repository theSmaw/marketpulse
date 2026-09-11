# Task 2.12.8 — The text alternative, and the walk that proves it

**Status:** Not started
**Story:** [2.12 Price Chart](STORY.md)
**Depends on:** 2.12.6, 2.12.7

## Objective

Give the chart a text alternative that **says something true**, and then walk
the page — keyboard, screen reader, greyscale, three viewports — the way Task
2.11.9 walked search, proving the properties a green `pnpm verify` and a green
axe run structurally cannot see.

The story names this as where charts usually fail, and it is right: a chart with
`role="img"` and the label "price chart" is a chart that has been made
technically compliant and conveys nothing.

## What the user can see when this lands

**A chart a person who cannot see it can still read.** The range, the change
over the period, the period itself, the feed — the same facts a sighted reader
takes off the plot, in a sentence. And a page whose every tab stop is visible,
including the chart's.

## Work

- **The text alternative says the things the picture says.** At minimum: the
  symbol, the window in market terms, the first and last price, the change, the
  high and the low, and the feed. Build it the way `series-announcement.ts`
  was built for the panel — a pure function, tested, not a template inlined in
  JSX — and reuse that module's vocabulary rather than inventing a second one
  for the same facts.

  **Assert the concatenation a screen reader is handed**, never a single
  element's text where the component splits it. That is on `CLAUDE.md`'s list of
  what a test must not assert, and it is there because this repository has been
  caught by it.

- **What the marks are in the accessibility tree** depends on what Task 2.12.1
  chose. A canvas has no DOM to describe, so the alternative is the whole of it;
  an SVG has one, so decide deliberately whether the marks are exposed or hidden
  and say why. Either way, 780 announced elements is a defect.

- **The keyboard walk, at more than one viewport.** `CLAUDE.md` records that a
  sticky header occludes focus and that the browser's scroll-into-view does not
  know it: measured on `/securities/NVDA`, **one** occluded stop at 1440×900,
  **four** at 768×800 and **two** at 390×780 — it worsens as the viewport
  narrows, so a development machine shows the least of it. The chart adds a tab
  stop to that page. Walk it at the same viewports the existing spec uses and
  extend that spec rather than writing a second one.

  And note the one repair does not help a target taller than the viewport: a
  full-width chart region at 390px is a plausible candidate, so measure rather
  than assume it inherits the fix.

- **Greyscale and colour-vision simulation**, over the finished chart rather
  than over the mark in isolation — Task 2.12.5 proved the encoding, this proves
  the composition, including gridlines, axis ink and the crosshair together.

- **The contrast floor.** Every ink the chart introduces is measured against the
  ground it sits on, and where a canvas value failed the floor, ADR 0026's
  exception applies and the measurement is recorded beside the token. Remember
  **a browser is the only level that can see contrast** — `getTokens()` throws
  in the test environment by design.

- **axe, scoped honestly.** Zero violations on the page, and never compared
  against a Storybook run — the addon scopes to `#storybook-root` and a
  whole-document run adds page-level rules a fragment cannot satisfy. And an axe
  pass is not accessibility coverage; this walk is the evidence, axe is the
  gate.

## Done when

- The text alternative is a tested pure function and states range, change,
  period and feed — and is correct in `partial` and `empty` as well as `loaded`
- The chart's marks have a deliberate, stated presence or absence in the
  accessibility tree
- The keyboard walk is extended to include the chart at all three viewports,
  and no stop lands behind the sticky chrome
- Greyscale and deuteranopia readings of the finished chart are recorded
- Every new ink carries a measured contrast figure
- axe reads zero violations on the security page
- `pnpm verify` and `pnpm e2e` pass

## Notes

The likeliest miss is the alternative that is true for `loaded` and false for
`partial` — "the price over the last five sessions" when the data covers four
and a half. The sentence has to be built from `coverage`, not from the window
that was asked for.

The second likeliest is a live region added here for the chart's reading, when
2.12.6 already settled the rate. Two polite regions updated in the same moment
are queued in an order neither component controls.

---

## Amended 2026-09-11 by Task 2.12.1 — the conditional in the Work section is settled

The Work section says _"what the marks are in the accessibility tree depends on
what Task 2.12.1 chose."_ It chose **hand-built SVG**, and it chose it **largely
for this task's benefit** — `CHARTING.md` §1 rejected the fastest library
candidate because it paints to seven canvases, leaving nothing to describe. So
the question does not collapse, it sharpens:

- **There is a DOM, and the decision to expose or hide the marks is now a real
  one that must be taken and stated.** The Work section's _"780 announced
  elements is a defect"_ is close to unreachable in the base chart, because a
  line of closes is **one `<path>`** rather than 780 elements — so the likely
  answer is that the `<path>` is `aria-hidden` and the text alternative carries
  everything. **Take that deliberately and say so**; arriving at it by noticing
  there was only ever one element is not the same as deciding it.
- **`role="img"` with a real label is the shape**, and the story's own warning
  applies with force: `role="img"` labelled "price chart" is the failure mode,
  not the solution.
- **The likeliest miss named in the Notes is now sharper.** The text alternative
  must be built from `coverage`, and `CHARTING.md` §6.2 makes the same point
  about the axis: the window **asked for** and the window **covered** are
  different, and `partial` is the normal case. A sentence saying "the price over
  the last five sessions" when the data covers four and a half is the same defect
  as an axis derived from the bars — stated in words instead of pixels.
- **Contrast has more surfaces to measure than the Work section assumes**, and
  §7 of `CHARTING.md` lists them: axis ink, tick-label ink, gridlines, the series
  line, the crosshair, and — if 2.12.5 draws one — the high–low band, which sits
  _behind_ the line and therefore changes the ground the line is measured
  against.
