# Task 2.11.3 — The input idiom: the first field this product has ever had

**Status:** Complete (2026-09-11)
**Story:** [2.11 Security Search & Selection](STORY.md)
**Depends on:** 2.11.1

## Objective

Build the text input as a **primitive with its full state set**, in the
workshop, before it is wired to anything.

`VISUAL-LANGUAGE.md` records that input fields have deliberately never been
built — "a control designed against no consumer is a control designed against a
guess" — and names this story as the consumer. So this is not one field for one
screen: it is the product's input idiom, and the window control in Story 2.13,
the comparison picker in Epic 8 and the symbol switcher in Epic 11 are all
measured against it.

## What the user can see when this lands

**In the application, nothing.** In the workshop — `pnpm --filter
@marketpulse/frontend storybook` — every state of the first control this product
has ever had, side by side. That is a real deliverable to look at and the first
half of the story's design bar, and it is worth showing someone even though no
route has changed.

## Work

- **The component**, under `src/components/<Name>/` with its `.module.css` and
  its `.stories.tsx`, which is what `pnpm stories` enforces. Composing the
  existing building blocks where they fit — `Icon`, `Button`, `Badge`, `Panel`
  are already there and each was extracted from something the tree did three
  times. Where something genuinely new is needed, build it as a primitive rather
  than inline, and say in the header what it was extracted from or why it is new.

- **The seven states from the 2026-08-31 specification**: Empty, Filled, Hover,
  Focus, Error, Disabled, and Locked — where `Locked` (not editable by this user)
  is visually distinct from `Disabled` (temporarily unavailable). Task 2.11.1
  settled whether `Locked` is drawn now or dropped until authentication exists;
  implement that decision rather than re-taking it. **Plus the two this consumer
  adds**: _searching_ (a request or a computation is in flight) and _results
  open_. Neither may shift the layout under a cursor.

  **Amended 2026-09-11 by Task 2.11.1: it is six states plus the two, not seven
  plus the two.** `Locked` is **dropped** until authentication exists — §37
  excludes authentication beyond demo needs, so it has no consumer, and a state
  drawn against no consumer is exactly the guess that deferred input fields in
  the first place. The trigger for the seventh is **the first field a person can
  see and may not edit**; when it fires, `Locked` is added here rather than
  invented at its call site. Do not draw it now, and do not leave a story stub
  for it.

  Two more positions 2.11.1 settled from the design deliverable, recorded here so
  this task implements rather than re-takes them (`SEARCH-AND-SELECTION.md` §5):
  **bordered, not underlined**; and **the input text is set in `--font-data`**,
  the monospace face, because what a person types here is predominantly a ticker
  and that is the single detail that most makes the field read as a command line
  rather than a web form. A typed company name is also in mono, and that cost was
  accepted rather than overlooked.

- **A story per state**, produced rather than described. The workshop is where
  these are reviewed side by side and it is the reason the rule exists.

- **The label is above the field at micro-label size — uppercase, letterspaced,
  11px, grey — and a placeholder is never the label.** That idiom is what makes
  a control read as an instrument rather than as a web form, and a placeholder
  masquerading as a label is the single most common accessibility defect in
  search fields.

- **The sixth icon, and this task is where it lands — added 2026-09-11 by Task
  2.11.1.** The icon set has been closed at five members since the refresh
  (`pulse`, `chevronRight`, `arrowRight`, `refresh`, `alert`) and 2.11.1 decided
  it gains one for this field's affordance. **No other task owned adding it**, so
  it is owned here, with three constraints that are the decision rather than the
  detail:
  - **It is named `magnifier`, not `search`.** `Icon.tsx`'s own rule is that a
    symbol is named for **what it is** and not for what a consumer uses it for —
    `arrowRight` rather than `explore`, "because the day a second screen uses it
    for something else the name would be a lie".
  - **The set becomes six, and the next addition needs its own argument in its own
    task** rather than citing this one.
  - **Every live claim that the set has five members becomes false in the same
    change.** `VISUAL-LANGUAGE.md`, `Icon.tsx`'s own header and
    `DESIGN-BRIEF.md` §3 are candidates — grep for it, correct the live claims and
    leave the historical records standing. Task 2.11.10's upward sweep already
    lists this, but a claim left false for six tasks is the failure mode
    `CLAUDE.md` records having had once already.

