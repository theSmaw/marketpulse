# Task 2.6.5 — The error taxonomy, and where a retry policy is allowed to live

**Status:** Complete
**Story:** [2.6 Market-Data Provider Abstraction](STORY.md)
**Depends on:** Task 2.6.4

## Objective

Turn "the call failed" into a closed set of causes a caller can branch on, in the shape
Story 1.7 established for `ApiError` — and decide where rate limiting and retry live, without
choosing the numbers, which Story 2.7 measures.

## What the user can see when this lands

**Nothing yet.** But this task decides how many different things the product can eventually
say when a price is missing, and Story 2.14's whole subject is that "we have nothing for this
symbol" and "the feed refused us" are different sentences rather than one error screen.

## Work

### The causes, from Task 2.6.1's list, and each one earns its place

**Amended 2026-09-07 by Task 2.6.4: TWO of the seven already exist, so this task adds FIVE.**
`BarsResult` in `apps/backend/src/market-data-provider.ts` ships with `ok`, `timeout` and
`aborted`. The split is not an encroachment and it is worth understanding before reading it
as one: those two are the only causes that follow from **2.6.4's own request shape** — they
are the two ways the deadline and the abort signal on `BarsRequestOptions` end a call — and
they are producible with no upstream and no implementation in existence. A deadline with no
outcome to express its expiry is a deadline nobody can observe, so 2.6.4's own types would
have been incoherent without them. What remains for this task is the five that are facts
about a **world** 2.6.4 does not describe: `unknown-symbol`, `range-not-available`,
`rate-limited`, `unauthorised`, `upstream-unavailable`. Eight outcomes total, exactly
`PROVIDER.md` §8.1's table, with no member owned twice.

**The addition is mechanically safe and that was verified rather than hoped for.**
`market-data-provider.test.ts` switches exhaustively over `BarsResult` with a
`satisfies never` in the default branch, and adding a sixth member was **made to fail**
before this note was written: it reports `TS2322: Type '{ readonly outcome: "rate-limited"; }'
is not assignable to type 'never'` plus `TS1360`. So every consumer of the union stops
compiling until it handles the new members, which is what turns "the taxonomy arrives later"
from a hope into a mechanism — and it means this task's first symptom will be a **red build
in a file it did not edit**, which is correct rather than a problem.

Two smaller things 2.6.4 settled that this task inherits rather than re-decides. **The
empty-answer rule is already implemented and asserted** (`PROVIDER.md` §8.2): a test in that
file constructs an empty `BarSeries` with `coverage.covered: null` and asserts it is an `ok`,
so the "Done when" bullet below is a re-check rather than new work. And **neither existing
failure member echoes the request back**, because the caller holds it — this task decides
that for its own members, where a batch caller may genuinely need the symbol beside the
cause, and `PROVIDER.md` §8.6 permits it.

**Amended 2026-09-07 by Task 2.6.1. The list is settled in `PROVIDER.md` §8.1 and it is
SEVEN causes rather than the five below — one struck, one renamed, two added. This task
implements that table; it does not re-derive it. Read §8 before writing a line, and overturn
a member only with a recorded reason.** The three changes, so the difference is visible
rather than buried in a cross-reference:

- ~~**bad range**~~ is **struck**, and `range-not-available` replaces it. The description
  below calls it "a defect at the call site", and Task 2.6.2's `TimeRange` constructor
  already makes that reading **unreachable** — a reversed or zero-width range is refused
  naming both ends, following `marketSessionsBetween`. **Confirmed 2026-09-07: that shipped,
  and it is stronger than predicted here.** The type is branded, so a bad range cannot be
  built by object literal at all rather than merely being refused by a constructor somebody
  might not call; and there are three refusals rather than two, the third being an invalid
  `Date`, which otherwise slips past the ordering check entirely. So `range-not-available`
  stands as the only surviving reading, and it is a fact about the world. What remains is a range the provider
  will not serve (before its history depth, in the future, too large), which is a fact about
  the world. A member whose name lies about whose fault it is gets handled wrongly.
- **`timeout` and `aborted` are added**, for `api-client.ts`'s reasons, which transfer whole
  (`PROVIDER.md` §8.4). `timeout` is the only outcome that is a joint fact about the vendor
  **and our own deadline**, so it admits a repair — raise the deadline — that "they are down"
  does not. `aborted` is not a fact about the world at all, and the obligation it carries is
  Task 1.12.3's: **never render an `aborted` as a market-data state.**
