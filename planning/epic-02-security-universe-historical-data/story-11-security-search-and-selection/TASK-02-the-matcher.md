# Task 2.11.2 — The matcher: what `nvid` matches, in what order, and why

**Status:** Not started
**Story:** [2.11 Security Search & Selection](STORY.md)
**Depends on:** 2.11.1

## Objective

Build the pure function this story's first acceptance criterion is actually
about: given the tracked universe and a query string, **which securities match
and in what order**. No component, no hook, no field — a module and its tests.

The reason it is its own task is that ranking is the part of search that is easy
to get subtly wrong and impossible to review inside a component. `nvda`, `NVDA`
and `nvid` must all behave sensibly, and "sensibly" is three different
mechanisms: an exact symbol, a case-fold, and a prefix of a company name. A test
table is where that gets settled; a `filter()` written inline while wiring a
listbox is where it gets guessed.

## What the user can see when this lands

**Nothing.** A module and a test file. The payoff is Task 2.11.4, two tasks away,
where this function is what makes typing do something.

## Work

- **Where it lives.** `src/market/` is the candidate — matching over securities
  is market domain, and the module's barrel is already the enforced API
  (`market/index.ts`, and a `no-restricted-imports` rule outside it). Take the
  placement deliberately and record it in one sentence in the file header.

  **If a new feature module is created instead of using `market`, read
  `CLAUDE.md`'s note about it first.** ESLint's flat config resolves a rule to
  the **last** configuration that matched, so a second config object setting
  `no-restricted-imports` for `apps/frontend/src/**` does not add to the browser
  boundary's — it **replaces** it, and the browser boundary disappears with no
  symptom. The pattern belongs inside the existing `patterns` array. This is the
  most dangerous item on that file's list and the moment it becomes likely is
  exactly a well-meant new module.

- **The match itself.** Over symbol and company name, tolerant of case and of
  partial input. Decide and write down, per rule, what it does with: an exact
  symbol; a symbol prefix; a symbol substring that is not a prefix (does `VD`
  find `NVDA`? there is a real argument for no); a name prefix; a name substring;
  a multi-word query; whitespace; a dot-bearing symbol like `BRK.B`; and the
  empty query. Each answer is a test.

  **Amended 2026-09-11 by Task 2.11.1: the interesting case is a name substring,
  not a symbol substring, and it is measured rather than hypothetical.** A naive
  `name.includes(q)` over the real universe returns **seven** matches for `nv`,
  five of which a person typing `nv` did not mean: `FRT` (Federal Realty
  **Inv**estment Trust), `INVH` (**Inv**itation Homes), `IVZ` (**Inv**esco),
  `KVUE` (Ken**vu**e) and `QQQ` (**Inv**esco QQQ Trust). Write that as a test
  first — it is the one that decides whether a name match is prefix-aware,
  word-boundary-aware, or merely ranked below symbol matches — and `SEARCH-AND-SELECTION.md`
  §0 has the reading. Note also that **`nvid` resolves through the name path and
  not the symbol path**: it matches exactly one security, NVDA, via
  `NVIDIA Corporation`. Acceptance criterion 1's third spelling cannot be
  satisfied with symbol rules alone.

- **The order.** A ranked list, not a filtered one. An exact symbol match is
  first or the control is wrong — typing `NVDA` and pressing Enter must open
  NVDA, which is acceptance criterion 1. Beyond that, state the tiers, and make
  the ordering **total**: two securities in the same tier must break their tie by
  something stable (symbol, alphabetically) rather than by the universe's
  incidental array order, or the list reshuffles between renders for reasons
  nobody can see.

- **`status` is not a match input.** An untracked security matches exactly as a
  tracked one does — `UNIVERSE.md` §12.2 names this screen as a reader that must
  not filter. Whether it ranks lower is a decision worth taking; whether it is
  omitted is not open. Add a test that names an untracked security and asserts it
  is returned, so the rule is checked rather than stated.

- **The cap.** Decide what happens when a query matches more securities than the
  surface will show — `a` matches most of the universe. A cap belongs here rather
  than in the view, because the view cannot cap a list without knowing whether it
  is truncating, and "N more matches" is a sentence someone has to be able to
  write. Return the total alongside the shown slice.

- **No allocation per keystroke that scales with the universe if it can be
  avoided**, but do not build an index before a measurement asks for one. 518
  entries is small; say so in the header with the figure, so the next reader
  knows the simple implementation was chosen against a number rather than by
  default. **Amended 2026-09-11 by Task 2.11.1: the figure exists, so cite it
  rather than re-deriving one** — a linear scan over symbol and name measured
  **0.295 ms** at 518 securities and **0.58 ms** over a synthetic 5,000
  (`SEARCH-AND-SELECTION.md` §0). Both are two orders of magnitude inside a
  16.7 ms frame, which is what makes an index unjustifiable today. Re-take the
  figure if the implementation stops being a linear scan; a scorer with a nested
  loop over name tokens is a different curve.

## Done when

- One module, exported through the feature module's barrel, with a header saying
  where it lives and why
- A test table covering every rule above, including the empty query, a
  dot-bearing symbol, and the untracked security
- The ordering is total and there is a test that would fail if it were not
- The cap returns both the shown matches and the true total
- `pnpm --filter @marketpulse/frontend test` passes; `pnpm verify` passes

## Notes

The temptation is to reach for a fuzzy-matching library. Task 2.11.1 owns that
decision; if it settled on client-side exact-and-prefix matching, adding fuzz
here is taking a decision in the wrong place. If the tests being written make a
genuine case that the rules are not enough, that is a finding for
`SEARCH-AND-SELECTION.md`, not a dependency added quietly.

This task deliberately touches no live region, no ARIA and no CSS. It is the
answer to _what matches_; every question about _what a person hears and sees_ is
2.11.4 and 2.11.6.