- **Square corners.** Radius is zero everywhere in this language. A rounded
  search field is the most likely way this screen announces itself as a generic
  web app, and it is worth stating in the CSS with a comment rather than left as
  an absence somebody helpfully "fixes".

- **Focus is not this component's job.** One global `:focus-visible` rule owns
  it — a 2px near-black outline at 2px offset, on every interactive element,
  never removed. A component declaring its own focus style is answering a
  question already answered. If the design needs a different treatment here, that
  is an escalation to the token layer, not a local override.

- **Colour is never the sole encoding.** The error state carries a word or a
  glyph as well as a hue; under `grayscale(1)` this language's semantic colours
  are the same tone.

- **The identity accent is out of bounds on a datum.** Crimson has four
  permitted positions in the chrome and this field is not one of them unless the
  design deliverable argued for a fifth — which is a reversal trigger and an
  escalation, not a detail.

- **Watch two silent failure modes while building.** A CSS Module class-name
  typo typechecks, lints, builds and renders unstyled with nothing in `pnpm
verify` catching it. And if `Marker` is used anywhere in this component, the
  row containing it must set `--marker-color` or it renders invisibly — correct
  DOM, green verify, nothing on screen.

## Done when

- The component exists under `src/components/<Name>/` with a stories file, and
  `pnpm stories` passes
- Every state the design settled on has a story, including _searching_ and
  _results open_ — and **not** `Locked`, which 2.11.1 dropped
- `Icon` has a sixth member named `magnifier`, with a story, and every live claim
  that the set has five members has been corrected in the same change
- The label is a real label, associated with the input, at micro-label size
- No component-local focus style; no radius; no accent on data
- The Storybook axe addon reads **zero violations** across the stories — and note
  that is a floor rather than accessibility coverage, and that the addon's scope
  is `#storybook-root`, which is not comparable to a whole-document run
- Component tests cover what a test can see here: the label association, the
  disabled and error semantics, and that a value typed is a value reported. **Not
  colour** — no stylesheet is applied in the test environment, so `getTokens()`
  throws there and colour assertions are structurally impossible rather than
  merely discouraged
- `pnpm verify` passes

## Notes

The fence: this task builds a **field**, not a combobox. No listbox, no
`aria-expanded`, no keyboard navigation between results, no matcher. Those are
2.11.4's, and they are what turn this into a composite widget with an ARIA
pattern to satisfy. Keeping the field a field is what lets Story 2.13 reuse it
for something that is not a search at all.

---

## What was built

`apps/frontend/src/components/TextField/` — `TextField.tsx`, `TextField.module.css`,
`TextField.stories.tsx`, `TextField.test.tsx` — plus the sixth icon and one
escalation to the shared accessibility layer.

The component is named `TextField` and not `SearchField`, and nothing inside it
says "search". That is the fence the Notes asked for, made structural: the only
search-shaped thing in the file is that `magnifier` is an `IconName` a caller may
pass. The last specimen in the permutation grid is a field holding `09:30` with
no icon at all, which is there to say out loud what the next consumer is.

### The API, and the two props that are decisions rather than parameters

| Prop                              | What it is                                                                                      |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `label` (required)                | A real `<label for>` above the field. There is no way to substitute a placeholder for it        |
| `value` / `onValueChange`         | Controlled; there is no uncontrolled mode                                                       |
| `icon`                            | An optional leading symbol                                                                      |
| `hint`                            | The line under the field, reaching the control through `aria-describedby`                       |
| `error`                           | **Its presence is the error state.** There is no separate boolean                               |
| `disabled`, `busy`, `surfaceOpen` | The three flag states                                                                           |
| `onClear`                         | **Supplying it is three things at once** — the `x`, the `Esc` chip, and Escape actually working |
| `size`                            | `medium` (36px) or `small` (28px), matching `Button` exactly                                    |
| `inputRef`                        | Reaches the `<input>`, so 2.11.4 can move focus to it                                           |

