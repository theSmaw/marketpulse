# Task 2.5.2 — The one conversion boundary: UTC in, market time out

**Status:** Complete
**Story:** [2.5 Trading Calendar & Market Time Handling](STORY.md)
**Depends on:** Task 2.5.1

## Objective

Write the module that converts between a UTC instant and market-local time, make it the
**only** place in the workspace that does so, and prove the DST cases rather than reasoning
about them.

This task deliberately does not know what a holiday is. It knows one thing: given an
instant, what is the wall-clock time in `America/New_York`, and given a market date and a
wall-clock time, what instant is that. Sessions are Task 2.5.4's.

## What the user can see when this lands

**Nothing.** No route, no endpoint, no pixel. What exists afterwards is a module in
`packages/shared` with tests, and — worth stating in the write-up — the frontend bundle is
inlined from `packages/shared`, so it is a thing to measure here rather than be surprised by
at Task 2.5.6. ~~The bundle may move~~ **Task 2.5.1 predicts it does not: 0 bytes, hash
unchanged** (`CALENDAR.md` §4.3), because nothing in the frontend imports this module yet.
**If it moves, the module-load `Intl.DateTimeFormat` is what did it** — see the Work section.

## Work

- **Write it in the home Task 2.5.1 chose** — `packages/shared/src/market-time.ts`,
  confirmed — and export functions, never a configured formatter object. `Intl.DateTimeFormat`
  is expensive to construct and cheap to reuse: measured on this machine, **30.98 µs to
  construct against 2.19 µs to reuse, a 14.2× ratio** over 20,000 iterations. So memoise it —
  but **construct it lazily, inside the function, on first use, never at module load.** That
  is an instruction rather than a preference: a module-load `const FMT = new
Intl.DateTimeFormat(...)` is a call expression, which is exactly `SECTOR_ETFS`'s shape from
  Task 2.3.8, and it will be retained in a frontend bundle that never uses it. Either way the
  formatter is an implementation detail behind a function rather than an export
- **The four operations, and nothing else yet**: instant → market wall-clock parts; market
  date + wall-clock time → instant; instant → market **date** (which is not the same as the
  UTC date and is the one people get wrong); and the UTC offset in effect at an instant,
  because a chart axis and a log line both eventually want to say `EST` or `EDT`
- **Answer the two DST cases explicitly rather than letting the platform answer them**, and
  put the answer in the return type rather than in a comment:
  **Task 2.5.1 measured what the platform does today, and both fail silently** — so this
  is a behaviour to replace rather than one to discover (`CALENDAR.md` §6.3):
  - **The spring-forward gap.** 2026-03-08, 02:30 ET does not exist. Measured, the natural
    two-pass resolution returns `2026-03-08T06:30:00Z`, which formats back as **01:30** — a
    different time from the one asked for, **with no error**. A function taking a market date
    and a wall-clock time must say what it does — throw, or resolve forward
  - **The autumn-fold overlap.** 2026-11-01, 01:30 ET happens **twice**, at `-04` and at
    `-05`. Measured, asking for it returns `2026-11-01T05:30:00Z`, the **first** of the two,
    **chosen with no error and no signal that a choice was made**.
    `migrations/README.md` already records this as the reason a naive `timestamp` column
    means nothing. Same rule: refuse, or take an explicit which-one, and never silently pick
  - **Refusing is provably safe here, and the argument is stronger than this file first
    stated.** ~~No market session ever starts in the gap~~ — **no trading session ever
    begins in, ends in, or contains _either_ transition**, because every US DST transition is
    a Sunday (`CALENDAR.md` §6.3 tabulates all ten across the covered range). So refusing is
    not merely the cheap correct answer; it is an answer no legitimate caller in this
    application can be forced to want. **Note also that no library fixes this** — luxon and
    `@date-fns/tz` resolve the gap and the fold with the same silent defaults, which is part
    of why Task 2.5.1 added no dependency
- **Establish criterion 2 as a property rather than an aspiration.** "Nothing outside this
  module converts between UTC and market time" is exactly the shape of Task 2.4.1's seam and
  Task 1.12.2's "one file calls `fetch`" — both of which are held by a grep and a written
  rule, not by the compiler. So: write the rule beside the export list, and **verify it with
  a grep in this task** rather than asserting it
