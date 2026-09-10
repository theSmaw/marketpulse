# Design brief — Story 2.11, Security Search & Selection

**For:** the UX and design team
**From:** engineering, 2026-09-10
**Story:** [`STORY.md`](STORY.md) — read it; this brief supplements it and does not replace it
**Status of this document:** a request for design work, not a specification of it. Where it
states a constraint, the constraint is real and comes from a document named beside it. Where
it asks a question, the answer is genuinely open and yours to propose.

---

## 1. What this story is, in one paragraph

MarketPulse is an AI-assisted situational-awareness tool for US equities. Today it renders a
table of 518 tracked securities at `/securities`, and one security's minute bars at
`/securities/:symbol` — as **stated facts rather than a chart**, because charts are the next
two stories. What it has never had is a way for a person to **find** a security. Story 2.11
adds search, selection, and the Security Explorer shell that every later epic hangs a region
off.

**This is the first genuinely interactive control in the product.** Everything shipped so far
is a page that loads, states something true, and sits still. A search field with results is a
combobox: it has focus behaviour, keyboard behaviour, an open and closed state, and a
relationship to a live region. Whatever you design here becomes the pattern every control
after it is measured against — the window control in Story 2.13, the comparison picker in
Epic 8, the symbol switcher in Epic 11.

It is also the epic's exit criterion, phrased as a sentence somebody demonstrates: **a user can
search for NVDA and open it.**

---

## 2. Non-negotiable inputs — read these before drawing

