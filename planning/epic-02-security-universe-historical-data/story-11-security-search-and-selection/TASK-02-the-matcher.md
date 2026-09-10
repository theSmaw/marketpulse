# Task 2.11.2 — The matcher: what `nvid` matches, in what order, and why

**Status:** Complete — 2026-09-11
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

---

## What was built

`apps/frontend/src/market/security-match.ts` and its test table beside it, both
reached through `market/index.ts`. One pure function:

```ts
matchSecurities(universe, query, limit = SECURITY_MATCH_LIMIT)
  => { matches: readonly SecurityMatch[]; total: number }
```

**Where it lives:** `src/market/`, not a new module. Matching over securities is
market domain, the barrel is already the enforced API, and the alternative was
the most dangerous item on `CLAUDE.md`'s list — a second `no-restricted-imports`
block for `apps/frontend/src/**` **replaces** the browser boundary rather than
adding to it, because ESLint's flat config resolves a rule to the last
configuration that matched. Using the module that already exists touches
`eslint.config.mjs` not at all.

### The rules, and the two absences

| Tier | Rule                                          |
| ---- | --------------------------------------------- |
| 1    | the query **is** the symbol, case-folded      |
| 2    | the symbol **starts with** the query          |
| 3    | the name **starts with** the query            |
| 4    | the query starts a **later word** of the name |

- **A symbol substring that is not a prefix does not match.** `VD` does not find
  `NVDA`. Symbols are one-to-five-character identifiers; substring matching over
  that alphabet is close to random, and nobody types the middle of a ticker.
- **A name substring that does not start a word does not match**, which is the
  measured rule rather than the reasoned one. Tiers 3 and 4 are one mechanism —
  the query must begin at a word boundary — with the offset split out, and that
  is also what makes a multi-word query work without a second rule: `bank of`
  matches `Bank of America` at offset 0 and `of america` at offset 5.

**The ordering is total**: tier, then status, then symbol alphabetically. Symbols
are unique, so the comparator never falls through to equality between two
distinct rows and the list cannot reshuffle between renders. The tie-break test
was verified by substitution rather than assumed — replacing the symbol
comparison with `return 0` turns **two** tests red, because `Array.sort` is
stable and would otherwise hand back the universe's incidental array order.

**The cap is ten**, exported as `SECURITY_MATCH_LIMIT`, and the true total
travels with the slice so neither the result surface's footer nor §4's spoken
sentence can lie about what it is showing.

**The empty query matches nothing**, rather than everything. The whole universe
is already on screen underneath the result surface; a listbox that opens with
518 rows the moment a field is focused is a worse answer than a closed one.

## What was found

- **Task 2.11.1's `nv` measurement reproduced exactly.** A naive
  `name.includes("nv")` over the real 518 returns the same seven — `QQQ`, `NVDA`,
  `IVZ`, `NVR`, `KVUE`, `FRT`, `INVH`. Under the word-boundary rule it returns
  **two**: `NVDA` and `NVR`, both by symbol prefix. That is the first test in the
  file, and the fixtures are the real rows in the real file order so a substring
  implementation would return all seven and fail it.
- **`inv` is the case that shows the rules are not merely exclusionary.** It
  returns four, one from each of three tiers — `INVH` (symbol prefix), `IVZ` and
  `QQQ` (name prefix, both Invesco), and `FRT` last through Federal Realty
  **Inv**estment Trust. `FRT` is noise for `nv` and a plausible intent for `inv`,
  and the word-boundary rule tells the two apart without a special case. This was
  found by a test expectation being wrong, not by design.
- **The rules are cheaper than the naive scan they replace, not dearer.** A
  symbol prefix answers before the name is touched. Re-measured 2026-09-11 over
  the real 518, twenty iterations each: **0.101 ms** for `nv`, **0.040 ms** for
  `nvid`, **0.072 ms** for `a` (99 matches), and **0.216 ms** over a synthetic
  5,000 — against §0's 0.295 ms and 0.58 ms for the linear scan that produced
  those figures. Still a linear scan, so the slope is unchanged and an index
  stays unjustifiable.
- **The one open decision this task owned is settled**: an untracked security
  **ranks below** a tracked one within the same tier, and is never omitted.
  `SEARCH-AND-SELECTION.md` §6 carries a dated amendment saying so.
