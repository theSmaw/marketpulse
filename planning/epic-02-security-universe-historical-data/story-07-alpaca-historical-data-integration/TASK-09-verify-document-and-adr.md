# Task 2.7.9 — Verify against the shipped tree, sweep what has gone stale, and record ADR 0019

**Status:** Not started
**Story:** [2.7 Alpaca Historical Data Integration](STORY.md)
**Depends on:** Task 2.7.8

## Objective

Re-run all seven acceptance criteria against what actually shipped, re-take every figure rather
than citing one, sweep the claims this story falsified, and write `docs/adr/0019-*`.

**The ADR number is `ls docs/adr/` plus one, and the file number is not the ordinal.** 0014 was
reserved for Story 2.1's close and written after 0015, so _"the nineteenth ADR"_ and _"0019"_
are different claims. This file's sentence in `CLAUDE.md` has been wrong three times; do not put
a number in it.

## What the user can see when this lands

**Nothing new**, and the story's visible change already landed at Task 2.7.4: the deployed
chrome says `IEX` and explains what that means. This task confirms it is still true from a clean
clone and a fresh deployment read, which is the check rather than a formality.

## The seven criteria, re-made rather than cited

1. **Real bars, mapped, with provenance naming the feed open decision 6 settled** — run
   `pnpm bars` against the deployed credential's key from a clean clone, print the series and its
   provenance record, and record the actual numbers. **The criterion's original wording said
   "IEX"**; Task 2.7.1 measured that historical bars come from SIP, so check the provenance
   against what the request actually asked for rather than against that word
2. **The measured plan limits, dated — including the WebSocket cap** — confirm `ALPACA.md` says
   what was measured and that `UNIVERSE.md` §10's parked decision has been resolved one way or
   the other. This is the criterion another story was blocked on; if §10 still reads _parked_,
   the story is not finished
3. **Each mapped error cause produced against the live API** — re-read Task 2.7.6's record, and
   re-produce at least the bad key, which costs one request. Any member that could not be
   produced is named as such rather than left looking implemented
4. **Rate limiting exercised at the limit** — re-read Task 2.7.7's live run
5. **The key is on the platform, absent from the repository, the bundle and every log record**,
   with a deliberate log of the request path inspected. That last clause is the one most likely
   to be skipped: turn the log level up, make a real request, and read what was written
6. **The application builds, tests and runs with no key present** — from the clean clone, with
   no `.env` at all
7. **`pnpm verify` passes with no network access** — under a sandbox that denies off-machine
   sockets while allowing loopback, which is the profile Task 2.6.8 established. Note its
   finding: a blanket `deny network*` fails, because `test:process` binds loopback by design, so
   the honest reading of the criterion is **reaches no host but itself**

## The sweeps, and which of them this story is expected to move

Run each rather than reasoning about which are affected; the last four closes each found
something the candidate list did not name.

- **The test-count blocks.** Ten byte-identical convention blocks plus Stories 1.2 and 1.3's two
  historical variants, plus `README.md` and Epic 1's `EPIC.md`. Task 2.3.8 found them stale by
  **two** story closes and Task 2.6.8 by two again — check the md5 across the ten afterwards,
  and leave the historical variants alone
- **The vendor grep**, which this story deliberately moved. Task 2.6.8 recorded the **code-only**
  count over `packages/shared/src` as zero and always having been zero; it is now one, and that
  one is `alpaca` in `PROVIDER_IDS`. Amend where the claim stands, re-run the naive text counts
  rather than citing them — Task 2.6.5 found the recorded figure wrong by one — and state the
  distinction plainly, because the next reader will see a vendor name in shared code and read it
  as a leak
- **ADR 0011's "nothing deployed holds a credential"**, which expired at Task 2.7.2. Confirm the
  dated amendment is beside the claim and that `EPIC.md`'s prediction — corrected once already,
  from Story 2.1 to this story — now reads as **confirmed** rather than as pending
- **`CALENDAR.md`'s `minuteBars` — the condition did NOT fire, and the sweep is now a
  confirmation rather than an amendment.** Task 2.7.1 measured a regular session yielding
  **exactly 390** and a half day exactly **210**, so no correction was owed; what it left instead
  is a **dated confirmation note** in §2.2 plus two request traps (the inclusive `end`, and
  date-only ranges leaking extended hours). Check that note still describes the shipped client —
  in particular that the client does subtract a timeframe from `end` — because it is in another
  story's document and is the one most likely to go stale unnoticed
- **The `pnpm verify` gap lists in `CLAUDE.md`** — the sixth kind gained the platform secret,
  and any recorded invariant this story created (a coupled constant, a second writer on
  `status`, a pin) belongs in the third kind with its durable copy named
- **`README.md`** — the script table gains `pnpm bars`, the variable count moves (**13 → 15 at
  Task 2.7.2, and further if anything after it adds one**), and the "things that look like
  faults" list may lose or keep the market-feed row depending on what Task 2.7.4 left on screen
- **`pnpm env:check`'s own description, in `CLAUDE.md` and `README.md`.** Task 2.7.2 gave it a
  **fifth** failure mode — a variable with no default must be documented **blank**, which is a
  leak guard rather than a formatting rule, because the default comparison is structurally
  inapplicable to a no-default variable and every no-default variable is a credential. Anything
  describing that script as "four checks" is now stale. Re-make all five fail rather than citing
  2.7.2's run
- **The test-count blocks' starting figure.** Task 2.7.2 moved `pnpm test` 619 → **629** and
  deliberately did not sweep the ten blocks, per the precedent Task 2.6.8 set that a close owns
  the sweep. So this close inherits **at least one** increment already outstanding before its own
  tasks are counted — which is exactly the shape that produced "stale by two story closes" twice