Everything else is passed straight through to the `<input>`, which is how the
combobox in 2.11.4 gets `role`, `aria-expanded`, `aria-controls`,
`aria-activedescendant` and its own `onKeyDown` without this component knowing
any of them exist.

Two of those rows are the interesting ones.

- **`error` has no boolean twin**, because an invalid field with nothing to say
  is a dead end for the person looking at it. The type makes "invalid" and "has
  a message" the same fact.
- **`onClear` bundles the affordance with the behaviour.** The design deliverable
  drew an `ESC` chip inside the field, and a chip is a claim about what the
  control does. So the field handles Escape itself when — and only when — the
  clear affordance is present. A consumer's own `onKeyDown` runs **first** and
  can veto with `preventDefault()`, which is what lets 2.11.4's combobox spend
  Escape on closing its surface instead. There is a test on each half.

### The six states, plus two, and the seventh that is not here

Empty, Filled, Hover, Focus, Error, Disabled — and `searching` and `results
open`. `Locked` is **not** drawn and there is no stub for it, per 2.11.1.

`Hover` and `Focus` have stories that are the resting field with a note, which is
the honest form of a state a workshop cannot force: both are pseudo-classes, and
`Focus` is doubly so because it is deliberately not this component's style.

### The sixth icon

`magnifier`, added to `ICON_NAMES`, drawn on the same 24x24 / 2px grid as the
other five, with a story of its own as well as its row in the set's grid. The
argument and the naming rule are recorded in `Icon.tsx`'s header rather than
only in a planning file, because the header is what the next person adding a
glyph reads.

**Every live claim that the set has five members was corrected in this change**,
which took a grep and four edits rather than the three the task predicted:

| Site                                                  | What happened                                                                            |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `Icon.tsx` header                                     | Rewritten: "six drawings", with the one moment the closed union has actually been opened |
| `VISUAL-LANGUAGE.md` "No icon beyond the closed set"  | Amended in place — it is a live rule, and the rule is unchanged; the count is            |
| `VISUAL-LANGUAGE.md` "Input fields are not built yet" | **The second false claim, and the task did not predict it.** See below                   |
| ADR 0022 §4                                           | A **dated amendment beside** the present-tense "closed union of five", not a rewrite     |
| `DESIGN-BRIEF.md` §3                                  | A dated note beside the question, which is left standing as the question it was          |

## What was found

### The task named three sites and there were five, and the one it missed was the bigger claim

`VISUAL-LANGUAGE.md` did not only say the icon set had five members. It also
said, in the Controls section, **"Input fields are not built yet"** — the
sentence that deferred this component for three stories, with the seven-state
specification attached to it. Shipping `TextField` falsifies it completely, and
nothing in the task's list would have caught it: the task was looking for the
word "five".

That is the same failure shape `CLAUDE.md` records having had once already — a
measurement falsifies a premise upward, and the sweep is written against the
thing that was measured rather than against everything the change made untrue.
The sentence is now dated and followed by what was built, including the three
places the implementation departed from the 2026-08-31 specification.

### The global focus ring does not work on a composite control, and that is an escalation rather than a bug

`VISUAL-LANGUAGE.md` and this task both say focus is the token layer's job and a
component declaring its own is answering a question already answered. **That
sentence has never been tested before, because until now every interactive
element in this application _was_ the control** — a button, a link, a table row.

A field is not. The element a browser focuses is the bare `<input>`, and the
`<input>` sits inside the bordered box beside an icon and a chip. So the token's
2px near-black outline landed **inside** the field, wrapped around the text and
nothing else, and the control a person sees was not the thing that looked
focused. Measured in a browser, not reasoned about: the outline computed on the
`INPUT`, and the screenshot shows a ring within a box.

Both documents say the answer to that is an escalation to the token layer rather
than a local override, so it was taken as one. `a11y.module.css` — whose own
header already said "this is where a skip link or a focus-trap helper goes
next" — gained two classes:

