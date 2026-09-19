# Task 3.3.7 — Verify, document, the capture this story owns, and the close

**Status:** **Complete — 2026-09-19. Story 3.3 is closed.** ADR 0031, `STREAM-SEAM.md` §8 extended rather than a second document, three `docs/GAPS.md` entries, and the casing rule moved into the design language. **The capture was not taken and the reason is not the one anybody expected** — the deployed backend holds the free plan's only connection, so a developer machine is refused at any hour. Both audits ran; the construction-site audit deleted an export.
**Story:** [3.3 The Browser Stream & `LIVE` in the Chrome](STORY.md)
**Depends on:** 3.3.6

## Objective

Close the story, and **discharge the one capture it inherited** — which is
cheap now and was impossible before.

## What the user can see when this lands

**Nothing new.** `LIVE` landed in 3.3.5. **Story 3.4 is next and it is the one
that moves a number** — the first time anything on this screen changes because
the market did.

## Work

- **THE CAPTURE THIS STORY OWNS — do it while a session is open.**
  `docs/GAPS.md` entry 7: **no verbatim `updatedBars` frame exists in this
  repository**, so two fixtures carry an **inferred envelope**. The risk is
  bounded to one thing — whether a `u` frame carries the same field set as a
  `b` — and if it differs, Task 3.2.4's mapper is wrong about `u` and right
  about everything else.

  **It has been re-pointed twice and must not be a third time.** Task 3.2.5
  built the client but nothing constructed one; Task 3.2.9 started one at
  06:10 ET with the market shut. **An owner that is a finished task never
  fires.** This story is the first developed against a running feed **during**
  sessions, so the trigger is something you meet rather than remember.

  **And there is a pre-flight this task must not skip**, because the last
  attempt failed on it: a capture on 2026-09-18 was refused `406 connection
limit exceeded` **by a stale process of our own** — a dry-run that never
  exited and outlived its own deleted source by a day
  ([`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §8.2). **Check nothing already holds the connection
  before connecting, and refuse rather than wait.**

  Record the frame verbatim, replace both fixtures, re-tier them to
  `transcribed` in `MANIFEST.json`, and **retire the GAPS entry** rather than
  re-pointing it.

- **The canvas gained a file and ADR 0026 gained its last count.** Task 3.3.5
  added `Live in the chrome.dc.html` to the
  `Component library for MarketPulse` project and amended ADR 0026 to **stop
  recording how many files it holds** — a number in a present-tense sentence
  that had been wrong four times. **Nothing in the close should re-introduce
  one**; `DesignSync`'s `list_files` answers it and cannot go stale. What the
  amendment records instead is the finding: reading the existing files before
  drawing changed two of this story's decisions.
- **The subject document.** This story decides a protocol, a transport and a
  set of words. Decide deliberately whether that is a new document or a section
  of [`STREAM-SEAM.md`](../story-02-stream-seam-and-alpaca-iex-client/STREAM-SEAM.md)
  — which is already _how a live observation reaches this process_ and may
  simply want _and how it reaches a browser_. **Add it to `CLAUDE.md`'s table if
  it is new; do not create a second home if it is not.**
- **An ADR if a decision outlives the story**, and **argue the absence if not**.
  **The candidate is stronger than the split anticipated — checked 2026-09-19
  after 3.3.1 built it.**

  `wire-serialiser.ts` is **not specific to this protocol**. It is the general
  answer to _what replaces `fast-json-stringify`'s stripping when there is no
  `fast-json-stringify`_, and `PRODUCT_SPEC.md` §33's investigation event stream
  has **exactly the same shape and exactly the same hazard**: typed events, a
  server that holds rich internal objects, and no schema layer between them and
  the client.

  **Epic 10's `EPIC.md` currently knows nothing about it** — zero mentions of
  the guard, of `WireFields`, or of the stripping it replaces. So either this
  close writes the ADR, or it hands Epic 10 the mechanism by name. **Doing
  neither is how the next protocol reaches for `JSON.stringify`** and re-learns
  the leak.

  **And the general rule is worth stating wherever it lands:** _an HTTP schema
  buys two guarantees and only one of them is the type — exhaustiveness is the
  type, stripping is the serialiser, and a transport without a serialiser has to
  rebuild the second._

- **`docs/GAPS.md` owes an entry `OBSERVATION_INTERVAL_MS` earned, and it is a
  claim rather than a check.** Task 3.3.4 fixed a rule that measured an
  observation's age from the instant that **opens** its interval; the repair
  adds the interval's duration, and **that duration is a hard-coded minute
  because §10.1 chose minute bars.** Nothing anywhere checks that the stream's
  subscribed timeframe is actually a minute, so a second timeframe makes the
  constant silently wrong in the same invisible way the original defect was.
  The reversal trigger is written beside the constant; what is missing is the
  entry saying a green `verify` does not certify it. **Re-measure:** compare the
  channel `market-stream.ts` subscribes to against
  `OBSERVATION_INTERVAL_MS`.
- **The `wire-serialiser` ADR now has a second candidate beside it.** Task 3.3.4
  moved §11.2's thresholds and their rule into
  `packages/shared/src/feed-liveness.ts`, because **two sockets apply them** —
  and the general shape is not specific to this feed: _a rule about a
  connection's health belongs with the vocabulary it produces, not with either
  socket that asks it._ Decide with the serialiser whether that is one ADR, two,
  or a paragraph arguing neither.
- **The defect class is worth one sentence wherever the ADR lands, because it
  has now fired twice in three days.** Both of Story 3.2/3.3's silent
  status-rule defects were **arithmetic between two documented facts that were
  never read against each other**, and both were invisible to a full green
  suite because **every test used round numbers for a pair the vendor delivers a
  minute apart**. The habit that catches it is in the tests now — §7.3's
  measured pair by name, in three files — and the habit is the thing worth
  recording.
- **`VISUAL-LANGUAGE.md` owes the casing rule, found by Task 3.3.3.** _The
  stored word is the union's own member; `.microLabel` supplies the capitals._
  It is currently written in three places that are all about **this strip** —
  `feed-words.ts`, `LIVE-DATA.md` §11.3 and Task 3.3.5 — and it governs **every
  consumer of `microLabel`**, of which there are ten. It is a language rule
  living in a feature's documents, which is the shape that goes missing. Note
  the half that makes it more than tidiness: **a screen reader is handed the DOM
  text rather than the transform**, so this belongs beside the language's other
  accessibility findings rather than in a status-strip file.
- **`docs/GAPS.md` gained an entry from 3.3.5 as well as the one 3.3.4 owes.**
  Two browser specs pass on CI **because** it has no data and fail on a
  developer's store. It is the mirror of the habit this repository already
  records, and the close should check whether the pair of them now justifies a
  mechanical answer — `pnpm store:bare` exists and nothing makes the suite say
  which store it ran against.

### Three defects in three tasks were found by AUDITING rather than by running — and the close owes a disposition on that

Task 3.3.6's sweep found: a browser suite that had never seen `LIVE`, a teardown
race in 3.3.4's hook, and 3.3.5 breaking `pnpm test`'s no-network contract while
the suite **exited 0 for two days**. Task 3.3.5's sweep found an unmeasured
criterion and a spec passing for the wrong reason. **None of the five was caught
by a check.**

They share one shape, and the close should say whether it is mechanisable or
goes in `docs/GAPS.md` with an owner:

> **An assertion about an absence passes for free on a deployment that cannot
> produce the thing** — and CI is exactly such a deployment for this epic, since
> it has no credential and therefore no live feed.

`market-connection.spec.ts` closed the instance by **furnishing the state from
inside the browser**, which needs no CI change. What is not answered is whether
anything should stop the next one: a spec asserting `toHaveCount(0)` against a
vocabulary the runner cannot produce is indistinguishable from one that works.

**One member of the class HAS been mechanised, which narrows the question
rather than answering it.** A rename left a spec naming a file that no longer
existed and every check stayed green, so
`every-spec-named-in-the-suite-exists` now resolves the 31 cross-references in
`e2e/` — and went red on its first run. **The reason it was mechanisable is the
useful part**: `e2e/` is code and its own README, both describing the tree as it
is _now_, whereas a task file under `planning/` records what was true when it
was written. So the close's question is sharper than _can this be automated_:

> **Which of these claims are about the tree as it is, and which are history?**
> Only the first kind can be held to a check without destroying the record.

- **Sweep upward**, and expect to find something: this story is the first to put
  a live claim on a screen, and `PROVENANCE.md`, `VISUAL-LANGUAGE.md` and
  `CLAUDE.md`'s _What a user can see today_ all describe a product that cannot
  say anything about **now**.
- **Both audits, by enumeration with a count** — the shape Story 3.2's close
  established and both of which caught something:
  - **Hand-offs**: grep [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) for every `Story 3.N` and `Owner:`
    line, and confirm each constraint is in the owning story's **own** file in
    words it can act on. **Counting citations measures citation, not delivery** —
    Story 3.2's close produced a false positive doing exactly that.
  - **Construction sites**: every exported factory, route and hook this story
    adds, grepped for a caller outside a test. **`useLiveFeed` is the one to
    check first** — it was written in 3.3.4 with no consumer by design, and a
    3.3.5 that wires the words but not the hook would leave exactly the shape
    Story 3.2 shipped three times. **Story 3.2 shipped three
    implementations with no construction site and a green `verify` throughout.**
- **Walk the acceptance criteria against a RUNNING system**, not only the
  suite. **Six of the seven already have their evidence** and the close's job is
  to check rather than produce it: criterion 1 and 7 in 3.3.5 (`pnpm probe` at
  four widths, and the 390 defect it found), criterion 6 in 3.3.5's sweep (0
  `longtask`, 0 mutations over 60 s on a **production** build — a dev build
  reports 141 ms twice and is not comparable), criteria 2, 4 and 5 in 3.3.6's
  spec. **Criterion 3 is the one to look at**: the live label naming a single
  venue is now asserted in a browser for the first time by
  `market-connection.spec.ts`, and it is worth confirming that assertion is
  about what §7.1 requires rather than about an acronym.
- **`pnpm verify`, `pnpm e2e`, `pnpm probe`**, and every gate this story can
  break.

## Done when

- **`docs/GAPS.md` entry 7 is RETIRED**, with a verbatim `u` frame in the
  corpus re-tiered to `transcribed` — or, if a session genuinely could not be
  had, re-pointed **with the reason written down**, which is the third time and
  should feel expensive
- The subject document exists or is argued into an existing one; `CLAUDE.md`
  names it if new
- An ADR is written or its absence argued in a paragraph
- Both audits ran **with counts recorded**
- Every acceptance criterion in [`STORY.md`](STORY.md) is walked against a
  running system
- `pnpm verify` and `pnpm e2e` pass

## Notes

**This is the first close in the epic with a user-visible thing behind it**, so
the sweep matters more than usual: every document that says this product cannot
speak about the present became false in 3.3.5, and none of them knows yet.

---

## What was found

### The capture: the blocker was never the market's hours

**It has been re-pointed twice on the assumption that it needed a trading
session**, and this task could not run it either — the story closed at 23:26 ET
on a Friday. So the intention became a command rather than a third promise:
`scripts/capture-u-frame.mjs`, which refuses out of hours, refuses if a local
process holds the connection, and stops at the first `u`.

**Then the handshake was run against the real vendor, from a clean machine, and
refused:**

```text
greeted; authenticating
ERROR FRAME: [{"T":"error","code":406,"msg":"connection limit exceeded"}]
```

No local process held a connection — verified with `lsof` against the resolved
address, which found **none**. The deployed backend answers:

```json
{
  "provider": "alpaca",
  "feed": "iex",
  "status": "disconnected",
  "marketOpen": false
}
```

**The free plan allows ONE connection, and §9.3 chose to hold the socket
always** — so production holds it out of hours too. **A developer machine cannot
take an Alpaca capture at all while the deployment is running, at any hour**,
and no amount of waiting for Monday changes that.

`LIVE-DATA.md` §8.2 blamed a stale local dry-run, which was true on 2026-09-18
and is no longer the thing to check first. Amended. The one connection is a
**contended resource with exactly one other consumer, and that consumer never
sleeps** — so the disposition is a choice rather than a date: stand the
deployment down, capture **from** production, or stop sharing. **Handed to Story
3.10** in its own file, because it is the first story that has to reason about
that connection as contended rather than as a given.

**Three things the instrument proved on the night it was written**, which is the
point of writing it rather than a note:

- the out-of-hours refusal fires, through `@marketpulse/shared`'s market-time
  module — **the lint rule forced that**, refusing a second timezone converter
  in a throwaway tool, which is the rule paying for itself;
- the process scan passes without a false positive, after a first draft matched
  **the shell that invoked it** and refused to run at all. A pre-flight that
  always fails is worse than none, because the next person deletes it;
- the socket path reaches authentication, which is how the 406 was seen at all.

### The subject document: §8 of `STREAM-SEAM.md`, argued rather than assumed

The alternative was `BROWSER-STREAM.md` beside it. **Rejected on that file's own
section title**: it is _how a live observation reaches this process_, and the
browser is **the next hop of the same journey** rather than a second subject. A
reader following an observation from a venue to a screen should not change
documents halfway.

So §8 gained the browser's own end, the two connections, what the strip says
when it breaks, and what a green browser suite does not certify.
**`CLAUDE.md`'s table row was widened to match**, because a row describing half
a document sends a reader to the wrong half.

### ADR 0031, and it is three decisions rather than the two the split anticipated

The task named two candidates and asked whether they were one ADR or two. **They
are one**, because they are the same sentence at two layers: _a guarantee you
inherited from a framework is not a guarantee once you leave the framework._

1. **An HTTP schema buys TWO guarantees and only one of them is the type.**
   Exhaustiveness is the type; **stripping is the serialiser**. A transport
   without a serialiser has to rebuild the second — and the failure **inverts**,
   because an absence is a bug somebody notices and a leak is a bug nobody does.
2. **A rule about a connection's health lives with the vocabulary it produces**,
   not with either socket that asks it.
3. **One indicator may tell another when to look; it may not tell it what it
   sees** — the third was not in the brief and came out of 3.3.6.

**Epic 10 is the reason it exists**: §33's event stream has the same shape and
the same hazard, and its `EPIC.md` knew nothing about either mechanism.

### Both audits, with counts

**Hand-offs — three stories were named and did not know it.**

| Story    | Mentions of 3.3 in its own file, before | After                                                        |
| -------- | --------------------------------------- | ------------------------------------------------------------ |
| 3.4      | 8                                       | 8 — already carried 3.3.4's and 3.3.5's                      |
| 3.5      | 2                                       | 2 — adequate; it owns fan-out and this story built none      |
| **3.10** | **0**                                   | **a section, and it is the biggest inheritance in the epic** |
| **3.11** | **0**                                   | **a section: should CI hold a credential?**                  |
| 3.6–3.9  | 0                                       | 0 — nothing in this story is theirs                          |

**Counting citations measures citation, not delivery**, which is the false
positive Story 3.2's close produced. Story 3.10 is cited **twenty times** in
`LIVE-DATA.md` and its own file said nothing about the story that had just built
the transport it inherits.

**Construction sites — 12 exports, 11 with a caller, 1 without.**

`feedWordFor` had no consumer outside its own module and its test. Written
speculatively in 3.3.3; `FeedProvenance` reads `NOT_CONFIGURED_DESCRIPTION`
directly and never needed it. **Deleted**, which is the audit doing exactly what
Story 3.2's close established it for — that story shipped three implementations
with no construction site and a green `verify` throughout.

### The criteria, walked

Six had their evidence already and the close checked rather than re-produced
them. **Criterion 3 was the one to look at, and it was half-asserted**: the live
spec named the venue and not §7.1's sentence — which is precisely the half §7.1
forbids, since _MarketPulse must not imply that IEX represents every US
exchange_ and three letters teach a non-specialist nothing. Now both.

### What the close swept upward

- **`CLAUDE.md`'s _What a user can see today_** described a product that cannot
  speak about the present. Corrected.
- **`PROVENANCE.md`'s closing sentence** said _there is no live data, and the
  two-feed sentence has no producer until there is._ **Half of that is now
  false and the half that survives is the interesting one** — the connection is
  live; the **ledger still has no producer**, because all sixteen recorded
  bodies carry `sip`. Those were one sentence when written and are two now.
- **`VISUAL-LANGUAGE.md` gained the casing rule**, which had been living in
  three files that were all about one strip while governing ten components.

### The epic sweep: no story added, deleted or re-ordered — and one live defect found

Asked after the close, and it found something the story-level sweeps could not,
because it is a question about the **sequence** rather than about this story.

**"Reconnection" is two reconnections and they share nothing.** Story 3.10 owns
it and argues it against a vendor that allows one concurrent connection, a
fifteen-minute embargo and a rate limiter with no `Retry-After`. **Every one of
those is a fact about the backend's socket to Alpaca.** The browser's socket to
our own gateway has none of them, and the gap it leaves is filled by a snapshot
rather than by a historical fetch.

**The cost is already being paid.** The browser does not reconnect, so **every
backend deploy leaves every open tab reading `DISCONNECTED` until somebody
reloads** — and deploys happen on every merge to `main`. The gateway even sends
`1001 going away` (§12.2), so the browser is told the difference between a
deploy and a broken network and does nothing with it.

**The conflation was in my own code comment**, which is how it was found:
`market-stream-client.ts` deferred to Story 3.10 _citing §8.2's `406` and
§8.7_ — two measurements about a socket this file does not open. Corrected
there as well as in the stories.

**So the browser's half moved to Story 3.5**, which already owns the snapshot a
reconnecting browser needs and depends only on 3.3. Story 3.10 keeps the
upstream half. **No story was added**: the work existed and was in the wrong
one.

**And the single connection is an EPIC-level constraint, not one story's.** Five
remaining stories — 3.5, 3.6, 3.7, 3.8, 3.9 — would want to be developed against
a real feed and cannot be while the deployment runs. That is now in `EPIC.md`
rather than only in the two stories that inherit pieces of it.

## For a stakeholder — a status report, 2026-09-19

**Story 3.3 is closed.** The product can now say, on every screen, whether the
market data behind it is arriving — and say it honestly when it is not. That is
the first thing this phase of work has put in front of a person.

**What this final task did: wrote down what outlives the story, and tried to
collect a piece of evidence we have owed ourselves for a fortnight.**

**The evidence we did not get, and why it is worth reporting as a finding rather
than a failure.**

We have been carrying a small known weakness: two of our test fixtures describe
a kind of message from our market-data supplier that **nobody here has ever
actually seen**. We inferred its shape. The plan was always "capture a real one
during trading hours", and it had slipped twice.

It slipped a third time — but this time we found out **why**, and the reason was
not the one written down. Our supplier's free plan allows **exactly one
connection at a time**, and our deployed application holds it permanently and
deliberately. So a developer cannot capture anything, at any hour of any day,
while the live site is running. Waiting for Monday morning would not have
helped.

**That is a much more useful thing to know than "we missed the window."** It
turns a recurring slip into a decision somebody has to make: take the live site
down briefly, capture the message from the live site itself, or stop sharing one
connection between two things. We handed it to the story that owns reconnection,
because it is the first one that has to treat that single connection as
something being competed for rather than something we simply have.

And we left behind a **command** rather than another note — a script that
refuses to run out of hours, refuses if something else is holding the
connection, and stops the moment it sees what we are after. We proved everything
about it except the final wait, on the Friday night it was written.

**Three things were written down permanently**, because they are true beyond
this story:

- **A safety net you inherit from a framework stops protecting you the moment
  you leave the framework.** Our normal web requests automatically strip
  anything undeclared before it reaches a browser; a live connection does not.
  We rebuilt that protection and recorded why, because the next piece of work
  that opens a new kind of connection — the AI investigation stream — has the
  same hazard and would otherwise re-learn it.
- **A rule about whether a connection is healthy belongs with the words it
  produces**, not with either connection that asks.
- **One status indicator may tell another when to look, but never what to
  think.**

**And a small piece of housekeeping with a moral.** We audit every new piece of
code for whether anything actually _uses_ it. One function did not — written in
anticipation, never wired up. Deleted. That audit exists because an earlier
story shipped three unused implementations while every automated check stayed
green.

**How this unlocks progress.** Everything is in place and nothing moves yet. The
application announces it is live and then demonstrates nothing — which is honest
and is exactly the shape of a slice done properly.

**The next story is the one that moves a number**, and it inherits a written
constraint rather than a blank page: movement in this product means _work in
progress_ and nothing else may borrow it, so the first price that changes has to
earn its own way of showing it.