- **"No data for this range" is NOT an error** — settled, `PROVIDER.md` §8.2. It is a
  successful empty answer: `bars: []`, `coverage.covered: null`. This is the single most
  likely thing to be got wrong by whoever writes the first `if (bars.length === 0)`.

The original five, kept for the record, each separated from its neighbours by **a different
thing a caller does about it** — `API_ERROR_CODES`' own rule, where a member is added when a
failure can be produced and merged when nothing branches on the difference:

- **unknown symbol** — the request was well-formed and there is no such security. Story 2.14
  renders this as an answer, not a failure
- **rate-limited** — retryable, and the only member that plausibly carries a hint about when
- **unauthorised** — a configuration fault, never retryable, and the one Story 2.7's deploy
  will produce for real when a key is wrong
- **upstream unavailable** — the vendor is down or unreachable; retryable, unlike the above
- ~~**bad range**~~ — struck; see above

### The line between a result and a throw

Task 2.6.4 established that a provider call returns rather than rejects. This task draws the
line, and it should be written as a sentence somebody can apply:

**A cause is a member when it is a fact about the world; it is a thrown defect when it is a
fact about our code.** A rate limit is the world. A mapping function that received a shape it
did not expect is us — and laundering that into a tidy `upstream-unavailable` is how a bug
becomes a permanent, invisible degradation.

Note the trap Task 2.1.7 found in a neighbouring place, because it applies to whatever is
built here: a leak test can pass because `fast-json-stringify` strips an undeclared property,
so **a green test is not evidence that a handler could not leak** — the schema is what holds
it shut. Anything here that eventually reaches a response inherits that.

### What a cause may carry, and what it must never

Each member may carry what a caller can act on: which symbol, which range, a retry hint.

It must not carry the vendor's raw response body or its message, and the reason is Task
1.7.4's, measured rather than assumed: a 5xx that passes the upstream message through
answered a request with `connection to postgres at 10.0.0.4:5432 refused`. **A message
written for a developer is internal detail too**, and it is the half that looks harmless.
The cause is the wire; the detail goes to the log under the request's correlation id, which
is the arrangement `errors.ts` already ships and Task 2.1.7 already reused for
`/diagnostics/database`.

### Every cause must be producible, which is why this task precedes the fixture provider

Acceptance criterion 4 says each cause is **producible against the fixture provider** and
each is **distinguishable by the caller**. That is two claims and they are checked
differently — one is a test that makes it happen, the other is a compile-time property of the
union.

This task owes the taxonomy in a shape Task 2.6.6 can produce every member of. If any member
turns out to be unproducible even by a fixture, that member is a guess and should be struck
here rather than shipped and never exercised.

### The retry and rate-limit policy: shape only, no numbers

The story is explicit that the numbers are Story 2.7's, measured. What this task settles is
**where the policy lives and what it is allowed to do**, and there are three candidates with
real differences:

- **Inside each provider implementation.** Rejected on sight, probably: it makes the deadline
  a lie (Task 2.6.4), and it means every future provider re-implements it differently.
- **A wrapper implementing the same interface**, composed around a provider. Testable against
  the fixture provider with no network at all, replaceable, and it keeps the provider itself
  a thing that makes exactly one attempt. This is the shape to beat.
- **At the call site**, in Story 2.8's backfill. Right for _pacing_ a hundred symbols and
  wrong for retrying one request, and conflating the two is how a backfill ends up retrying a
  whole batch.

**Amended 2026-09-07: `PROVIDER.md` §8.8 recommends the WRAPPER with the arguments and the
two rejections already written out, plus the distinction that decides it — per-request retry
is the wrapper's, cross-request pacing across a hundred symbols is Story 2.8's backfill, and
conflating them is how a backfill retries a whole batch. The final call remains this task's;
confirm it or overturn it with a reason, and do not re-derive it from scratch.**

Whatever is chosen, write down the three constraints that make retry dangerous here rather
than leaving them to be rediscovered: **only retryable causes are retried** — a retry on
`unauthorised` is a loop against a wall; **a retry must not outlive the caller's deadline or
its abort signal**; and **a retry policy plus a rate limit is a queue**, which has a depth,
and an unbounded one is a memory leak wearing a politeness costume.