- **No fuzzy-matching dependency was added**, and the test table made no case for
  one. `§2`'s rule — that would be an amendment to that file rather than a
  dependency added here — did not need to be invoked.

## Done when — checked

- [x] One module, exported through `market/index.ts`, with a header saying where
      it lives and why
- [x] A test table covering every rule, including the empty query, `BRK.B`, and
      an untracked security
- [x] The ordering is total, and the test that would fail if it were not was
      **made** to fail
- [x] The cap returns both the shown matches and the true total
- [x] `pnpm --filter @marketpulse/frontend test` passes (410 tests); `pnpm verify`
      passes

---

## For the stakeholder: what this means, in plain words

**Short version: nothing new is on screen, and the thing that will make typing
work now exists and is proven correct.**

MarketPulse currently has 518 companies and funds in it, and until now the only
way to find one was to scroll a long table. The next piece of work puts a search
box on the screen. This task built the part of that search box that decides
**which companies your typing finds, and which one is at the top of the list** —
and deliberately built it on its own, before any of the visible parts.

### Why build it separately, rather than as part of the search box

Because ranking is the part of search people notice when it is wrong and nobody
can review when it is buried inside a screen. If you type `nvda` and press
Enter, you must get NVIDIA — not something that merely contains those letters.
Getting that right is a set of rules that need to be written down, argued about,
and checked one at a time. Written as three lines inside a search box, they get
guessed. Written as a standalone piece with twenty-five checks against it, they
get decided.

### The decision that mattered most, and why it was measured rather than assumed

The obvious way to search company names is "does the name contain what I typed?"
That turns out to be wrong, and we can prove it with our real data. Type `nv`
and that approach returns **seven** companies. Two of them are the ones you
meant — NVIDIA and NVR. The other five are Federal Realty **Inv**estment Trust,
**Inv**itation Homes, **Inv**esco, Ken**vu**e and the **Inv**esco QQQ fund. Every
one of them contains the letters "nv" somewhere in the middle of a word, and not
one of them is what a person typing "nv" wants.

So the rule we shipped is **what you type must start a word**. "nv" starts
NVIDIA, and it does not start "Kenvue" or "Investment", so those drop out. Type
`inv` instead and Federal Realty **comes back** — because there "inv" does start
a word, and somebody typing "inv" might genuinely be after it. The rule tells
those two situations apart without us having to list exceptions.

Three more decisions worth knowing about:

- **Typing the middle of a ticker finds nothing.** `vd` does not find NVDA.
  Ticker symbols are one to five letters, so matching on fragments produces
  near-random results, and nobody types the middle of a ticker anyway.
- **Ten results, and we always say how many there really were.** Typing `a`
  matches 99 companies. We show the best ten and hand the screen the true number,
  so it can honestly say "showing 10 of 99" rather than quietly pretending ten is
  all there is.
- **A company we have stopped tracking still shows up in search.** It appears
  lower down and will be visibly marked, but it is never silently hidden. A
  screen whose job is to tell you what exists must not make things disappear
  without saying so — that is a rule the whole product follows, and search is one
  of the places it is easiest to break by accident.

### Is it fast enough?

Yes, with a lot of room. Finding matches across all 518 securities takes about a
**tenth of a millisecond** — roughly one two-hundredth of the time available
between two frames of a smooth animation. We also ran it against a made-up
universe of 5,000 securities, ten times bigger than the product is planned to
get, and it took about a fifth of a millisecond. That is why search runs entirely
in the browser with no trip to the server per keystroke: results appear as fast
as you can type, and it costs us nothing. We wrote down the conditions under
which that stops being true, so the next person re-measures rather than
rediscovers.

### Where this sits in the bigger picture

MarketPulse is being built as a tool that spots unusual market behaviour and then
helps a person — or, later, an AI agent — investigate it against real evidence.
Everything so far has been the foundation that makes that possible: the list of
companies we watch, 48 million real minute-by-minute price records behind them,
and the plumbing that gets those numbers into a browser honestly labelled.

Search is the first piece of that foundation that is about a **person doing
something** rather than a system holding something. It is also the product's
first genuinely interactive control, which is why it is being built with this
much care: the next six screens — the price chart, the comparison picker, the
time-window control, the investigation workspace — all inherit how this one
behaves. Two tasks from now, typing three letters will take you to a company.
This task is the reason it will take you to the right one.