| Document                                                                                                                              | What it binds here                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`VISUAL-LANGUAGE.md`](../../epic-01-application-foundation/story-04-ui-component-library-and-styling-conventions/VISUAL-LANGUAGE.md) | The whole design language: grounds, ink, rules, geometry, type, motion, and _The bar_ |
| [`PRODUCT_SPEC.md`](../../PRODUCT_SPEC.md) §5.6 and §8.3                                                                              | Visual quality as a product requirement; what the Security Explorer must answer       |
| [`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md) §3 and §7                                             | What the URL carries, and what an asynchronously-filled surface says out loud         |
| [`UNIVERSE.md`](../story-03-security-domain-model-and-tracked-universe/UNIVERSE.md) §12.2                                             | The `status` predicate — and that this screen is a reader that must **not** filter    |

Four things from those that will otherwise be discovered late:

1. **Radius is zero.** Square corners everywhere. A rounded search field is the single most
   likely way this screen announces itself as a generic web app.
2. **Colour is never the sole encoding of anything.** Under `grayscale(1)` the positive green
   and the negative red differ by 1.04:1 — they are the same tone. Anything you encode with
   hue must also carry a shape, a sign, a glyph or a word.
3. **The crimson identity accent may appear in four places and nowhere else**: the mark beside
   the wordmark, the 2px bar under the current nav tab, a primary button, and a link inside
   prose. **It never touches a datum.** A "highlighted" search match or a crimson ticker is
   out — and the reversal trigger for that rule is a fifth position, so proposing one is a
   decision to escalate rather than a detail to slip in.
4. **Micro-labels are uppercase, letterspaced, 11px, grey.** Control labels use that idiom.
   This is what makes a control read as an instrument rather than as a web form.

---

## 3. What already exists, and what you must not undo

You are designing **into a built screen**, not onto a blank one.

**At `/securities` today:** a `PageHeader`, the tracked universe as a table grouped into eleven
sector bands plus a market-proxies band, each band naming its benchmark ETF; columns Symbol,
Name, Industry, Kind, Last close, Change, Minute-bar history; a summary line reading
`518 securities tracked · 11 sectors · 15 ETFs`, with a fourth figure appearing only when some
security is no longer tracked. Below it, a `BarSeriesPanel` stating one security's bars.

**At `/securities/:symbol`:** the same page, with the panel about that symbol.

**The building-block layer** (`src/components/`): `Icon`, `Button`, `Badge`, `Panel`,
`PageHeader`, `MetricStrip`, plus `Marker`, `Region`, `Popover`, `PriceChange`, `AnomalyBadge`,
`FeedIndicator`, `UniverseTable`, `SecurityRow`, `BarSeriesPanel`. Each was extracted from
something the tree was already doing three times. Prefer composing these to inventing a
twelfth thing; where you do need something new, say so explicitly so it gets built as a
primitive rather than inline.

**The icon set is closed and has five members**: `pulse`, `chevronRight`, `arrowRight`,
`refresh`, `alert`. There is deliberately no magnifying glass. Adding one is a real decision
about whether the interface needs another symbol — make it consciously, in the deliverable,
rather than assuming it.

**Three things it is easy to break by accident:**

- **`status` is not filtered.** An `untracked` security is shown and marked, never hidden. A
  search that quietly drops untracked rows reintroduces exactly the failure the schema avoids
  by not having a `deleted_at` column. **Design what an untracked security looks like in a
  result list** — it must be findable and unmistakable.
- **The summary line must not become a lie.** Whatever search does to the visible rows, that
  line says which of two numbers it is reporting. If filtering changes what is on screen, the
  line has to say so.
- **Two live regions already speak on this page** — the universe table's and the panel's — and
  the rule is one region per subject with every sentence naming its subject. See §7 below;
  this is the constraint most likely to be designed past.

---

## 4. The design problems, in priority order

### 4.1 The search affordance itself

The hardest and most valuable piece. `VISUAL-LANGUAGE.md` records that **input fields have
never been built**, deliberately, because "a control designed against no consumer is a control
designed against a guess" — and it names this story as the consumer. So you are designing the
product's input idiom, not just one field.

The 2026-08-31 specification that has stood since then, and which this story either implements
or consciously revises:

- **Label above the field at micro-label size, never a placeholder as the label.**
- **Bordered or underlined** — pick one and say why.
- **Seven states: Empty, Filled, Hover, Focus, Error, Disabled, Locked**, where `Locked` (not
  editable by this user) is visually distinct from `Disabled` (temporarily unavailable).
  `Locked` has no consumer in V1 — say whether it should be drawn now or dropped until
  authentication exists.

Two extra states this consumer adds: **searching** (a request is in flight) and **results
open**. Both need answers that do not shift the layout underneath somebody's cursor.

**Where it lives is an open decision — see §8.1.**

### 4.2 The result row

Four facts without becoming a second table: **symbol, name, sector, and the equity/ETF
distinction.** That last one matters to a user rather than to the schema — it is why SPY
behaves differently from NVDA — so it needs to read at a glance, and `Badge` may or may not be
the right vehicle.

Open questions the deliverable should answer:

- What the matched substring looks like. Bolding it is conventional; the accent is unavailable
  (§2.3); a background wash on a datum is a colour-on-data decision that needs an argument.
- Whether a result row carries a **price** and a **change**. It could — the universe response
  already carries a last close and a previous close for all 518 — and it would make the result
  list feel alive rather than like a lookup table. It also imports the whole "a stale price
  presented as current" problem: the close is the last _session we hold a bar for_, which is
  behind the calendar during a live session. If you want the number, the design must carry the
  session date or a qualifier with it.
- Row height and density. This product's default text size is 13/18 and rows are tight. A
  56px result row with a two-line description is a consumer-search pattern and will read as
  one.

### 4.3 The Security Explorer shell (§8.3)

The page every later epic adds a region to. §8.3 lists seven contents: price chart, volume,
abnormal-move indicators, relative performance, connected securities, relevant filings,
historical anomaly history. **Stories 2.12 and 2.13 fill the first two. The rest are later
epics and ship as placeholders.**

The convention, from Story 1.5: **an empty region says which epic fills it** rather than
pretending, and it must not read as a broken page. That is a genuine design problem — a screen
that is mostly honest placeholders is exactly where test 1 of _The bar_ ("would a stranger
believe this is a real funded product?") is lost. Show us how a deliberately unfinished
instrument looks confident.

What the shell needs to establish now, because retrofitting it is expensive:

- The **column grid** the seven regions eventually occupy, and which ones are one, two or
  three columns wide. Modules are white panels on the cool ground, laid out on a grid.
- The security's **identity block** — symbol, name, sector, kind, and whatever else a person
  needs to know they are in the right place. This is the one place on the screen that could
  carry a display-size figure (40/44), and it is the most likely home for "a moment worth
  showing somebody".
- Where the **universe table goes** once search exists. It is currently underneath because it
  was the only way to find out what symbols exist. That reason expires with this story.

### 4.4 Grouping past 500

Story 2.4 recorded the reversal trigger and it has fired: at 518 securities a single sector
band is longer than a screen, and groups need to become **jumpable or collapsible** — which is
a control, and controls were out of Story 2.4's scope. They are in yours. Sector jump-links, a
sticky band header, collapse-by-default, or something better; this interacts with search, since
a filtered table may not want grouping at all.

---

## 5. Every state you owe a design for

The story lists these as acceptance criteria. Each needs a drawn state, not a note.

**Search:**

| State                 | Notes                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| No query              | The resting state. Is the result surface absent, or is it showing something useful — recents, market proxies, nothing? |
| Query, no matches     | Not an error. `zzz` is a reasonable thing to type                                                                      |
| Query, one match      | The case where "just press Enter" should obviously work                                                                |
| Query, many matches   | Including the case where matches exceed what you are willing to show — say what happens                                |
| Search unavailable    | The backend is unreachable. §36: this must not collapse the page, and the rest of the screen stays usable              |
| A symbol with no data | Exists in the universe, has no stored bars. **Not an error** — a correct, first-class answer                           |
| An untracked security | Shown and marked, never hidden (§3)                                                                                    |

**The Security Explorer:** loading, populated, partial (we hold less than was asked for),
empty, refused, and unreachable. The market-data layer already produces a six-member state
union in which **_partial_ is an answer rather than a failure** — read `BarSeriesPanel` and
`bar-series-view.ts` for the vocabulary already in use, and keep the words consistent rather
than inventing a second set.

---

## 6. Keyboard and screen reader — a first-class requirement here

The story says this explicitly, and it is worth restating why: this control sets the pattern.

- **The whole flow is operable by keyboard alone**: reach the field, type, move through
  results, open one, and get back. Design the focus order and say what Escape does, what Enter
  does with zero, one and many results, and what happens to focus after a result is opened.
- **Focus is the token layer's job** — one global `:focus-visible` rule, a 2px near-black
  outline with a 2px offset, on every interactive element, never removed. A component
  declaring its own focus style is answering a question already answered. If your design needs
  a different focus treatment anywhere, that is an escalation, not a component detail.
- **The combobox pattern's roles and relationships** (`role="combobox"`, the listbox, active
  descendant, `aria-expanded`) are engineering's to implement — but the design has to be one
  that pattern can express. A results surface that is not a list, or a control that is a field
  and a tab strip at once, is where that goes wrong.
- **axe stays at zero violations**, and the story does not ship otherwise. Note that an axe
  pass is a floor and not accessibility coverage — the keyboard walkthrough is the real test.

---

## 7. The live-region constraint, stated plainly because it is the one most likely to be missed

`/securities` already has two polite live regions. The rule
([`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md) §7) is: **a
live region belongs to a subject, and every sentence names its subject.** Two regions updated
in the same moment are queued by a screen reader in an order neither component controls, so
each sentence must be complete out of context, in either order.