## Done when

- The taxonomy is a closed union in `apps/backend`, **all seven members from `PROVIDER.md`
  §8.1** and no others — **of which `timeout` and `aborted` already shipped in Task 2.6.4, so
  this task adds five** — with no vendor name in a type, an identifier or a value — grepped
  **over code rather than text**, per Task 2.6.2's finding and `PROVIDER.md` §9.5
- The empty-range question's settled answer (`PROVIDER.md` §8.2 — a successful empty answer,
  never an error) is **implemented**, and is written where Story 2.12 will read it
- No member can carry an upstream message or body, and that is structural rather than a
  convention
- The retry policy's **home** is decided and written down, with the two rejected candidates
  and their arguments; no numbers
- `pnpm verify` is exit 0

## Notes

The failure mode to avoid is a single `ProviderError` with a `message`, which is what every
codebase has before somebody needs to render two of them differently. Story 2.14's whole
subject is that "we have nothing for this symbol" and "the feed refused us" are different
sentences; a string cannot be switched on.

---

## What was done (2026-09-07)

Two files changed — `apps/backend/src/market-data-provider.ts` and its tests — plus
amendments back into `PROVIDER.md` §8.1, §8.6, §8.8 and §9.5. **No dependency, no lockfile
change, no new script, no new `verify` step, and nothing in `packages/shared` or
`apps/frontend` touched.**

### The five members landed as a compile error in a file this task did not edit

The mechanism Task 2.6.4 built was **executed rather than trusted**. Adding the members and
running `pnpm typecheck` before touching anything else reported, in
`market-data-provider.test.ts`:

```
error TS2322: Type '{ readonly outcome: "unknown-symbol"; } | ... ' is not assignable to type 'never'.
error TS1360: ... does not satisfy the expected type 'never'.
```

That is the whole of why the taxonomy could arrive four tasks after the interface without
being a rewrite, and it is the property a ninth member inherits.

### §8.1's table shipped unchanged — no member struck, renamed or added

Eight outcomes, exactly the table. What this task added on top of it is the **third column**,
which was prose and is now `isRetryableOutcome()`, sitting beside the union it classifies for
the reason `isApiError()` sits beside `ApiError`: **a wrapper that re-derives retryability in
a `switch` of its own is a second copy of the taxonomy, and the two disagree the first time a
member is added.**

It is an **exhaustive `switch` rather than an array of retryable outcomes**, and that is the
decision rather than an implementation detail: an array leaves a ninth member silently
non-retryable — which is the _safe_ answer, arrived at by silence, and silence is the thing
this repository keeps refusing.

### The rule for what a member may carry came out NARROWER than §8.6 permitted

§8.6 allowed the symbol and the range. Neither is carried, and the rule that replaced it is
one sentence somebody can apply:

> **A member carries only what the caller does not already hold.**

That explains everything: `timeout` carries `deadlineMs` because a caller that omitted one
does not know which number it was measured against; `rate-limited` may carry a hint because
that is genuinely new information from the vendor; and nothing echoes the symbol or the
range, because a request is for exactly one symbol over exactly one window, so a copy can
only agree or be wrong. The batch case §8.6 anticipated does not need it either — a batch
returns a `BarsResult` **per symbol**, so the symbol is beside the cause structurally.

The result is **one rule rather than a rule with an exception**, and it agrees with the two
members Task 2.6.4 had already shipped.

### Three sub-decisions, each with the argument and the reversal trigger

- **`retryAfterMs` is a duration and not an instant.** An absolute time from a vendor has to
  be reconciled against our clock, and skew in the unlucky direction means retrying **early**,
  against the service that has just asked us to stop. HTTP `Retry-After`'s two forms
  (delta-seconds or a date) are therefore Story 2.7's mapping problem and arrive here already
  resolved. It is a **floor, not an instruction** — constraint 2 still binds — which is what
  makes a nonsensical value harmless without validating one.
- **`unauthorised` is one member covering missing, wrong and unentitled credentials.**
  `API_ERROR_CODES`' own merge rule: a caller does the same thing about all three, and they
  are not reliably distinguishable from a vendor's response. **A member that is usually wrong
  is worse than one that is coarse.**
