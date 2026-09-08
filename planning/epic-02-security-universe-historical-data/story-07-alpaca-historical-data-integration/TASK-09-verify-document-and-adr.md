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
chrome says `ALL US EXCHANGES` and explains what that means. This task confirms it is still true from a clean
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
4. **Rate limiting exercised at the limit** — re-read Task 2.7.7's live run, and note that it
   did more than exercise the wrapper: it **settled `ALPACA.md` §6's open per-key-or-per-endpoint
   question** (per _API_ — a second `data` path shares the bucket, the trading API does not) and
   **falsified the "window" model everything before it was written against**. The limiter is a
   **token bucket refilling at 3.23/s**, not a punished sixty seconds, so a `429` costs one
   request rather than a minute. Everything in `ALPACA.md` §6 and in Tasks 2.7.1 and 2.7.6 that
   says _window_ was written before that was measurable; §6b is the correction and it is
   deliberately additive rather than a rewrite. **Re-take the burst rather than citing it** —
   there are now four readings (201, 203, 207, 201) and they are one day's observations of a
   live third party
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
  ~~in particular that the client does subtract a timeframe from `end`~~ **amended 2026-09-07:
  it subtracts one MILLISECOND, and that check as written would have failed against correct
  code.** Task 2.7.3 chose the millisecond because it is the _exact_ half-open-to-inclusive
  conversion — correct for any timeframe with no table and no DST arithmetic, verified live on
  both. §2.2's own wording is unaffected: it records that the vendor's `end` is inclusive and
  prescribes no fix, so what was stale is **this bullet**, not `CALENDAR.md`
- **`CALENDAR.md` §2.4's reversal trigger, whose condition has SILENTLY ALREADY FIRED.** Found
  by Task 2.7.3 while checking the bullet above, and it is the sharper of the two. §2.4 gives
  the trigger for extended-hours support as _"a feed with real extended-hours coverage — **SIP,
  i.e. a paid Alpaca tier**"_. **Both halves are now wrong**: this plan serves SIP on the
  **free** tier, and Task 2.7.1 measured extended-hours bars arriving from it — that is exactly
  what the 217-bars-on-a-210-minute-half-day finding _is_. **A reversal trigger written against
  a condition that has already occurred is a trigger that will never fire.** The decision to
  scope V1 to the regular session is untouched and stands on its own merits — §2 argues about
  what a baseline denominator should contain, not about what is purchasable — so what needs
  re-stating is the trigger, which is now Epic 5's measurement alone
- **The `pnpm verify` gap lists in `CLAUDE.md`** — the sixth kind gained the platform secret at
  Task 2.7.2 **and `MARKET_DATA_PROVIDER=alpaca` at Task 2.7.4**, and the two fail in opposite
  directions, which is the part worth writing down rather than the count. A **missing
  credential** beside a selected provider is a **startup refusal** — loud, naming the variable,
  by Task 2.7.2's cross-variable check. A **missing `MARKET_DATA_PROVIDER`** is a **silent
  fallback to `none`**, which is the correct safe default and which also means a deployment can
  quietly stop naming its feed with nothing failing anywhere: `/health` stays 200,
  `/market-data` answers `{"feed":null}`, and the chrome reads `NOT CONFIGURED`, which is
  indistinguishable from a deployment that never configured one. It exists in no file in this
  repository, so this paragraph and `HOSTING.md` are its only durable copy.

  **The FIRST kind gained a directory at Task 2.7.6, and it is the first entry there that is
  excluded ON PURPOSE rather than by a tool declining it.** `apps/backend/src/fixtures/alpaca/`
  is in `.prettierignore` and carries `** -text` in `.gitattributes`, because two of this
  repository's own tools would otherwise have rewritten recorded vendor bodies: Prettier infers
  an `html` parser for the `401` page, and `* text=auto eol=lf` would normalise it — **nginx
  really does send CRLF**, confirmed with `xxd`. Neither would have failed a test, which is the
  part worth recording: the tooling would have degraded the evidence without degrading the green
  tick. Note the asymmetry against every other member of that kind — those are files no tool
  reads, this is a directory tools _would_ read and are told not to.

  Any recorded invariant this story created (a coupled constant, a second writer on `status`, a
  pin) belongs in the third kind with its durable copy named.

  **Task 2.7.7 created one of exactly that shape, and it is a precondition rather than a
  constant.** The wrapper gives up when the delay plus one plausible attempt does not fit in
  what is left, so **a caller with a tight deadline silently gets no retries at all** — correct,
  and invisible, because the answer is the real cause rather than an error saying "I did not
  try". `pnpm bars` honours it by passing its own 20 s (`BARS_COMMAND_DEADLINE_MS`, derived from
  Task 2.7.5's measured five-page walk), and **nothing checks that a future caller does**. The
  two constants that _are_ checkable — `RETRY_MAX_DELAY_MS + MIN_ATTEMPT_BUDGET_MS <
DEFAULT_BARS_DEADLINE_MS` — are asserted by a test, which is this repository's own rule that a
  test beats a `verify` step when the thing checked is reachable from code. The unchecked half
  is the caller's deadline, which no test can see