- `focusRingHost`, which draws the ring when it contains a focused source;
- `focusRingSource`, which is the one place in this application an outline is
  removed, and it is removed **onto** the host rather than removed.

The values are the same three tokens the global rule uses, unchanged. It is not
a second focus treatment; all that moves is which element draws it. It is
**shared on the day it has one consumer** deliberately, because Story 2.13's
window control, Epic 8's comparison picker and Epic 11's symbol switcher meet the
identical problem, and the failure mode of leaving it in the first one is that
each of the others solves it again, slightly differently.

Two classes rather than one, for a reason worth keeping: a composite has more
than one focusable thing in it. Only the marked source hands its ring over, so
the clear button inside the same field keeps the ordinary global one — verified
in a browser by tabbing twice, and the second stop still computes
`2px solid`.

### The trailing slot's reserved width was wrong, and the measurement said so

The first implementation reserved a permanent 52px for the `Esc` chip and the
clear button, on the stated ground that otherwise the first keystroke would
narrow the input under the caret. **Measured across the permutation grid, the
reserve did not do that**: the input was 689px empty and 627px filled, so it
narrowed anyway, and the reserve had merely made the gap smaller while costing a
strip of dead space in every field merely _capable_ of being cleared.

The right answer turned out to be to delete the reserve and state the real
argument, which the measurement also supplies: **the input's left edge is at the
same pixel in every one of the ten specimens.** The slot can only appear as the
value goes from zero characters to one and disappear as it goes back, so the
field is empty at both moments and there is nothing in the narrowing part of it
for anybody to have been reading. The constraint the task actually wrote —
_searching_ and _results open_ must not shift the layout — is satisfied exactly:
`Searching` measures 689px against `Empty`'s 689px, and `Results open` 627px
against `Filled`'s 627px.

This is the general shape `CLAUDE.md` warns about. The reserve was a mechanism
that looked like it enforced a property, was never measured, and did not.

### Three tests passed while asserting nothing, and only `tsc` said so

The first version of the description assertions used Testing Library's
`description` option:

```ts
screen.getByLabelText("Symbol", {
  description: "14 matches across 518 securities",
});
```

`description` is an option on `getByRole` and **not** on `getByLabelText`, which
ignores unknown options silently. All three tests were green while checking
nothing at all, and the only thing in `pnpm verify` that objected was `tsc`,
with a `TS2769` about an unknown property — the lint and the test run were both
happy.

They are now a `describedTextOf` helper that resolves `aria-describedby` the way
a screen reader does, and the resolution order is asserted rather than assumed.
**The substitution was verified**: swapping the two ids so the hint is read
before the error takes exactly one test red, and the rest stay green.

### One more that `tsc` caught and the linter disagreed with

`expect((input as HTMLInputElement).disabled)` was an
`@typescript-eslint/no-unnecessary-type-assertion` error and, with the assertion
removed, a `TS2339` from `tsc` — the two tools resolved the generic default of
`getByLabelText` differently. `screen.getByLabelText<HTMLInputElement>(...)`
satisfies both and is the idiom to copy.

### The disabled test asserts less than the obvious version, on purpose

`fireEvent.change` dispatches on the node directly rather than simulating a
person, so jsdom delivers the event to a disabled input that no browser would.
"Assert nothing was reported while disabled" therefore **fails**, and it fails
for a reason that is about the test library rather than about the control. The
test asserts the attribute, which is the whole of what this component owes the
user agent, and the omission is written down beside it.

## Measurements

Taken 2026-09-11, against the built Storybook served locally to a headless
Chromium.