Two consequences for you:

- **A field that re-requests on every keystroke would drive a live region at typing speed**,
  which is actively hostile. The design owes either a debounce (name the interval) or a
  decision to leave the region silent while a query is being typed and speak only when results
  settle. §7's reversal trigger names this story as the near case.
- **A third asynchronously-filled surface on this page fires §7's other trigger.** Two
  self-describing sentences queue tolerably; nobody knows where that stops being true. If your
  layout adds one, flag it — it is a decision, and cheap to make now.

Also: **a live region whose text does not change announces nothing.** A search that lands back
on the state it started from is silent unless there is a distinct in-between text it passes
through. If you write result copy, write the in-between too.

---

## 8. Open decisions we need you to take a position on

These are unresolved in the story and will be settled with the user. **We want a
recommendation with a reason, not a menu.**

### 8.1 Where search lives

A dedicated route, a persistent control in the chrome, or both.

- A **persistent control** is how an analyst tool usually behaves and makes symbol switching
  cheap, which is what Epic 5 onward wants. It touches `AppHeader`, which currently has a
  deliberate three-region status strip (feed, backend health, market clock) in a 56px
  masthead — so this is a real layout decision about the chrome, not a drop-in.
- A **route** is simpler and touches nothing.

If you propose the persistent control, show the masthead with it, at three viewports, with the
status strip still legible.