- **`range-not-available` ships with no sub-reason.** No `too-old` / `too-wide` /
  `in-the-future`, and the argument is §8.7's rather than economy: a fixture produces this one
  way, so a sub-reason would ship members nothing can produce — which §8.7 itself calls a
  guess. Reversal trigger: a caller that **repairs** a range automatically rather than
  reporting it.

### The retry decision: §8.8's wrapper CONFIRMED, and nothing built

The wrapper wins on three properties rather than on taste — testable against the fixture
provider with **no network at all**, replaceable without touching a provider, and it keeps a
provider a thing that makes exactly one attempt, which is what makes a fixture-backed test
mean anything. Both rejections are written into the module comment beside the method they
constrain, with what each costs: a retry **inside a provider** makes the caller's deadline a
lie and makes "how many times did we ask the vendor" a per-vendor question; a retry **at the
call site** is right for _pacing_ and wrong for retrying one request, and conflating them is
how a backfill re-fetches ninety-nine symbols that answered perfectly because one was
rate-limited — the single thing guaranteed to make a rate limit worse.

The three constraints are recorded there too, no numbers. **Nothing was built**, and that is
deliberate: there is no provider to wrap, no measured distribution to pick a backoff from, and
a wrapper written now would be tested only against itself. Task 2.6.6 supplies the first thing
it can be composed around.

### Four deliberate breaks, each seen to fail and reverted — and the third is the best one

| Break                                           | Result                                            |
| ----------------------------------------------- | ------------------------------------------------- |
| `unauthorised` classified retryable             | 2 tests red, naming the outcome list and the pair |
| `upstream-unavailable` gains `message?: string` | `TS2578: Unused '@ts-expect-error' directive`     |
| A ninth member added                            | **Three** errors, in three places                 |
| `retryAfterMs?: number \| undefined`            | `TS2578` on the present-and-undefined directive   |

The ninth-member break is the one worth carrying: it fails as `Property 'ninth' is missing`
on the tests' `Record<BarsResult["outcome"], BarsResult>`, **and** on the test's exhaustive
switch, **and** on `isRetryableOutcome`'s own switch. So a member cannot be added without
being **constructed**, **handled** and **classified** — three obligations, none of them
skippable, none of them documented in prose.

**That third obligation only exists because of a mid-task correction.** The first version
enumerated the members in an **array**, and its own comment claimed completeness was checked.
It was not: an exhaustive `switch` proves every member is _handled_ and says nothing about
whether a test ever _constructs_ one, so a ninth member would have been forced into the switch
and quietly left unbuilt. Reframing it as a `Record` keyed by the discriminator — `health.ts`'s
response-schema idiom — made the claim true. **The overclaim was caught by trying to write the
break that would falsify it**, which is the cheapest place to catch one.

Breaks 2–4 also reproduced Task 2.5.3's trap on the way: run as one batch they printed
nothing, which reads as "the check does not work" and was in fact **the substitution not
landing**. Re-run individually, all three fired. _A break that does not go red is not evidence
the check is broken; it is evidence the break did not land_ — and the two are indistinguishable
from the exit code.

### One recorded claim had stopped being true

The **naive** vendor grep over `packages/shared/src` returns **seven**, not the **six** this
repository records in two live places (`PROVIDER.md` §9.5 and `CLAUDE.md`). The seventh is
`market-provenance.ts:5`, added by Task 2.6.3 while explaining invariant 6 — the same
"opposite of a leak" category as the other six. **Criterion 1 is unaffected: the code-only
form is zero and has always been zero**, for both files this task touched and for
`packages/shared` as a whole.

Both live sites are corrected; Task 2.6.2's own write-up is left standing, because it is a
record of what that task measured. What is worth carrying is **why** the prediction failed:
2.6.2 wrote that its files added zero _"so the number does not grow"_, and that was **the
wrong shape rather than merely unlucky** — the naive count grows whenever a file explains why
a vendor-shaped decision was taken, which is a thing this repository wants more of. **Quote
the code-only figure; re-run the naive one rather than citing it.**

### Figures

