# Task 2.11.3 — The input idiom: the first field this product has ever had

**Status:** Not started
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
