# Task 2.14.6 — The two empty answers, told apart or deliberately not

**Status:** Not started
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.1 (decision 6), 2.14.2

## Objective

Implement decision 6. The server already knows two different things and says
neither: _we hold nothing for this security and timeframe_ and _we hold
something, but nothing in the window you asked for_. Both are the same 200 body
with an empty `bars` array and a `null` coverage, deliberately, and the
difference exists in a **debug log and nowhere else**
(`routes/market-data.ts`). `ChartVacancy` therefore says the second one always,
because it cannot see the difference.

Either put the distinction on the wire and render both, or state in writing that
one sentence covers both and why. What is **not** available is leaving
`ChartVacancy` saying a thing it cannot know.

## What the user can see when this lands

**An empty chart explains itself correctly** rather than plausibly. _"We have no
data for this security"_ and _"nothing traded in this window"_ send a reader to
two different next actions — one changes the window, the other does not — and
today a reader gets whichever sentence we happened to write.

## What is already decided and must not be re-taken

- **Where the explanation is drawn is settled.** It moved off the panel and onto
  the plot as `ChartVacancy`, and `pnpm invariants` holds that it has exactly one
  home (`VOLUME-AND-WINDOW.md` §79). The **placement** is not this task's; the
  **wording** is.
- **An empty series is a 200, not a 404.** A 404 is an unknown _security_ and
  never an empty series (`routes/market-data.ts`). Whatever lands on the wire
  does not change that.
- **`covered` is `null` exactly when the series is empty**, and that null is
  load-bearing — it is how a client tells _the series is empty_ from _this server
  did not say_. Do not overload it with a third meaning.
- **`fast-json-stringify` strips every property the schema does not declare**, so
  a new field added to a handler and not to the schema **silently vanishes**, and
  a leak test stays green. Declare the response schema's properties
  `satisfies Record<keyof TheType, JsonSchemaProperty>` as every route here does.
- **A declared JSON type disagreeing with the TypeScript one is coerced
  silently** — a `null` under `"string"` reaches the wire as `""` and under
  `"number"` as **`0`**. If the new field is optional, that is the specific trap.

## Work

**If decision 6 put it on the wire:**

- Add the discriminant where the two cases are already distinguished, which is
  the one place that knows — the same branch that writes the debug line. The
  field names a **cause**, not a sentence; the words stay on the client.
- Follow it through every reader: the response type, the type guard, the
  payload parser, `bar-series-view.ts`'s union, the panel, `ChartVacancy`, the
  announcement, the text alternative. A state that reaches the view and not the
  announcement is a state a screen-reader user cannot observe.
- **Record the body.** A new discriminant with no recorded fixture is a state
  that exists only in a test somebody typed. `empty.json` is the existing body;
  the second case needs its own, recorded from a real request against a real
  store, and `store:bare` plus a symbol with no bars is a way to produce one
  honestly.
- Update `MARKET-DATA-API.md` and the response's own header comment: the table
  in `routes/market-data.ts` that maps outcomes to bodies currently has one row
  for both, and that row is the documentation of the decision being changed.

**If decision 6 kept one sentence:**

- Re-word `ChartVacancy` so it is true of both cases without claiming either —
  which is harder than it sounds and is the whole reason this is a decision.
- Record the argument in `PROVENANCE.md` **and** in `docs/GAPS.md`, with a
  reversal trigger that is a condition: the obvious one is the first surface that
  offers an action whose correctness depends on which empty this is.

**Either way:**

- The untracked and synthetic notes stay as they are. `untracked` is a badge on
  a security we hold bars for and no longer follow; `synthetic` has never
  executed against any recorded body and remains a recorded gap rather than a
  fabricated fixture.
- Stories for every vacancy the product can reach, in the grid.

## Done when

- `ChartVacancy` says only what the client can know, and what it says was
  decided rather than inherited.
- If a field landed on the wire: it is in the schema with the `satisfies` idiom,
  has a recorded body behind it, and every reader down to the announcement
  handles it.
- `MARKET-DATA-API.md`'s outcome table matches the code.
- `pnpm verify`, `pnpm test:process` and the frontend suite pass; the empty case
  was looked at against `DATABASE_NAME=marketpulse_bare pnpm dev`, which is the
  store where every chart is a correct empty.

## Notes

Do the `store:bare` run early rather than at the end. It is the cheapest way to
see both empties on a real page, and it is the shape CI has — so anything this
task asserts in a browser spec is asserted against that store whether or not you
looked at it first.