- **There is one existing thing that grep will find and it is a real finding, not a false
  positive.** `apps/frontend/src/components/BackendIndicator/BackendIndicator.tsx` formats
  its "last confirmed" timestamp with `getHours()`/`getMinutes()`/`getSeconds()` — the
  **viewer's local timezone**, unlabelled. Task 1.12.4 chose the hand-rolled formatter over
  `toLocaleTimeString` for a good reason (a locale-dependent string changes width, which
  `tabular-nums` cannot fix) and that reason still stands. What has changed is the context:
  from Task 2.5.5 there is a clock labelled **ET** in the same strip, and an unlabelled local
  time beside it is ambiguous in a way it was not before. **Decide it here and record which**
  — leave it local and label it, or move it to market time — and note that "when this client
  last got an answer" is genuinely a fact about the client rather than about the market, so
  local is defensible. What is not defensible is unlabelled and adjacent
- **Three mechanical findings from Task 2.5.1's probes, so they are not re-discovered.**
  Use **`hour12: false` or `hourCycle: "h23"`, never `"h24"`** — ET midnight formats as `00`
  under the first two and **`24:00`** under the third, which is a plausible-looking choice
  that yields an hour outside 0–23. Getting a market date + wall-clock time back to an instant
  needs a **two-pass offset resolution** (resolve with the offset at a first guess, then
  re-resolve if the offset at the resulting instant differs), which is what the gap and the
  fold above are the failure cases of. And **`Intl` does not return the offset in the shape
  this file's own example asserts**: `timeZoneName: "longOffset"` gives `GMT-05:00` and
  `"shortOffset"` gives `GMT-5`, neither of which is `-05:00` — so decide the module's own
  offset representation and normalise to it, rather than passing `Intl`'s string through
- **Test the parts rather than a rendered string.** A test asserting `"09:30:00"` is
  asserting a formatter; a test asserting `{ hour: 9, minute: 30, offset: "-04:00" }` is
  asserting the conversion. Task 2.5.5 owns the formatter
- **Take the bundle measurement against Task 2.5.1's stated prediction**: build before and
  after, and record modules, JavaScript bytes and hash. **The prediction is 0 bytes and an
  unchanged hash**, and an unchanged bundle is therefore _evidence the lazy construction
  worked_ rather than a null result. A bundle that moved means the formatter is constructed at
  module load — Task 2.3.8's finding — and the fix is one line

## Done when

- The four operations exist, in `packages/shared`, with tests in the **fast** suite — no
  database, no socket, no build
- Both DST transitions are asserted from the named-date list (`CALENDAR.md` §7.1), in both
  directions, including the day either side — note the transition days themselves are where
  the **gap and fold** are tested, because they carry no session; the **sessions** either side
  are Task 2.5.4's cases 9–11
- The gap and the fold each have a stated, tested behaviour that is not "whatever the
  platform did"
- A grep proves the conversion happens in one module, and the one pre-existing local-time
  formatter is either moved or labelled with the decision written down
- `pnpm verify` passes with no database running

## Notes

The trap here is `new Date(...)` arithmetic. Adding 24 hours to an instant crosses a DST
boundary twice a year and produces a time one hour off, silently, for exactly the two days
of the year nobody tests. Every "next day" in this module is a **calendar** operation on the
market date, never an arithmetic one on the instant.

---

## What was built (2026-09-06)

Two new files and three amended ones. No dependency, no lockfile change, no new
`pnpm verify` step, no database.

| File                                      | What                                                               |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `packages/shared/src/market-time.ts`      | The module. Four operations, two refusals, one timezone identifier |
| `packages/shared/src/market-time.test.ts` | 30 tests in the **fast** suite — no database, no socket, no build  |
| `packages/shared/src/index.ts`            | The barrel export, with the rule beside it                         |
| `eslint.config.mjs`                       | Two `no-restricted-syntax` rules that **enforce** criterion 2      |
| `apps/frontend/.../BackendIndicator.tsx`  | The pre-existing local-time formatter, decided and labelled        |

### The four operations

`marketWallClockAt(instant)` — an instant as the market's wall clock reads it,
carrying the market date, hour, minute, second and the offset in effect.
`marketDateAt(instant)` — which market date an instant falls on, its own
function because it is the question asked most and answered wrongly most.
`instantFromMarketTime(date, time)` — the inverse, and the one with the
decisions in it. `marketOffsetAt(instant)` — the offset, as `minutes` for
arithmetic, `abbreviation` (`EDT`/`EST`) for an axis or a log line, and `iso`
(`-04:00`) for anywhere it is written down.

