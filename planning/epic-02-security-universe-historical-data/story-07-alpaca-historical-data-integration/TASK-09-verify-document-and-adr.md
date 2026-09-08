# Task 2.7.9 — Verify against the shipped tree, sweep what has gone stale, and record ADR 0019

**Status:** Complete (2026-09-08)
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

   > **Amended 2026-09-07 by Task 2.7.8, because the obvious reading of that task is wrong.**
   > That task **adopted the assets endpoint**, and Task 2.7.6's own note says adopting it "is
   > what would make `unknown-symbol` producible". **It did not, and the count is unchanged at
   > two.** The endpoint was adopted for a **reporting command** (`pnpm universe:check`) and is
   > deliberately not wired into `MarketDataProvider`, so nothing in the bars path gained an
   > opinion about whether a symbol exists. `unknown-symbol` and `range-not-available` are both
   > still unproducible, for the reasons 2.7.6 recorded and unchanged by 2.7.8. Do not go
   > looking for a third producible member, and do not record the endpoint's adoption as having
   > moved this criterion.

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
  `pnpm bars` section; verify rather than add.** **Task 2.7.8 added a SECOND command the same
  way** — `pnpm universe:check` in the script table and its own section — so the table now
  carries two entries this story added. Verify both rather than adding either.** The variable count moves (**13 → 15 at Task
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
  **Task 2.7.7 moved it 722 → 738** (206 + 349 + 183) and **Task 2.7.8 moved it 738 → 750**
  (206 + 361 + 183) — none of the five sweeping the ten blocks, per the precedent Task 2.6.8 set
  that a close owns the sweep. So this close inherits **at least five** increments already
  outstanding, which is exactly the shape that produced "stale by two story closes" twice.
  **Re-count rather than adding to 750** — and note Task 2.7.8 found `CLAUDE.md`'s own recorded
  figure was **619**, stale by four tasks, which is the same drift arriving in the file that
  documents the sweep
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

- **The `delisted`-producer claim, which Task 2.7.8 falsified in FOUR places and amended in
  three of them** — added 2026-09-07. `SECURITY_STATUSES`' absent member was recorded
  everywhere as "its producer is Story 2.7"; that story looked and declined, so the owner is now
  **Story 2.8's ingestion**. `UNIVERSE.md` §3, `packages/shared/src/security.ts` and
  `security.test.ts` carry dated amendments already — **verify rather than re-amend**.

  **The fourth is `apps/backend/migrations/0003_security_vocabulary.sql`, and it MUST NOT be
  touched.** It is applied and checksummed, so editing a comment in it breaks the checksum and
  the deploy refuses — which this repository has already produced once, during the 2026-09-05
  renumber. It also names **Story 2.6**, which was already stale for the same reason. It is a
  historical record inside an immutable file and that is the correct state; the close should
  record it as such rather than reporting it as drift. This is the live-versus-historical
  distinction with a mechanical enforcer behind it

- **`UNIVERSE.md` §11's unenforceable provenance date, which is now INSTRUMENTED but still
  unenforced** — added 2026-09-07 by Task 2.7.8. §11 records that nothing can check
  `checkedOn` is honest, because whether a person re-read a source is unobservable. That is
  unchanged and always will be. What changed is that **re-checking the `profile` group is now
  one command** (`pnpm universe:check`) rather than a manual pass over a hundred rows, and that
  the two dates now legitimately **differ** — `profile` at 2026-09-08, `classification` at
  2026-09-05 — which is the first time §4's two-group design has produced two different values.
  Confirm both, and do not "tidy" them into agreement

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
  2.7.4's provider) and ~~2.7.8 may do it again~~ — **2.7.8 did NOT: it deployed nothing and set
  no platform variable, because what it shipped is an operator's command run from a laptop.** So
  there are **two** rollovers in this story rather than three, and a close looking for a third
  will not find one.

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
- **The lifecycle decisions and their owners**, which are two refusals rather than a feature and
  need the arguments recorded rather than the outcomes. `UNIVERSE.md` §15 is the source; the ADR
  should carry four things it would otherwise lose:

  **A vendor's status field is a fact about the VENDOR** — a third kind of thing beside "a fact
  about the market" and "a fact about us", which is the distinction `UNIVERSE.md` §3 was already
  built on and did not have a third slot for. That generalises well past Alpaca and is the
  reusable half.

  **Cost did not decide it, and the file says so four times over.** The endpoint turned out to be
  free on a separate budget, and both decisions still went the other way. Worth recording as an
  instance of a decision nearly taken on the wrong axis.

  **A premise can be falsified by measurement even when the thing it is about IS adopted.** The
  "stable per-asset identifier" that decision 5 rested on does not survive a rename — six for six
  — so the argument evaporated despite the endpoint being adopted, which is not the branch the
  brief anticipated.

  **And the second writer, which is the transferable engineering lesson**: a column written from
  a file on every deploy cannot have a second writer without a precedence rule, and a precedence
  rule nothing checks is one somebody later simplifies. Produced rather than argued, which is why
  it belongs in _what a green X certifies_: the overwrite is silent and reports as an ordinary
  `1 updated`

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
- **The lifecycle answer, and that Story 2.8 is now the NAMED OWNER of a future `delisted`** —
  amended 2026-09-07 by Task 2.7.8, which declined the member and moved the ownership on a new
  argument rather than deferring it. `status` gained **no** second writer, deliberately. What
  that story inherits is the signal: **bars stopping is better correlated with reality than the
  vendor's flag** (100% against 92% on a 50/50 sample), costs no request, and arrives as a
  consequence of ingestion it is doing anyway. If it adopts the member, `UNIVERSE.md` §15.3's
  produced overwrite is the thing it has to solve first
- **The recycled-ticker hazard, which is Story 2.8's to care about because it is the story that
  files bars against `security_id`** — added 2026-09-07. Tickers are reused: 229 in the current
  catalogue carry both an active and an inactive row, and `FB` today is a ProShares ETF rather
  than Meta. The loader keys on `symbol`, so a recycled ticker added to the file would flip a
  **different** company's row back to `active` on its old id and land two companies' bars on one
  row. **Zero of the 101 are affected today** and `pnpm universe:check` reports it, but the
  report is only run by a person — so a backfill that assumes `security_id` means one company
  forever is assuming something nothing enforces
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

---

## What was done (2026-09-08)

`docs/adr/0019-the-alpaca-client-a-measured-vendor-and-what-a-recorded-fixture-certifies.md`
exists. All seven criteria were re-made and every figure re-taken; nothing was cited.

### The seven criteria

| #   | Criterion                                                  | Re-made how                                                           | Result                                                                                                                             |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Real bars, mapped, provenance naming the requested feed    | `pnpm bars NVDA` from the clean clone, deployed credential's key      | **390 bars**, 2026-09-03, `provider alpaca / feed sip`, coverage exactly the session window                                        |
| 2   | Measured plan limits, dated, incl. the WebSocket cap       | Read `ALPACA.md` and `UNIVERSE.md` §10                                | §10's trigger **fired** and the sizing is **unblocked** (handed to Story 2.8), not still parked                                    |
| 3   | Each mapped cause produced live                            | Bad key against the live API, with a good-key control in the same run | `unauthorised`; whole result is `{"outcome":"unauthorised"}` — no message, no secret, no key id                                    |
| 4   | Rate limiting exercised at the limit                       | 320 concurrent, re-taken                                              | **206 ok / 113 `429`** — a **fifth** reading beside 201, 203, 207, 201                                                             |
| 5   | Key absent from repo, bundle, logs; request path inspected | Instrumented probe **with a control**                                 | Probe sees the secret **once** (the header we send); application output: **0** occurrences of secret **or key id** across 22 lines |
| 6   | Builds, tests, runs with no key                            | Clean clone, **no `.env` anywhere**                                   | build 0, **750** tests, server starts, `/health` 200, `/market-data` `{"feed":null}`                                               |
| 7   | `pnpm verify` with no network                              | `sandbox-exec`, off-machine sockets denied                            | **exit 0 in 35.86 s**, three controls proving the blocker blocks                                                                   |

Criterion 7's wording is ambiguous and the honest reading is **"reaches no host but itself"** —
a blanket `deny network*` takes **13 of 14** process tests red on `listen EPERM`, reproducing
Task 2.6.8's finding exactly.

Criterion 5's control is the part that makes it worth anything: **a sweep that finds nothing
and cannot be shown capable of finding something is indistinguishable from a broken sweep.**

Beside criterion 6, the other half of open decision 3 was produced: `MARKET_DATA_PROVIDER=alpaca`
with no credential **refuses at startup by name**, and half a credential reports **two** lines
through `config.ts`'s accumulator.

### The figures

|                                          |                                                                                                                                                                                               |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean clone install                      | **417 packages** cold in 3.58 s; **419 store entries / 285,008 KB / 4,766 lockfile lines** — Story 2.6's baseline **exactly**, because this story added no dependency                         |
| Install-script sweep (clone's own store) | `esbuild@0.28.2` and nothing else                                                                                                                                                             |
| `pnpm verify`                            | **exit 0 in 43.74 s cold from the clone, 33.81 s warm** — build 3.95 / lint 6.91 / `format:check` 8.71 / `stories` 0.30 / `env:check` 0.26 / `links` 0.34 / `test` 5.93 / `test:process` 9.50 |
| `pnpm test`                              | **750** across 54 files (206 + 361 + 183)                                                                                                                                                     |
| `pnpm test:process` / `test:database`    | **14** / **61 in 1.9 s**                                                                                                                                                                      |
| `pnpm e2e` / `pnpm e2e:deployed`         | **28 in 1.0 m** / **15 in 15.1 s**                                                                                                                                                            |
| `pnpm env:check`                         | **15 backend variables**; **all five** failure modes re-made to fail                                                                                                                          |
| `pnpm links`                             | **220 documents, 511 cross-file links, 34 anchor links, 0 broken**                                                                                                                            |
| Frontend artefact                        | 371,406 B `80c4f6c3…` / 18,063 B `ed3d1744…` / 1,101 B `36eeb287…` / 300 B = **390,870 B**, 4 files, 300 modules                                                                              |
| Storybook                                | **76 files / 9.4 MB**                                                                                                                                                                         |

**The artefact MOVED and the mechanism is the check rather than the number: −57 bytes.** That is
Task 2.7.4 removing `sip`'s sentence, because `MARKET_FEED_DESCRIPTIONS` genuinely ships —
`FeedProvenance` reads it. **`alpaca` is ZERO in the bundle**, confirmed by grep: `PROVIDER_IDS`
is a plain array literal and is tree-shaken completely, which is Task 2.3.8's
literal-versus-constructor rule holding for the third time.

### The deployed read-back

`GET /market-data` → `{"feed":"sip"}`. In a real browser with the tab visible, the chrome reads
`MARKET FEED` / **`ALL US EXCHANGES`** beside `BACKEND SERVICE ● HEALTHY` and
`MARKET CLOCK ○ CLOSED / Labor Day`. The `secrets` array holds `alpaca-api-secret-key`;
fourteen environment variables on the app; `/health` and `/diagnostics/database` unaffected.
**Log Analytics returns zero** for the secret, the key id, `eyJ`, `APCA-`, `Authorization` and
`Bearer` across a **non-vacuous 24,216-record** window — the key **id** too, though it is not a
secret.

**What it does not certify, stated in the ADR: nothing deployed has ever fetched a bar.** The
credential is configured, the provider selected, the feed declared. _Correctly configured to
fetch_ and _fetching works_ look identical until Story 2.8.

### The sweeps — five found something, and two claims were wrong when written

- **The ten convention blocks were stale by FIVE task increments** (619 → 750), the largest
  outstanding run yet. Amended together, verified to land on **one md5**; Stories 1.2 and 1.3's
  two historical variants left at 103.
- **`README.md` was stale at six sites**; Epic 1's `EPIC.md` at four — and its fourth is inside
  the **trailing clause of a line an earlier sweep had already edited**, found stale for the
  second time. A sweep that edits a line does not necessarily finish the line.
- **The vendor grep's MEANING changed rather than its command**, which is the sweep most likely
  to be misread. Code-only over `packages/shared/src` is **2** where `PROVIDER.md` §9.4 recorded
  _"zero and always having been zero"_. Both hits are `PROVIDER_IDS` gaining `"alpaca"` and the
  test that locks the vocabulary, and **neither is a leak**: a `ProviderId` is deliberately _our
  name for whoever sold us the data_, and a vocabulary of provider names that cannot name a
  provider is not one. The check is now **"every hit must be a member of `PROVIDER_IDS` or the
  test that locks it"**. Naive: **13 across 7 files** in shared, **367 across 19** in the backend
  — the second is not a regression, because those files _are_ the vendor client.
- **Two live claims had their conditions ALREADY FIRE**, which is the class this close was best
  at finding. `CALENDAR.md` §2.4's extended-hours trigger reads _"a feed with real
  extended-hours coverage — SIP, i.e. a paid Alpaca tier"_ and **both halves are wrong**: this
  plan serves SIP on the **free** tier and Task 2.7.1 measured extended-hours bars arriving from
  it. Re-stated as **Epic 5's measurement alone**; the V1 scoping decision is untouched, because
  §2 argues about what a baseline denominator should contain rather than about what is
  purchasable. And Story 2.8's _"do not encode a threshold until Task 2.7.4 settles the feed
  question"_ is **spent**.
- **Epic 2's `EPIC.md` carries a third of that shape and it is the one with teeth.** The
  deployed environment being **public** was accepted on two grounds, one being ADR 0011's
  _"nothing deployed holds a credential"_ — expired at Task 2.7.2. The argument is **replaced
  rather than dropped**: no public route returns anything derived from the credential, and
  **Story 2.9 is where this must be re-argued rather than inherited**.
- **`~1.18 GB/year` was given its CONDITION rather than a new number** at all five live sites:
  it assumes per-session requests (1.00×) and a span-shaped backfill stores ~2.8 GB/year.
  Inflating it would misprice the design Story 2.8 should adopt.
- **Three source claims amended, one CONFIRMED.** `security.ts`'s _"the owner is Story 2.7"_ for
  the ticker rename is discharged; its `profile` provenance group is now genuinely reconciled
  against Alpaca, producing **two different dates** for the first time (`profile` 2026-09-08,
  `classification` 2026-09-05) — confirmed and deliberately not tidied into agreement. And its
  prediction that `exchange` stay a plain `string` **came true and held**.
- **`0003_security_vocabulary.sql` names the wrong story twice and was NOT touched** — applied
  and checksummed, so editing a comment breaks the checksum and the deploy refuses, which this
  repository already produced once during the 2026-09-05 renumber. A historical record inside an
  immutable file is the correct state.
- **Clean:** ADR 0011's amendment and Epic 2's prediction already stood; `CALENDAR.md` §2.2's
  `minuteBars` confirmation still describes the shipped client (which subtracts one
  **millisecond**, the exact half-open-to-inclusive conversion); `README.md`'s `pnpm bars` and
  `pnpm universe:check` sections were already present; the market-feed row had already left the
  faults list at Task 2.6.7.

### One thing recorded that this brief did not anticipate

**`CLAUDE.md` was missing its Story 2.7 record for Tasks 2.7.4 through 2.7.7 entirely** — it
jumped from 2.7.3 to 2.7.8. Four paragraphs were written from the task files and `ALPACA.md`
rather than the sweep only correcting numbers. That is a different failure from staleness: a
figure that rots is visible once somebody re-measures, where an **absent** paragraph looks
exactly like a story that did nothing.

---

## In plain English — a status report for whoever is paying for this

### What actually happened this week

Up to now, MarketPulse has been a very carefully built empty building. Real rooms, real wiring,
real front door, real address on the internet — and no furniture, because there was no market
data in it. Everything on screen was either a placeholder or a hand-written example.

**That changed.** The product now talks to a real market-data provider, with a real account,
and can fetch real prices for real companies. Typing one command prints Nvidia's actual
minute-by-minute prices for a real trading day — 390 of them, which is exactly how many minutes
a US trading session has. It is the first genuinely real number this product has ever produced.

**This particular task did not build that. It checked it, and wrote down why it is built the
way it is.** Every project accumulates claims that quietly stop being true; this repository's
habit is that at the end of each chunk of work, somebody re-does every check from a completely
fresh copy of the code and goes looking for sentences that have expired. That is what this was.

### The three findings worth a stakeholder's attention

**1. The data is much better than we thought we were buying.** The provider's own website says
the free plan gives you prices from a single stock exchange — a slice of the market, not the
whole thing. We measured it, and for historical data it actually gives us **the full US
consolidated tape: every exchange**. That is a large, free upgrade to the quality of every
number the product will ever show. On thinly traded companies the difference is stark: one
security we sampled had 43% of its minutes covered on the single-exchange feed and 98.5% on the
full one.

We did not take this on trust. Two pages on the vendor's own site contradict each other by a
factor of a hundred on a related limit, which is exactly why we measure rather than read.

**2. The screen now tells the truth, and getting the wording right took three attempts.** The
live site's status bar reads **ALL US EXCHANGES**. That matters more than it sounds: the product
spec has a hard rule that we must never let a user believe a number covers the whole market when
it does not, because that is a false claim about a number and this product exists not to make
those.

The first version we shipped said "Consolidated tape" in large letters with a plain-English
explanation underneath in small print. Technically accurate; practically useless, because
"consolidated tape" is industry jargon and the person reading a status bar in a hurry sees the
big words. **Every automated check passed** — accessibility, layout, all the visual states side
by side — because none of them can tell you that a word is jargon. A human read the running
page and spotted it in a sentence.

Worse, and more instructive: **an automated test had locked the wrong version in place**, with a
comment beside it stating the rule its own check contradicted. A test can preserve a mistake as
easily as it can prevent one. That is now fixed at both ends.

**3. The universe question is unblocked.** MarketPulse currently tracks 101 companies, and we
had deliberately parked the question of whether that is enough, because it depended on a
technical limit nobody had measured. We measured it. The limit does not apply to the kind of
data we use — we successfully subscribed to **5,000** companies at once on a free account. So
growing the tracked list is now a curation question (who picks the companies and classifies
them) rather than a technical one. That is a much better problem to have.

### Two decisions we deliberately did NOT make

Both were things the plan expected us to build, and in both cases we looked at real evidence and
declined — which is worth reporting, because "we built less than planned" and "we found out we
shouldn't" are very different outcomes.

**We did not add a "delisted" status for companies that stop trading.** The provider has a flag
that looked like it would tell us. We sampled it against actual market activity and found it is
**wrong 8% of the time, in the dangerous direction** — it marks companies as gone that are still
trading. It also cannot tell us _when_ a company was delisted, which is precisely what our
future replay feature needs. So we built a **report** instead: a command an operator runs that
says "these look worth a look" and changes nothing. It found a real error on the day it was
written — Walmart was recorded on the wrong stock exchange, having moved listings in December
2024, and nothing we had could previously see that.

**We did not build machinery for company ticker changes** (Facebook → Meta, that kind of thing).
The whole plan for it rested on the provider giving each company a permanent ID. We checked six
real renames. **The ID changed in all six** — and Facebook's old ticker now belongs to a
completely different fund. The premise was simply false, so the mechanism would have been built
on sand. We wrote down what happens instead, and named the story that has to solve it before it
becomes expensive.

### What is honestly still missing

**Nothing on the live site fetches market data yet.** The credential is installed, the provider
is selected, the site correctly announces which feed it reads — but no price has ever been
fetched in production. That is the next story's job. We have said so plainly in the record
rather than letting "correctly configured" quietly read as "working".

**And a new kind of risk arrived this week that the project has not had before.** Every previous
piece of this system could be re-verified from scratch, forever, by anyone with the code. Half
of what we now depend on is a third party's behaviour on one particular day — their rate limits,
their history depth, which data they serve. Those can change without telling us, and no
automated test we have would notice. So every one of those numbers is now recorded **with the
date it was taken**, with a standing instruction to re-measure rather than quote. That is a
deliberate, documented limitation rather than a gap somebody will trip over.

### Where this leaves the product

The next story stores the data. The one after that serves it. Then a chart. **Story 2.12 is
where a stakeholder sees a real price chart for a real company**, and everything between here
and there is plumbing that had to be measured before it could be sized. This week's work is
what makes that plumbing the right size.