- `pnpm verify` **exit 0 in 32.6 s**
- `pnpm test` **522** (198 + 161 + 163) — `apps/backend` 146 → 161 across 11 files
- The frontend artefact **did not move**, which is §11's check rather than a coincidence:
  369,437 B `4f17aff3…`, 17,317 B `eb223e53…`, `index.html` 1,101 B `898733b0…`, 300 B —
  **388,155 B over four files**, identical at every hash and reproducing Task 2.5.6's figures
  to the byte for the **fourth** task running
- Vendor grep: **zero in both the code-only and the naive form** for both files, because they
  say _"the vendor"_ throughout

---

## For the stakeholders — what this actually did, in plain English

**Nothing new is on screen, and this one is closer to the user than it looks.**

Every price MarketPulse will ever show comes from an outside company's data service. That
service will sometimes not give us what we asked for — and this task is about the difference
between a product that says **why**, and one that says _"Error."_

Think of the difference between a delivery that arrives with a note reading **"this address
doesn't exist"**, one reading **"we're running late, try us in ten minutes"**, and one reading
**"your account is suspended"**. All three are "it didn't arrive". All three need a completely
different response from you. A product that collapses them into one message has thrown away
the only useful part.

So we wrote down the **eight** distinct things that can happen when MarketPulse asks for a
price history, and made it impossible for the software to say anything else:

1. **Here's your data.**
2. **There's no such company** — which is an _answer_, not a failure. Someone typed a ticker
   that doesn't exist, and the honest response is to say so, not to show a red error box.
3. **That date range isn't available** — the data provider's records don't go back that far.
4. **We asked too often** — worth waiting and trying again, and this is the only one that can
   carry the provider's own hint about when.
5. **Our credentials are wrong** — a setup problem on our side. Trying again is pointless.
6. **Their service is down** — worth trying again later.
7. **We ran out of patience** — subtly different from "they're down", because the fix might be
   _ours_: wait a bit longer.
8. **The user navigated away** — not a fact about the market at all, and it must never be
   shown as one.

### Three decisions worth explaining

**We refused to let the data provider's own error messages reach the screen.** This sounds
like a small thing. It isn't — we've already been bitten by it once in this project, when an
internal failure message leaked an internal server address out to a browser. Those messages
are written by engineers for engineers, they change without warning, and they occasionally
contain things that should never be public. So the _category_ goes to the screen and the
_detail_ goes to our logs, joined by a reference number, and the design makes it structurally
impossible to do it the other way round — there is literally nowhere to put such a message.

**"There is no data for that period" is a success, not a failure.** This is the most likely
thing for a future developer to get wrong, so it's written down in three places. If you ask
for Christmas Day, the market was shut and the correct answer is an empty chart — not an error
screen. A product that shows a failure on a public holiday looks broken when it is working
perfectly.

**We decided where "try again" is allowed to live, and deliberately built nothing.** Automatic
retrying is genuinely useful and genuinely dangerous — done carelessly it hammers a service
that has just asked you to stop, or it makes a request take three times as long as anyone was
promised. We settled that it belongs in a single, separate, swappable layer wrapping the data
connection, wrote down the three rules it must obey, and then **stopped**, because we don't yet
have a real data connection to measure. Picking retry timings before we've ever talked to the
real service would be guessing, and a guess dressed up as a decision is worse than an open
question. Story 2.7 measures it.

### Why this is worth doing before we connect to the real thing

The obvious order is: plug in the data provider, see what breaks, then handle it. We're doing
it the other way round on purpose. **An error list written after the fact describes whatever
the first provider happened to do**, and the moment we want a second data source — or the
current one changes something — that list is wrong in ways nobody notices. Written first, it's
a standard any provider has to meet.

The concrete payoff is a safety net that already works: we tested that adding a ninth
possibility to the list is **impossible to do quietly** — the build refuses in three separate
places until whoever added it has described it, handled it, and said whether retrying makes
sense. That is the difference between a rule in a document nobody re-reads and a rule the
computer enforces.

### Where this sits on the road to something you can look at

Story 2.6 is eight tasks and this was the fifth. The remaining three are where it becomes
visible: **2.6.6** builds a working offline data source, so the whole pipeline can be
exercised on a laptop with no internet and no vendor account; **2.6.7** is the one with a
visible change — the "Market feed" indicator in the header has been showing a hard-coded
`DISCONNECTED` since early in the project, and it starts telling the truth; **2.6.8** writes
it up. Then Story 2.7 connects the real provider, and the eight outcomes above stop being
theoretical.