Two supporting types earn their place. `MarketDate` is a **branded** `YYYY-MM-DD`
string on `Ticker`'s precedent, so a raw string cannot reach a function expecting
a market date without passing `toMarketDate` — and `isMarketDate` checks the date
**exists** rather than only matching the pattern, because `2026-02-30` matches and
is not a date, and the calendar table Task 2.5.3 writes by hand is exactly where
that typo will be made. `toMarketTimeOfDay` parses the `"13:00"` form the calendar
table stores, so the string form of a market time lives in the module that owns
market time rather than in the table.

### Criterion 2 is ENFORCED rather than written down, and that is the change of

### plan worth reading

`CALENDAR.md` §3.4 expected this to join `CLAUDE.md`'s third kind of gap — a
stated invariant nothing checks — held "by a grep and a written rule" alongside
"one file calls `fetch`". A grep test was written first, and it does not work
where it needs to live: greping the tree needs `@types/node`, and
`packages/shared` deliberately does not have it, because that package is inlined
into the browser bundle. Giving it Node types to hold a lint-shaped rule would
breach one boundary in order to enforce another.

So the check is **two `no-restricted-syntax` rules in `eslint.config.mjs`** with
`market-time.ts` as their single exception: one forbids constructing an
`Intl.DateTimeFormat` anywhere else in the workspace, one forbids spelling
`America/New_York` anywhere else. That is the mechanism `no-restricted-globals`
already uses to hold the frontend's browser boundary — an established pattern
here, inside `pnpm verify`, no new step and no new dependency. §3.4 declined a
rule of this kind for `Date.now()` on the grounds that the module did not exist
yet so the rule would have nothing to permit; that objection is spent, because
the module exists.

**Both patterns were made to fail before being believed** — a probe formatter
appended to `apps/frontend/src/cx.ts` and again to `packages/shared/src/anomaly.ts`,
each producing both errors by name, each reverted with a clean `git diff`.

**What the rule cannot see is stated rather than implied**: a conversion written
with a hard-coded `-5` and no timezone name at all. That is a reimplementation
rather than a duplicate, it is wrong twice a year, and it is what the module's own
tests document. So criterion 2 is now stronger than "one file calls `fetch`" and
still not airtight, which is the honest description.

### The gap and the fold: refused, with no escape hatch

Both of Task 2.5.1's measurements reproduced exactly on re-taking. **The spring
gap** (2026-03-08 02:30 ET) silently returned `2026-03-08T06:30:00Z`, which reads
back as 01:30 — a different time from the one asked for. **The autumn fold**
(2026-11-01 01:30 ET) silently returned the first of two instants an hour apart.
So did the `hourCycle: "h24"` trap: ET midnight formats as **`24`**.

Both now throw a `MarketTimeError` carrying `reason: "nonexistent" | "ambiguous"`.
The **reason is the contract and the message is for a human** — the tests assert
the reason, so improving the prose is not a breaking change.

**There is deliberately no `resolve: "earlier" | "later"` parameter and no
`lenient` flag.** This follows `CALENDAR.md` §1.5's rule about the calendar's own
out-of-range refusal, for its reason: a flag whose safe setting is the default and
whose unsafe setting is available is a flag somebody sets during an incident, and
an incident is the worst moment to choose silently between two instants an hour
apart. A caller that genuinely means one of the two already has a way to say so —
it has an instant.

Refusing is **provably safe** here rather than merely cheap: every US DST
transition is a Sunday, the market is closed on Sundays, and §6.3 tabulates all
ten across the covered range. No trading session begins in, ends in, or contains
either transition, so no legitimate caller in this application can be forced to
ask.

### The resolution algorithm, and the one place arithmetic is legitimate

The naive two-pass resolution `CALENDAR.md` describes does **not** detect the
fold — probing the offset at the first candidate returns the same offset it
started from, so only one candidate is ever produced. What works is bracketing:
read the offset **±24 hours** around the requested wall-clock fields (transitions
are months apart, so a day either side always straddles one), build a candidate
from each, and keep the ones that **round-trip through `marketWallClockAt`** back
to the date and time asked for. Zero survivors is the gap; two is the fold; one is
the answer. Validating by round-trip rather than by comparing offsets is both
stronger and checkable by eye.