- **`README.md`** — ~~the script table gains `pnpm bars`~~ **added by Task 2.7.3 along with a
  `pnpm bars` section; verify rather than add.** The variable count moves (**13 → 15 at Task
  2.7.2, and further if anything after it adds one**), and ~~the "things that look like faults"
  list may lose or keep the market-feed row depending on what Task 2.7.4 left on screen~~ —
  **resolved 2026-09-07: there is nothing to do.** That row left the list at Task 2.6.7, which
  replaced the invented `DISCONNECTED` with provenance and is only the _second_ item ever to
  leave it; 2.7.4 changed the word that region renders and not whether it reads as a fault.
  **Verify rather than edit**, and if the row is still there, 2.6.7's sweep missed it
- **`pnpm env:check`'s own description, in `CLAUDE.md` and `README.md`.** Task 2.7.2 gave it a
  **fifth** failure mode — a variable with no default must be documented **blank**, which is a
  leak guard rather than a formatting rule, because the default comparison is structurally
  inapplicable to a no-default variable and every no-default variable is a credential. Anything
  describing that script as "four checks" is now stale. Re-make all five fail rather than citing
  2.7.2's run
- **The test-count blocks' starting figure.** Task 2.7.2 moved `pnpm test` 619 → **629**, Task
  2.7.3 moved it 629 → **683**, **Task 2.7.6 moved it 683 → 722** (206 + 333 + 183)
  and **Task 2.7.7 moved it 722 → 738** (206 + 349 + 183) — none of the four sweeping the ten
  blocks, per the precedent Task 2.6.8 set that a close owns the sweep. So this close inherits
  **at least four** increments already outstanding before its own remaining tasks are counted,
  which is exactly the shape that produced "stale by two story closes" twice. **Re-count rather
  than adding to 738**
