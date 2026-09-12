# 0026 — The design canvas as the source of truth, and what a reconciled token layer certifies

**Status:** Accepted
**Date:** 2026-09-11
**Supersedes, in part:** [0022](0022-the-design-refresh-three-typefaces-an-identity-accent-and-what-a-token-change-certifies.md) — its three-face typography, its palette values, its 36px control height, and its standing as the origin of the language. Its _decisions_ about how the language is structured are unchanged and still govern.

## Context

Until 2026-09-11 the design language originated in this repository.
`VISUAL-LANGUAGE.md` was written first, `tokens.css` implemented it, and an
external mock was explicitly **a reference and not a specification** — ADR 0022
says so of `story-10-design.html`, and `SEARCH-AND-SELECTION.md` §5 says it
again of `2.11-design.html`. Both times the repository took some positions,
narrowed others and declined the rest, and recorded which was which.

That arrangement has a failure mode, and it showed up twice in two days. A mock
arrives, the disagreements are adjudicated one at a time by whoever is
implementing, and the two artefacts drift — so "what does the product look
like?" has two answers, and the one people _design against_ is not the one that
ships.

The user's instruction on 2026-09-11: **the two systems should be the same, and
the canvas is the source of truth.**

## Decision

**`Component library for MarketPulse` — the Claude Design project — is the
source of truth for the visual language.** It is reached from the repository
with the `DesignSync` tool, which reads it and can write to it, so the
reconciliation is mechanical rather than a re-typing exercise.

**Its address, added here 2026-09-11 because this ADR named the canvas without
saying where it is:**

```
https://claude.ai/design/p/727b5b14-fe78-47c1-9d9c-fb84b6ce5280
```

The last path segment is the `projectId` every `DesignSync` method takes. Two
things about reaching it that cost a session the first time and would cost the
next one the same:

- **It does not appear in `DesignSync`'s `list_projects`.** That method filters
  to projects of type `PROJECT_TYPE_DESIGN_SYSTEM`, and this canvas is a
  `PROJECT_TYPE_PROJECT`. `get_project` on the id above confirms it exists and
  is writable; the listing simply does not include it. A reader who goes looking
  for the canvas there finds an empty result and concludes it was never created,
  which is the wrong conclusion and an easy one to reach. The type is immutable
  at creation, so this is permanent rather than a setting somebody can correct.
- **The canvas is one file**, `MarketPulse Design System.dc.html`, plus a
  generated `support.js` and a `.thumbnail`. It is a single flowing document of
  numbered sections rather than separate artboard files, so adding to it is a
  read-modify-write of that one path and `finalize_plan` needs `deletes: []`
  passed explicitly even when nothing is being deleted.

#### Amended 2026-09-11 by Task 2.11.8 — **the one-file rule has hit a mechanical ceiling, and the canvas is now two files**

The bullet above is still the right description of how the canvas was built and
is no longer a description of how to add to it. `DesignSync`'s `get_file` caps a
read at **256 KiB**, and `MarketPulse Design System.dc.html` is larger than that:
a read of it returns exactly **262,144 bytes** and stops mid-attribute. So a
read-modify-write of that path is no longer possible — the only version of the
file available to write back is a truncated one, and publishing it would destroy
everything past the cap.

Task 2.11.8 therefore added its design as a **second file in the same project**,
`Universe navigation.dc.html`, rather than as a ninth section of the first. That
is a departure from the bullet above and is recorded rather than quietly done.

Two consequences for the next author:

- **Check the size before planning an edit to the main canvas.** A `get_file`
  that returns 262,144 bytes exactly is a truncation, not a file that happens to
  be that size. Nothing in the tool says so.
- **The chain of authority is unchanged.** A second file is still the canvas;
  what it costs is the property the single document had — that the whole
  language could be read top to bottom in one place. Restoring that would mean
  splitting the first file, which is a job with the same hazard in it and is not
  this task's.