### 8.2 Client-side or server-side matching

**Engineering's reading of the measurement, so you are not deciding this blind:** the whole
universe of 518 securities is 20,072 bytes as a browser actually receives it (compressed,
re-measured 2026-09-10), and the deployed fetch is ~484 ms against a ~376 ms conditional
floor. **The payload is no longer an argument against holding the universe in the browser**,
so client-side filtering is comfortably affordable and gives instant, per-keystroke results
with no request and no debounce problem.

What that means for you: **design for instant results unless you have a reason not to.** If
your design needs something the browser cannot do locally — fuzzy ranking across a corpus we
do not ship, search over anything beyond the tracked universe — say so, because that is what
would move the decision.

### 8.3 The URL shape for a selected security

The rule is inherited and not open: **the path names the subject, the query names the view**,
an absent parameter means the default, and the application never writes a parameter it did not
need. `/securities/:symbol` already exists and `securityPath()` builds it.

What is open is smaller and still user-visible: whether a search query itself belongs in the
URL (is a half-typed search a shareable state?), and what the address does when a user is
looking at the list versus one security.

---

## 9. What we would like delivered

In rough order of usefulness to us:

1. **The search control, full state set.** All seven field states plus searching and open, at
   the two control heights (36px default, 28px dense) if both apply. Annotated with tokens
   where you diverge from an existing one.
2. **The result surface**, with the seven result states from §5, including the untracked case
   and the "more matches than shown" case.
3. **The Security Explorer shell** — the grid, the identity block, the two regions Stories
   2.12 and 2.13 fill, and the placeholder treatment for the five that later epics fill. At
   three viewports.
4. **The masthead**, if you are recommending a persistent control (§8.1).
5. **The grouped table with a control on it** (§4.4) — jump, collapse, or your alternative.
6. **A keyboard walkthrough**: a numbered flow from focus to opened security, saying what each
   key does and where focus lands.
7. **Copy**, written not lorem'd. Every label, every empty state, every unavailable state, and
   the live-region sentences with their subject in them (§7). Copy is design here — the
   product's voice is "an honest sentence for every way this can go wrong", and a placeholder
   string will ship if you supply one.
8. **A written position on §8.1, §8.2 and §8.3**, one paragraph each with the reason.

**Format:** whatever you work in. We need to be able to read tokens and spacing off it, so
annotate rather than leaving us to measure pixels. If something in the built screen fights your
design, tell us — the layer underneath is three weeks old and cheap to change.

---

## 10. The bar this is measured against

`PRODUCT_SPEC.md` §5.6 and `VISUAL-LANGUAGE.md`'s _The bar_ are **acceptance criteria on this
story**, not polish for later. There is no design review epic and Epic 15 is a release epic —
polish deferred is polish never. Correct and accessible is the floor.

Four tests, applied to a screenshot by somebody who has never read any of this:

1. **Would a stranger believe this is a real, funded product?**
2. **Does it look designed rather than defaulted?** No framework's out-of-the-box appearance
   survives contact with a decision — and a search field is exactly where a generic admin
   panel announces itself.
3. **Is there a moment in it worth showing somebody?**
4. **Does it feel alive?** This is a market application. A screen that updates by silently
   swapping text is technically correct and feels dead. The motion vocabulary today is
   deliberately thin — two durations (120ms under the pointer, 240ms for content arriving),
   one asymmetric easing, and `prefers-reduced-motion` answered once at the token layer. Epic
   3 owns the full vocabulary because the hard question is what a **price** does when it
   changes, and that needs real moving numbers. **Search results appearing is squarely within
   what you have**, and it is the first thing in this product that moves in response to a
   person.

The constraint that makes this genuinely hard, and it outranks test 4: **motion must never make
a number harder to read.** A value that fades or slides while an analyst is reading it is worse
than one that changes instantly.

If the answer to any of the four is no, the story is not finished. That is the standard the
work is held to, and it is the reason this brief exists rather than a ticket.