- **Story 2.14's own file, which is planned against a premise this story inverted — and it is
  the sweep most likely to be skipped, because it is a FUTURE story's file rather than a stale
  claim about the past.** Added 2026-09-07 by Task 2.7.4. Story 2.14 is written throughout as
  _"label the feed as IEX so nobody reads it as full US market coverage"_ — a **disclaimer** —
  in at least three live places: its summary (_"the feed labelled as **IEX rather than the
  consolidated tape**"_), its scope bullet (_"`Market feed: IEX` … so a reader learns this is
  one venue rather than all of them"_) and its open decision 2 (_"IEX is a real feed, not a
  degraded one"_).

  **Two things falsify that framing and only one of them is a wording change.** Stored
  historical bars are **SIP**, so for them the honest label is the opposite of a disclaimer.
  And the harder one: Epic 3's live stream is IEX while this story's stored bars are SIP, so a
  single series can name **two feeds at once** — which `PROVIDER.md` §2.4 deliberately designed
  for by making a feed disagreement truthful and reportable. Story 2.14's job is therefore not
  _"label the feed"_ but _"render a **list** of sources that may disagree about feed"_, which is
  a materially larger surface than its scope currently describes.

  **Do not rewrite that story's scope from here** — say what was falsified, and let it re-take
  its own decisions with the measurements in hand. Its open decision 2 (the exact wording) is
  the right owner, and it is now a decision about **two** claims rather than one

- **Story 2.8's own `STORY.md`, for the same reason Story 2.14's is on this list and with a
  larger blast radius** — added 2026-09-07 by Task 2.7.5. That story carries a handover section
  written by Task 2.7.1, and three of 2.7.5's findings land inside it:

  **Its two request-construction traps do not cover the window-shape one.** Trap 2 is about
  _bare-date_ ranges leaking extended hours; 2.7.5 measured that a multi-day span does it with
  **explicit instants too**, at **~2.35×** — 22,952 bars for a month against 9,750 regular-hours
  ones, with the regular-hours subset matching `minuteBars` exactly. A reader who fixes trap 2 by
  sending instants has not fixed this. **The answer is to request per SESSION**, measured at
  exactly 1.00×.

  **The naïve backfill is the refused shape.** _"From the last bar I stored, to now"_ is a flat
  **`403`** with nothing in it, and Story 2.8's file does not know that. The clamp protects it —
  but a backfill that bookmarks `requested.end` rather than `covered.end` re-fetches or leaves a
  permanent 16-minute hole, so the resume point is a design constraint rather than a courtesy.

  **And its _"do not encode a threshold until Task 2.7.4 settles the feed question"_ is spent**,
  since 2.7.4 settled and deployed it. That is the same shape as `CALENDAR.md` §2.4 above: an
  instruction whose condition has already occurred.

  **Do not rewrite that story's scope from here**, per the rule the Story 2.14 bullet sets — say
  what was falsified and let it take its own decisions

- **The `~1.18 GB/year` storage figure, which is CONDITIONALLY still correct and must not be
  swept** — added 2026-09-07 by Task 2.7.5. It stands in `UNIVERSE.md` (4 sites), `HOSTING.md`
  (2), `CLAUDE.md` and two task files, and it assumes 390 bars a session. 2.7.5 measured that a
  span-shaped request stores **~2.8 GB/year** and a per-session one stores exactly the recorded
  figure. **So the sweep is to attach the condition, not to restate the number**: inflating it
  would be wrong for the design Story 2.8 should adopt, and deleting it would throw away a
  measurement that is right. This is the live-versus-historical distinction Task 1.10.8
  established, arriving as a _conditional_ rather than as a date

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

- `GET /market-data` answers `{"feed":"sip"}` — **not `iex`**, settled by Task 2.7.3 — and the
  chrome renders `ALL US EXCHANGES`, read in a browser with the tab visible
- The `secrets` array is non-`null` and contains what it should, read off the running revision
- Log Analytics returns zero for the key id, the secret, `APCA-` and `Authorization`
- `/health` and `/diagnostics/database` unaffected, and ~~`uptimeSeconds` never reset by
  anything this story did~~ — **amended 2026-09-07 by Task 2.7.4, because that check would
  report a failure that did not happen.** Setting a platform variable creates a **new revision**,
  a new revision is a **new replica**, and `process.uptime()` therefore _must_ restart —
  measured, 164.9 s → 11.3 s. Two of this story's tasks already did it (2.7.2's credential,
  2.7.4's provider) and 2.7.8 may do it again.

  The checkable claim, which is stronger and which **held** at 2.7.4: **no request returned a
  non-200 through the rollover**, `restartCount: 0`, and the superseded revision served at
  weight 0 until the new one was ready — Task 1.11.7's _"traffic weight is not what serves"_.
  Assert that, not the uptime. The sentence is worth reading twice before it is copied into the
  next task that sets a platform variable, which is how it got here.

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
  rather than refused.

  **And record what the label swap taught, because it is a rule rather than an anecdote**
  (Task 2.7.4, same day it shipped). `sip` went out as label `Consolidated tape` under sentence
  _"All US exchanges, via the consolidated tape."_ — the **jargon** as the big word and the
  **plain meaning** as the small print, which inverts the rule this repository had already
  written down three times (`FeedProvenance.tsx`, `PROVIDER.md` §4.4, ADR 0018): _the sentence
  is the requirement and the word is only the affordance._ It went through two more strings
  before landing on **`All US exchanges` with no sentence at all** — the second restated the
  label and contrasted it with a feed this deployment never renders, the third was a fact nobody
  reading a status strip needs.

  **Record the rule rather than the strings**: a feed gets a sentence _when its label cannot
  stand alone, and not otherwise_. `iex` and `synthetic` need one; `ALL US EXCHANGES` is itself
  the coverage claim §7.1 asks to be legible. `MarketFeedDescription.sentence` is optional as a
  result, with `Record<MarketFeed, …>` replacing `as const satisfies` so the no-words guard
  survives while `.sentence` widens to `string | undefined` at every reader

  Two things worth the ADR's space. **Every automated check passed** — nine axe readings, a
  permutation grid, a layout measurement at five viewports — and the defect was caught by a
  person reading the running product in one sentence; a grid proves six states render and
  cannot tell you the word is jargon. And **a test had locked the inversion in place**, with
  its own comment stating the rule its assertion contradicted, which is the sharper half: a
  test can make a defect permanent as easily as it can prevent one. Both halves are now
  asserted, so the inversion cannot return silently

- **Why the key is stored where it is**, and why the database credential's path did not transfer
- **Why a missing key is a startup refusal and a wrong key is a result** — the two halves of
  open decision 3 that turned out to have different answers
- **Why retry lives in a wrapper**, confirming rather than re-deriving `PROVIDER.md` §8.8, and
  what the measured numbers are — plus the three things Task 2.7.7 measured that a design
  argument alone would not have produced:

  **The limiter is a refilling bucket, not a punished window**, which is what makes the whole
  policy cheap: a backoff has to outlast a **token** (~310 ms) rather than a minute, and
  `RETRY_BASE_DELAY_MS` is 300 because the refill interval and the round trip — two independent
  measurements — land on the same number.

  **`timeout` is retryable in the taxonomy and unreachable through the wrapper**, because a hung
  attempt consumes the whole remaining budget by definition. Worth the ADR's space precisely
  because it looks like a contradiction and is not: `isRetryableOutcome` classifies a _cause_ and
  the wrapper is bounded by a _budget_. Slicing the caller's deadline into per-attempt portions
  would make it reachable and was rejected — it invents a second timeout the caller cannot see.

  **And the finding that belongs in _what a green X certifies_: retry helps one caller and does
  not help a crowd.** 320 concurrent calls gave 91 answers bare, 206 through the wrapper at a 3 s
  deadline (606 requests) and 263 at 20 s (1,473) — so it works, retries plainly count against
  the limit, and the return diminishes while the cost does not: 2.5 requests per extra answer,
  then 15, sustaining **73 req/s against a 3.23/s refill** and still leaving 57 refused. That is
  the strongest evidence in this repository for §8.8's line that **pacing is Story 2.8's**, and
  it is evidence rather than an argument, which is the difference worth recording

- **Where the line between a result and a throw actually fell** against a real vendor — noting
  that the anticipated `422` split **does not exist** (malformed parameters are `400`), and that
  **two** members could not be produced from the bars endpoint rather than one:
  `unknown-symbol` and `range-not-available`. Include the measured collision where a bad key's
  **HTML** `401` body meets the unparseable-body-is-a-throw rule.

  > **CORRECTED 2026-09-07 by Task 2.7.6: "both range failures are `200` with an empty body" is
  > half wrong, and this bullet said it.** A range before the plan's history depth is `200` and
  > empty; a range entirely **in the future** is a **`403`**, carrying the recency cliff's body
  > word for word, because that cliff is keyed on `end` alone. `ALPACA.md` §9's row was taken by
  > Task 2.7.1 _before_ 2.7.5 discovered the cliff, so it is a figure whose meaning changed
  > rather than a careless measurement — struck and dated there. **The conclusion survives
  > intact**: `range-not-available` is still not producible through the shipped client, because
  > the too-deep case is a success and the future case is clamped away before a request is made.
  > Do not restate the struck claim in the ADR.

- **The `403`-to-`range-not-available` argument, recorded rather than taken** (Task 2.7.6).
  _"The symbol exists and this provider will not serve this window"_ is `PROVIDER.md` §8.1's
  definition of `range-not-available` word for word, and it describes the recency `403` exactly;
  the caller's repair is to narrow the range rather than to fix a key. It maps to `unauthorised`
  instead, for three reasons recorded in `ALPACA.md` §9 and in a comment beside the branch. The
  ADR should carry it as a **live open question with a named trigger**, not as a settled mapping
  — it is the one place in this story where a measured response and the taxonomy's own wording
  point in different directions
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
- The rate limit **as a bucket refilling at 3.23/s rather than a window**, the retry policy's
  numbers, and the line that **pacing is Story 2.8's** and is not built here — with Task 2.7.7's
  measurement attached rather than the assertion alone, because that story is the caller most
  likely to discover the multiplication the hard way: a hundred concurrent retriers compete for
  one refill, and what fixes it is asking less often. It gets that cheaply, since the limit is
  per **request** rather than per symbol
- **What a retry re-spends: a retried symbol costs its page count again.** The wrapper composes
  around the interface, so a retry re-runs the walk from page 1 — accepted deliberately, because
  a resumed walk needs a resume point and Task 2.7.5 refused to expose one. A hundred symbols
  retried once is a hundred times the page count, not a hundred requests
- The bar-density numbers — what a real session contains — which is what its gap handling is
  sized against, **and that they are feed-dependent**: 99.7% mean on SIP against 82.8% on IEX
- **The THREE request-construction traps** — amended 2026-09-07, Task 2.7.3 produced a third —
  because every one produces plausible wrong rows rather than a failure:
  1. Alpaca's `end` is **inclusive** where `TimeRange` is half-open (one duplicate bar per window
     seam). Closed in `toAlpacaQuery` by subtracting **one millisecond**, the exact conversion;
     a backfill that reconstructs a bound of its own reopens it
  2. A **date-only range includes extended-hours bars** (217 against a 210-minute half day)
  3. **A daily bar is stamped at midnight ET**, hours before the session opens — so a daily
     request framed on `[open, close)` contains **no daily bar at all** and returns a perfectly
     well-formed empty answer. Produced rather than reasoned about: `pnpm bars NVDA 1d` printed
     _"no bars"_ until `fetch-bars.ts`'s `windowFor` gave the two timeframes different windows.
     Story 2.8 builds windows for both timeframes and will meet it
- Whether the universe is being re-sized, and that after 2.8 backfills, re-sizing costs a
  re-backfill rather than a file edit
- The lifecycle answer, and whether `status` now has a second writer
- **The label-and-sentence rule, which Epic 3 is the next thing to have to honour.** It adds no
  member — `iex` already exists and already has its words — but it is the first thing to make
  `iex` render anywhere, so it is where the rule gets its next real test. The two assertions in
  `market-provenance.test.ts` are per-feed and name their feeds by hand, deliberately, because
  _"the label is plain English"_ is not genericly assertable; a feed added later therefore gets
  **no** check unless somebody writes one. That is a stated gap rather than an oversight

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