#### Amended 2026-09-11 by Task 2.12.2 — **the canvas is three files**

The amendment above is a correct account of why the main canvas can no longer be
read-modify-written and of the precedent it set. What has become false is its
count: Task 2.12.2 added **`Price chart.dc.html`** as a third file, for the same
mechanical reason and by the same route.

So the pattern is now the arrangement rather than a departure from one, and the
next author should expect to add a file rather than a section. What that costs is
still what the amendment above said it costs — the whole language can no longer
be read top to bottom in one place — and the ceiling that caused it is still the
256 KiB `get_file` cap, which no number of new files removes.

The chain of authority is now:

```
the canvas  →  VISUAL-LANGUAGE.md  →  tokens.css  →  components
```

Each link is a change to the next, and **the first link reverses a rule that
has held since Story 1.4**: where `VISUAL-LANGUAGE.md` and the canvas disagree,
the document is wrong. Downstream the old rule is unchanged — a component still
may not diverge from the document.

#### Amended 2026-09-12 by Task 2.12.4 — **the canvas is four files**

The amendment above predicted its own expiry and named the mechanism: a count in
a present-tense sentence is the kind of claim `CLAUDE.md` says becomes false
quietly. It did, in a day. Task 2.12.4 added **`Price region.dc.html`** as a
fourth file.

**And it was added for a different reason from the first three, which is the part
worth recording.** The second and third files exist because of a mechanical
ceiling — the 256 KiB `get_file` cap makes a read-modify-write of the main canvas
impossible. This one exists because of a **scope boundary**:
`Price chart.dc.html` settled every mark on the plot and deliberately did not
settle what the Price _region_ is once a chart is in it — where the current value
sits, what becomes of the eight facts already stated beneath, and what a frame
looks like with nothing in it. Those are a different question about the same
subject.

So the arrangement now has two kinds of file in it, and the next author should
expect to add one for either reason. What neither removes is the cost the first
amendment named: the whole language can no longer be read top to bottom in one
place.

**A standing instruction rather than a fourth count**, so this section stops
needing an amendment per file: **do not restate the number here.** `list_files`
on the project is the answer and it is one call. What belongs in this ADR is the
rule — _a design that does not fit the main canvas is added as its own file_ —
and that rule has now held four times.

### The one standing exception

**Where a canvas value fails a measured accessibility floor, the intent is
adopted and the value is not.** The deviation is recorded with its measurement
beside the token that carries it.

This is not a licence to re-litigate values by taste. It is narrow, it is
arithmetic, and it has fired three times already:

| Canvas                            | Measured                                             | Shipped instead                                                                                                              |
| --------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Input boundary `#c4c6cf`          | 1.70:1 — WCAG 1.4.11 wants 3:1 to identify a control | `--rule-control: #74777f`, 4.48:1, taken from the canvas's own `--mp-ink-3`                                                  |
| Placeholder `#74777f`             | 4.48:1 — 1.4.3 wants 4.5:1 for text                  | `--ink-secondary`, 6.49:1, plus a face and weight change so a hint cannot read as a value                                    |
| Validated tick in `--mp-up` green | Passes contrast; **fails meaning**                   | Achromatic. Green is `--price-positive` on every screen in this product, and a second meaning for it is worse than no colour |

The third is the one worth noticing: it is not a contrast failure. It is the
canvas proposing a colour that is already spoken for _in this product_, which
the canvas has no way to know.

### What was reconciled