The `naiveUtc` value the probes are taken around is **not an instant** — it is the
requested wall-clock fields packed into a number using UTC as a neutral encoding,
which is why adding a day to it is legitimate where this file's own Notes forbid
instant arithmetic. `marketOffsetAt` also subtracts two epoch values, and that is
legitimate for the same reason it always is: subtracting instants yields a
**duration**, which is what epoch arithmetic is for. What is forbidden is adding a
duration and calling the result a calendar operation.

### The bundle: 0 bytes, hash unchanged — the prediction confirmed

`CALENDAR.md` §4.3 predicted 0 bytes and an unchanged hash, and said an unchanged
bundle would be _evidence the lazy construction worked_ rather than a null result.
Measured by building three times rather than twice, so the two changes in this task
could be attributed separately:

| Build                                 | Modules | JavaScript     | md5             |
| ------------------------------------- | ------- | -------------- | --------------- |
| Baseline (before this task)           | 284     | 357,210 B      | `b563a3d5…`     |
| **`market-time.ts` only**             | **285** | **357,210 B**  | **`b563a3d5…`** |
| Shipping (with the indicator's label) | 285     | 357,216 B (+6) | `174f39bb…`     |

**Byte-identical at a higher module count**, which is Task 1.7.3's finding again:
a module can join the graph and cost nothing. `America/New_York` and
`MarketTimeError` both appear **zero** times in the emitted bundle. The formatter
is constructed lazily inside the function, so there is no live call expression at
module load and the bundler drops it entirely — had it been a module-load
`const FMT = new Intl.DateTimeFormat(...)` it would be `SECTOR_ETFS`'s shape and
would have been retained. The +6 bytes is the six characters of `" local"` and
nothing else, isolated by rebuilding with that one string reverted.

### `BackendIndicator`: it stays LOCAL, and it is now labelled

The decision this task owed. `apps/frontend/.../BackendIndicator.tsx` formats "last
confirmed" with `getHours()`/`getMinutes()`/`getSeconds()` — the viewer's own
timezone, unlabelled. Task 2.5.5 puts an `ET` clock in the same strip, and
adjacent-and-unlabelled is the one option that is not defensible.

**It stays local.** "When this client last got an answer" is genuinely a fact about
the client rather than the market: it is a diagnostic about _this browser's_
connection, and what a reader does with it is compare it against their own sense of
how long ago that was. Rendering it in ET would make it comparable with the market
clock — which nobody wants — and incomparable with the reader's own wall clock,
which is the whole use. It would also make a service-health indicator a consumer of
the trading calendar, a coupling with nothing behind it, and it would have put
market-time code into the bundle at this task and falsified the 0-byte prediction
for the wrong reason.

**The label is the word `local`**, not the viewer's timezone abbreviation. The
abbreviation would need an `Intl.DateTimeFormat` call, which criterion 2 now
forbids outside the boundary module and which would not even be _market_ time; and
it varies in width (`EDT` against `GMT+8`), which is the exact objection that made
this a hand-rolled formatter rather than `toLocaleTimeString` in the first place.
One fixed word, `tabular-nums` intact.

Six assertions moved with it — one in `AppHeader.test.tsx`, three in
`BackendIndicator.test.tsx` and the anchored regex in
`e2e/specs/backend-recovery.spec.ts`, which could not have matched the new string
and so is a load-bearing assertion rather than a decorative one.

### Figures

- `pnpm verify` **exit 0 with no database running**, twice
- `pnpm test` is **377** (98 + 146 + 133) — `packages/shared` 68 → **98**, seven
  files. `pnpm test:process` 14, `pnpm test:database` **61**
- `pnpm e2e` **21 passed** against the running pair, the recovery journey included
- No dependency, no lockfile change, no `pnpm-workspace.yaml` change, no new
  `verify` step

### Owed to Task 2.5.6

`CLAUDE.md` and `README.md` carry the fast-test count in several places and the
twelve duplicated convention blocks carry it in ten more. They are stale by this
task's +30 and are **deliberately not amended here**: the sweep is a story-close
activity, and amending the copy in front of you rather than all twelve is precisely
how that problem started. 2.5.6 owns it, along with `CLAUDE.md`'s tree block, which
does not yet mention `market-time.ts` or the new lint rules.

---

## For the stakeholder — what this actually was, in plain terms

**Short version: nothing you can see changed, and the product got measurably
harder to break. One word appeared in the corner of the screen.**

### The problem, without the jargon

The stock market opens at 9:30 in the morning **in New York**. Our database, our
servers and our web pages do not live in New York — the servers are in Virginia,
the database is in Illinois, and whoever is looking at the page could be anywhere.
So every single time this product wants to say "the market opened", "this price is
from 11:07", or "draw the chart from here to here", something has to translate
between the neutral, universal time computers store and the time a New York trader
actually reads off a clock.

That translation is easy to get roughly right and famously easy to get exactly
wrong. Twice a year the clocks change, and on those two days the arithmetic that
worked for the other 363 quietly produces an answer that is off by an hour. Nobody
notices, because nobody tests on the second Sunday in March. Then a chart is wrong,
or a day of data goes missing, and somebody spends a day finding out why.

### What was built

One small piece of code that is now **the only place in the entire product allowed
to do that translation**. Everything else has to ask it. That is the whole idea: if
there is one door, you can put a good lock on it. If there are twenty doors, you
will secure nineteen.

The important part is what it does on the two awkward days. When the clocks spring
forward, "2:30am" does not exist — the clock jumps from 1:59 straight to 3:00. When
they fall back, "1:30am" happens **twice**, an hour apart. We measured what the
standard tools do with those, and the answer is unsettling: they hand back a
confident, plausible, wrong answer and say nothing. We checked the popular
off-the-shelf libraries too, and they behave identically — so buying one would not
have fixed it.

**So our version refuses.** Asked for a time that does not exist or that happened
twice, it stops and says so, naming which of the two problems it is. That sounds
unhelpful until you notice we also checked that the market is _never_ open at
either of those moments — the clock always changes on a Sunday, and the market is
shut on Sundays. So nothing this product legitimately needs to do can ever hit the
refusal. It only ever fires when something is genuinely wrong, which is exactly
what you want an alarm to do.

We also deliberately did **not** add a "just guess for me" option. An option like
that gets switched on at 3am during an incident by somebody who needs the problem
to go away, and then the wrong answer is silent again.

### Why "one place only" is now enforced by a machine rather than by discipline

The original plan was to write the rule down and trust reviewers to notice if
somebody added a second translator. We went further: the build now **fails** if any
other file in the project tries to do this work. It caught two deliberately planted
violations before we believed it. This costs nothing — no new tool, no new step, no
slower build — and it means the rule survives the day everyone who remembers it has
moved on.

### The cost, measured rather than assumed

We added **no new third-party code**. The alternatives were priced first: the most
popular date library would have added roughly 260 kilobytes to what every visitor
downloads, on a page that currently weighs 357 — a 73% increase, for date handling,
on a product whose whole visual centre of gravity is a live graph. And it would not
have solved the problem above.

We also checked that the new code costs the browser nothing at all. It does: the
page is **byte-for-byte identical** to before, because the code is only used by the
server so far and the build correctly strips it out. We verified that by building
three times and comparing fingerprints rather than assuming it.

### The one visible change

The status strip in the header shows when the app last successfully heard back from
the server — `Last confirmed 10:42:17`. That was your own computer's clock, with no
label. Fine, until the next task puts a **New York** clock right next to it. Then
two times sit side by side, thirteen hours apart if you are in Singapore, with
nothing saying which is which.

So it now reads `Last confirmed 10:42:17 local`. Six characters. We chose to keep it
on your own clock rather than convert it, because it answers "how long since my
connection worked", and for that question your own clock is the right one — the
market's opening hours have nothing to do with whether your wifi is up.

### Where this leaves the product

This is plumbing, and it is the third of six pieces in a run that ends somewhere
visible. The next task writes down which days the market is actually closed —
holidays, and the half-days around Thanksgiving and Christmas that naive calendars
always miss. The one after that combines the two into "is the market open, when did
this session start, what were the last five trading days". And the one after **that**
is the payoff: the empty `--:--:-- ET` placeholder that has sat in the header since
the very first sprint starts telling the time, and shows whether the market is open.
That is the first thing in this epic a stakeholder can point at.

Longer term, this piece is load-bearing for the feature the whole product is built
around — replaying a past trading day and asking "what could anyone have known at
11:07am?". That question is a comparison against a **market** clock, not a wall
clock, and it only works if there is exactly one trustworthy definition of what
market time means. There is now.