| What                                                                               | Reading                                                                                        |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| axe, `#storybook-root`, across all 11 `TextField` stories and all 5 `Icon` stories | **0 violations, 0 incomplete**; 5-13 passes per story                                          |
| Field height, `medium`                                                             | 38px — 36px of `--control-height` plus two 1px borders, which is `Button`'s arithmetic exactly |
| Field height, `small`                                                              | 30px, from `--control-height-sm`                                                               |
| Input left edge, all ten specimens                                                 | **Identical**, with and without the icon accounted for                                         |
| `busy` against `Empty`                                                             | 689px against 689px — nothing moves                                                            |
| `surfaceOpen` against `Filled`                                                     | 627px against 627px — nothing moves                                                            |
| Focus ring, resting field                                                          | `2px solid rgb(20, 23, 28)` at `2px` offset, **on the box**                                    |
| Resting border                                                                     | `rgb(226, 229, 236)` — `--rule-hairline`, which is what makes the ring visible against it      |
| Second tab stop (the clear button)                                                 | `2px solid` — its own ring, not the field's                                                    |
| Busy sweep, default                                                                | 40% wide, `sweep` animation, `--rule-strong`                                                   |
| Busy sweep, `prefers-reduced-motion: reduce`                                       | 100% wide, `animation: none`, `--ink-secondary` — still says "busy", without moving            |

Frontend component tests: **423**, up from 410 at Task 2.11.2's close. Components
with stories: **22**.

## Done when — checked

- [x] The component exists under `src/components/TextField/` with a stories file;
      `pnpm stories` passes (22 components, 22 stories files)
- [x] Every settled state has a story, including _searching_ and _results open_,
      and **not** `Locked`
- [x] `Icon` has a sixth member named `magnifier`, with a story, and all four
      live five-member claims were corrected in the same change
- [x] The label is a real `<label for>` at micro-label size, asserted through
      `getByLabelText`
- [x] No component-local focus style, no radius, no accent on data. The focus
      **relay** is in the shared layer and uses the token rule's own values
- [x] axe reads **0 violations** across the stories — a floor, not coverage, and
      scoped to `#storybook-root`, which is not comparable to a whole-document run
- [x] Component tests cover the label association, the disabled and error
      semantics, and that a value typed is a value reported. **Not colour**
- [x] `pnpm verify` passes

## What nothing checks

- **That the field's height still matches `Button`'s.** Both read
  `--control-height` today, so it holds by construction; what nothing checks is
  that a later edit keeps them derived. Re-measure: render a `Button` and a
  `TextField` side by side and compare `getBoundingClientRect().height`.
- **That `focusRingSource` is only ever applied to an element that is a direct
  child of a `focusRingHost`.** The `:has(> …)` selector is silent if it is not:
  the source's outline is removed and nothing draws one, which is a control with
  no focus state at all and a green `verify`. It is the same class of silent
  failure as `Marker` with no `--marker-color`. Re-measure: move the class to a
  nested element and confirm the ring disappears.
- **That the `Esc` chip's claim stays true.** It is drawn by CSS and made true by
  a keydown handler, and the two are joined only by a test in this component.
  A consumer that renders the chip without wiring the key cannot — the chip
  comes with `onClear` — but a future prop that separated them could.

---

## For the stakeholder: what this means, in plain words

**Short version: nothing has changed on the website, and the product now has a
text box — the first one it has ever had, built and reviewable in isolation
before it is wired to anything.**

### What was actually made

MarketPulse has been running for a while now and, until today, a person could
only ever _read_ it. Every screen loads, states something true, and sits still.
There has never been anywhere to type.

This task built that: a labelled box you can type into, in every condition it can
be in — empty, with something in it, greyed out because it is unavailable, with
a red line and an explanation because what you typed is wrong, with a quiet
progress bar because it is thinking, and joined to an open list of results
underneath. You can see all of those side by side right now in our component
workshop, which is a private catalogue of the product's parts. It is a real
thing to look at, and it is worth a minute of somebody's time even though no page
on the site has changed.

### Why we built a text box on its own, rather than building the search

Because it is not one text box for one screen. It is **the text box**.

We deliberately refused to build input fields for the last three months of work,
and wrote down why: a control designed before anything needs it is a guess. Now
something needs one. But four more things will need one soon after — the control
that picks a date range on the price chart, the one that picks companies to
compare, the one that switches which company you are looking at. If we had built
this inside the search screen, each of those would have grown its own slightly
different box, and within a few months the product would look like four
different products.