|                             | Was                              | Now                                                 |
| --------------------------- | -------------------------------- | --------------------------------------------------- |
| Page ground                 | `#f6f7fa`                        | `#f8f9ff`                                           |
| Sunken ground               | `#f0f2f6`                        | `#f2f3f9`                                           |
| Primary ink                 | `#14171c`                        | `#181c23`                                           |
| Secondary ink               | `#5b5e66`                        | `#43474f` (8.87:1 on the page ground, up from 6.05) |
| Disabled ink                | `#9ba0aa`                        | `#74777f`                                           |
| Hairline                    | `#e2e5ec`                        | `#e2e4ed`                                           |
| Price up / down             | `#046a38` / `#ba1a1a`            | `#0f7b50` / `#c5221f`                               |
| Radius                      | `0`                              | `3px`                                               |
| Control height              | 36px                             | 34px                                                |
| Display / subheading / body | 40 / 18 / 15                     | 28 / 16 / 13                                        |
| Faces                       | three (Hanken, Inter, JetBrains) | **two** (Hanken, JetBrains), three roles            |
| Authorship colour           | deferred by ADR 0025             | landed as `agent.css`                               |

## Alternatives

**Keep the repository as the origin and treat the canvas as a reference, as
before.** Rejected by instruction, and the instruction is right about the
failure: two adjudications in two days produced a set of per-decision outcomes
that nobody could read off either artefact. The cost of rejecting it is real
and is recorded under Consequences.

**Generate `tokens.css` from the canvas mechanically.** Attractive and
premature. The canvas's `:root` is a flat list of eighteen values with names
from a different vocabulary — `--mp-line-strong`, `--mp-signal` — and the
mapping onto this product's _roles_ is the part that needs judgement, as the
three deviations above show. A generator would have shipped a 1.70:1 input
boundary. Revisit when the mapping has been stable for an epic.

**Adopt only the colours and keep the type scale.** Rejected as the worst of
both: it is exactly the per-decision drift this ADR exists to end.

## Consequences

- **The repository can no longer settle a visual question by argument alone.**
  A better idea now goes into the canvas first. That is the point, and it is
  also the cost — the arguments in `VISUAL-LANGUAGE.md` are what stop a value
  being "fixed" by the next reader, and the canvas carries values without them.
  The document therefore keeps its reasoning and loses its authority, which is
  an unusual split and has to be stated in the file itself. It is.
- **Prose got denser.** `--font-size-body` is 13px, the same as
  `--font-size-dense`. The distinction the repo drew between reading and
  scanning is kept in **leading** — 13/20 against 13/18 — because at one size
  that is the half of the argument that survives.
- **Inter is gone**, with its `@fontsource-variable` dependency. Two faces,
  three role tokens; `--font-display` and `--font-sans` resolve to the same
  stack and are deliberately not collapsed, so a third face returning is a
  value change rather than an audit.
- **`agent.css` is a fourth global stylesheet** and the import order in
  `main.tsx` and `.storybook/preview.tsx` now has six entries. ADR 0025's
  deferral of the token was overridden and carries a dated amendment saying so.
- **Nothing in `pnpm verify` checks any of this.** No stylesheet is applied in
  the test environment, so `getTokens()` throws there and colour assertions are
  structurally impossible; axe has no rule for the boundary contrast of an
  input, and none for whether a value matches a canvas. The reconciliation is
  checked by a person reading both.

## What this ADR does not certify

**That the two systems are now the same.** Three things are known to differ and
are not defects to be found later:

1. **The anomaly ramp.** The canvas shows a single achromatic `ANOMALY 91`
   chip; this product has a four-band amber scale with an argued reason —
   amber rather than red, because red is price-down and an extreme anomaly on a
   security moving sharply _up_ would read as a fall. The canvas has no graded
   scale to be the source of truth _for_, so the ramp was left alone. **The
   canvas owes this section**, and until it has one this is the largest
   unreconciled area.
2. **The focus treatment.** The canvas draws `outline: none` with a 3px
   box-shadow ring. Declined: a box-shadow ring disappears in forced-colors
   mode, and one global `:focus-visible` is a decision this repository escalated
   to the token layer rather than route around the day before.
3. **`--font-size-micro`.** The canvas names both `label/11` and `micro/10`;
   this product declares only the first, because nothing has a consumer for a
   10px step. Adding it would be a token designed against no consumer.