- **`pnpm links`**, which is a `verify` step since Task 2.6.8 and therefore runs itself. Report
  its counts as figures rather than trusting the last recorded ones — they moved between two
  consecutive readings the first time they were taken

## The figures, re-taken from a clean clone

- Install cost: packages, store entries, `node_modules` KB, lockfile lines, and the
  install-script sweep against **the clone's own store**, which should still return
  `esbuild@0.28.2` and nothing else. This story is expected to add **no dependency**; if it did,
  say what and why, from a fresh install
- `pnpm verify` cold from the clone and warm, with the per-step split
- `pnpm test`, `test:process`, `test:database`, `pnpm e2e`, `pnpm e2e:deployed`, each with its
  count and its wall time
- The frontend artefact — four files, sizes and hashes. **`packages/shared` gained a
  `PROVIDER_IDS` member, so the bundle may have moved by a few bytes**, and that is a check
  rather than a coincidence: Task 2.3.8 measured that a vocabulary declared as a plain literal
  is tree-shaken completely, so the expected answer is **unchanged**, and a change means
  something in shared stopped being a literal. If it moved, explain the mechanism rather than
  recording the number
- Storybook's file count and size, re-taken rather than carried — that figure has been wrong
  when written twice

## The deployed read-back

- `GET /market-data` answers `{"feed":"iex"}`, and the chrome renders it, read in a browser with
  the tab visible
- The `secrets` array is non-`null` and contains what it should, read off the running revision
- Log Analytics returns zero for the key id, the secret, `APCA-` and `Authorization`
- `/health` and `/diagnostics/database` unaffected, `uptimeSeconds` never reset by anything this
  story did

## ADR 0019 — what it has to answer

Written from the facts, in the shape ADRs 0010–0018 use, with a _what a green X certifies and
what it does not_ section, which is this repository's own convention and the most-read part of
those documents.

- **Why the vendor's limits are measured rather than cited**, and what the measurement found —
  including the one number two of the vendor's own pages disagreed about, and what it did to the
  universe sizing
- **The feed asymmetry, and what we chose to tell users** — the finding no open decision
  anticipated: this plan serves **SIP** for historical bars and **IEX** for the live stream, so
  `PRODUCT_SPEC.md` §7.1's `Market feed: IEX` is not straightforwardly true. Record what open
  decision 6 settled, what it cost (`MarketFeed`'s vocabulary, the chrome's sentence, and
  `UNIVERSE.md` §10's quality ceiling narrowing to live data only), and the standing consequence
  that **Epic 3's live bars and this story's stored bars come from different tapes** — which
  `PROVIDER.md` §2.4 already anticipated by making a feed disagreement truthful and reportable
  rather than refused
- **Why the key is stored where it is**, and why the database credential's path did not transfer
- **Why a missing key is a startup refusal and a wrong key is a result** — the two halves of
  open decision 3 that turned out to have different answers
- **Why retry lives in a wrapper**, confirming rather than re-deriving `PROVIDER.md` §8.8, and
  what the measured numbers are
- **Where the line between a result and a throw actually fell** against a real vendor — noting
  that the anticipated `422` split **does not exist** (malformed parameters are `400`, and both
  range failures are `200` with an empty body), and that **two** members could not be produced
  from the bars endpoint rather than one: `unknown-symbol` and `range-not-available`. Include
  the measured collision where a bad key's **HTML** `401` body meets the
  unparseable-body-is-a-throw rule
- **What a green test run certifies and what it cannot**: every mapping test runs against
  recorded bodies, so a green suite says the mapping is consistent with **what the vendor sent
  on the day it was recorded** and nothing about what it sends today. That is the honest
  counterpart to Story 2.6's _"a green suite certifies internal consistency and nothing about a
  vendor"_, and it is what Story 2.8 inherits
- **The lifecycle decisions** and their owners

## What Story 2.8 inherits, stated rather than implied

Write this as a section rather than leaving it to be reconstructed:

- The timeframes and the depth, decided in Task 2.7.1
- The multi-symbol request's real cost, which sizes the backfill
- The rate limit, the retry policy's numbers, and the line that **pacing is Story 2.8's** and
  is not built here
- The bar-density numbers — what a real session contains — which is what its gap handling is
  sized against, **and that they are feed-dependent**: 99.7% mean on SIP against 82.8% on IEX
- **The two request-construction traps**, because both produce plausible wrong rows rather than
  failures: Alpaca's `end` is **inclusive** where `TimeRange` is half-open (one duplicate bar per
  window seam), and a **date-only range includes extended-hours bars** (217 against a 210-minute
  half day)
- Whether the universe is being re-sized, and that after 2.8 backfills, re-sizing costs a
  re-backfill rather than a file edit
- The lifecycle answer, and whether `status` now has a second writer

## Done when

- All seven criteria are re-made, with figures taken rather than cited
- Every sweep has been run and its result recorded, including the ones that came back clean
- `docs/adr/0019-*` exists and answers the list above
- `CLAUDE.md`, `README.md`, `EPIC.md` and this story's `STORY.md` describe the tree that exists
- Story 2.8's file carries what it inherits, in its own words

## Notes

The one thing this close has that previous ones did not is a **live external dependency**, and
it changes what "verified" means. Every previous story's figures could be re-taken from a clean
clone indefinitely; several of this story's cannot be re-taken at all without spending requests
against a metered plan, and some — the rate limit, the history depth — are the vendor's
decisions and can change without telling us.

So `ALPACA.md`'s dates are load-bearing rather than decorative, and the close should say which
figures are **reproducible** and which are **observations from one day**. That distinction is
new to this repository and Epic 3 will need it more than this story does.