So it was built once, on its own, as the pattern the rest are measured against.
That is the whole value of this task, and it is why it has no visible payoff of
its own.

### The decisions worth knowing about

**It is set in a typewriter typeface.** What people will mostly type here is a
ticker symbol — `NVDA`, `SPY` — and setting it in the same fixed-width face we
use for prices makes the box read like a professional terminal rather than a web
form. We accepted a cost knowingly: if you type a company's full name, that is in
the typewriter face too. We judged that a good trade.

**The label sits above the box and is never faked.** A lot of search boxes use
the grey "Search…" text inside as the label. It is the single most common
accessibility mistake in search fields — it vanishes the moment you type, and
screen readers do not reliably announce it. Ours is a real label, above, and the
component makes it impossible to leave out.

**We dropped a state, on purpose.** The original design asked for seven
appearances, one of which was "you can see this field but you are not allowed to
edit it". We do not have user accounts and are not planning to in this version,
so nothing in the product can ever be in that condition. Drawing it would have
been inventing a rule for a case that does not exist — exactly the guessing we
avoided by deferring fields in the first place. We wrote down the specific
circumstance that would bring it back.

**We added a sixth icon, and that took an argument.** The product has a
deliberately tiny, closed set of five symbols, and adding to it requires a case
to be made rather than a file to be imported. The magnifying glass got one: on a
dense screen full of numbers, a search box needs to be recognisable in a glance
rather than read. The set is now six, and the seventh will need its own argument.

### Three things we found by looking rather than by thinking

These are the parts worth reporting honestly, because each was a belief that
turned out to be wrong.

**The focus outline was in the wrong place, and nobody could have known until
now.** When you move around a page with the keyboard, a dark outline shows you
where you are. We have one rule for that, applied everywhere, and a standing
instruction that no individual component may invent its own. That rule had never
been tested on anything complicated, because until now every clickable thing in
the product _was_ a single simple element. A text box is not: it is a bordered
box with an icon, a typing area and a small button inside it, and the browser
focuses the typing area. So the outline appeared **inside** the box, around the
text, which looked wrong and pointed at the wrong thing. We fixed it in the
shared layer rather than in this one component — same outline, same thickness,
same colour, just drawn around the whole control — precisely because the next
three controls will hit this the moment they are built.

**A piece of code that existed to prevent a problem was not preventing it.** We
had reserved a strip of blank space inside the box so that the little "clear"
button appearing would not nudge anything. When we actually measured it, the
nudge happened anyway — the reservation only made it smaller. It also turned out
the problem was imaginary: the clear button can only appear at the moment you
type your very first character, when there is nothing on screen to be nudged. So
we deleted the reservation and wrote down the measurement instead of the
assumption. This is a small thing, but it is the pattern the project cares about
most: a safeguard nobody has measured is a safeguard nobody has.

**Three of our tests were passing while checking nothing.** We had asked the
testing tool a question using slightly the wrong syntax, and rather than
objecting it silently ignored us — so three tests reported success without ever
looking at anything. The type checker caught it; the test run and the linter
both did not. They are rewritten, and we then deliberately broke the thing they
are supposed to protect to confirm they actually go red. A green tick that
cannot go red is worth nothing, and this is the second time this project has
found one by checking.

### Where this sits in the bigger picture

MarketPulse is a tool for spotting unusual market behaviour and then
investigating it against real evidence — eventually with an AI agent doing the
investigating while a person stays in control. Everything built so far is the
foundation: the 518 companies we watch, roughly 48 million real minute-by-minute
price records behind them, and honest plumbing to get those numbers onto a
screen with their sources labelled.

Search is the first thing in the product that is about a **person doing
something** rather than a system holding something, and this task is its first
half. The next task puts this box on the `/securities` page, wires it to the
matching rules built two tasks ago, and makes typing three letters take you to a
company's own page. That sentence — _a user can search for NVDA and open it_ — is
the exit criterion for this whole phase of work, and it is now two tasks away
rather than four.
