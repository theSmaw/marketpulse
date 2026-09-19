# Task 3.3.6 — Closing the backend, and the test that proves the page survives it

**Status:** **Complete — 2026-09-19.** `market-feed-degrades.spec.ts`, two tests, **2.9 s**. The design pass found a defect first: for up to thirty seconds the strip **pointed away from the fault**, and the repair is a prompt rather than an answer. A spec Task 3.3.5 had silently invalidated was also corrected. `pnpm verify` green; the full suite is **127 passed, 0 failed** against CI's store.
**Story:** [3.3 The Browser Stream & `LIVE` in the Chrome](STORY.md)
**Depends on:** 3.3.5

## Objective

**Acceptance criterion 2, which is the one with teeth**: closing the backend
turns the region to `disconnected` **without a refresh**, and leaves every other
region and every number on the page intact.

## What the user can see when this lands

**A page that degrades honestly.** Kill the backend and the feed region says so;
the clock keeps ticking, the charts keep their numbers, and nothing collapses.

## What is already decided and must not be re-taken

- **§36 forbids collapsing to a global error screen**, and names this exact
  case: _"Live feed disconnected — displaying data through 10:42:17."_
  **This is the first story where that is testable.**
- **Degrade incrementally and LOCALLY** — a dropped market socket must leave the
  rest of the workspace and any gathered evidence intact and clearly labelled.
- **`disconnected` is honest here and says nothing more.** Reconnection and the
  staleness thresholds in anger are Story 3.10's; this story shows the state and
  stops.

### The CI shape may make criterion 2 UNOBSERVABLE — read this before writing the spec

**Added 2026-09-19, out of Task 3.3.3.** The story already says a runner with no
credential has no upstream socket. Task 3.3.3 made the consequence sharper than
that sentence reads:

- No credential means no provider, which the gateway reports as
  **`feed: null`**, and `connectionWordFor` returns **`null`** for that — the
  `—` §11.3's grid asks for.
- So on CI the region shows **`NOT CONFIGURED` and no connection word at all**
  — before the backend is killed.
- **And possibly after it too.** If the hook keeps reporting `feed: null` once
  its own socket dies, the region is **identical either side of the kill**, and
  a spec asserting `disconnected` appears fails on a runner for a reason that
  has nothing to do with the degradation it is testing.

**ANSWERED 2026-09-19 — `STORY.md` open decision 3.** The chrome says
**`DISCONNECTED` once our own socket dies, whatever the feed identity**, so on
CI the region reads `NOT CONFIGURED` before the kill and
`NOT CONFIGURED · DISCONNECTED` after it. **Criterion 2 is therefore observable
on a runner** — which is the reason that shape was chosen over silence. Assert
the second cell changing and the first cell **not** changing: the venue is still
honestly _nothing is configured_, and a spec that let them move together would
pass while the product conflated them.

**The superseded worry, kept because it is why this paragraph exists:** — whether losing the
backend is a connection fact the chrome states even when no provider was ever
configured. **Do not write this spec before it is answered**, and check the
answer against `pnpm store:bare` plus `MARKET_DATA_PROVIDER=none` rather than
against a local machine that has a credential. This repository has already paid
a six-minute round trip for asserting something CI could not produce.

### What killing the backend actually produces — Task 3.3.4, so the spec can be written against it

The transport reports a closed socket **immediately**; there is no timer to wait
out. `WebSocket` fires `close` (or `error`, which this transport treats
identically because only one of them is actionable), the reducer records it, and
the derived view flips in the same tick. **So the spec does not need
`waitForTimeout` and must not use one** — the 165 s threshold is for a socket
that goes _silent_, not one that goes away, and a spec that waits for it is
asserting the wrong mechanism at 165× the cost.

**There is no reconnection** (Story 3.10 owns it), so the state is stable once
reached — the assertion does not race a retry.

### The state you are asserting has already been SEEN — Task 3.3.5, 2026-09-19

Not as a design intent but on a running page, with the backend killed under a
loaded Security Explorer at 1440. What the strip said, and what the rest of the
page did:

```text
MARKET FEED  ◌ UNKNOWN  The market feed could not be read.
             ○ DISCONNECTED  The live feed is not connected. Prices shown are the last known.
                                      BACKEND SERVICE  ◌ UNREACHABLE  No response from the service.
```

Every region stayed on screen: the price panel said the service did not answer
and offered its one retry, the volume region deferred to it, the identity block
explained that the universe could not be read, and the clock kept ticking.
**Write the spec against this rather than against an imagined screen** — and
note the three surfaces above are three different sentences about three
different subjects, so a spec asserting "the page says it is disconnected"
could pass on the wrong one.

**Two numbers the spec should not be surprised by:**

- **The footer grows from 33 px to 35 px when the feed degrades.** Two sentences
  in one cell take a taller line. `useStickyFooterHeight` publishes it and the
  page's bottom padding follows, so content shifts by two pixels. That is not a
  datum changing and criterion 4 is not about it — but a spec pinning an exact
  offset would trip on it.
- **There is no threshold to wait out.** The transport reports a closed socket
  in the same tick; 165 s is for a socket that goes _silent_, not one that goes
  away, and a spec that waits for it is asserting the wrong mechanism at 165×
  the cost.

## Work

- **Prove the degradation by causing it**, not by stubbing a state. A browser
  test that kills the socket and asserts the region changes **and the rest of
  the page does not** is the only version of this that means anything.
- **Check what CI's store can answer FIRST**, which this story's criteria say in
  as many words: **518 securities and zero bars**, and a runner with **no
  credential has no upstream socket either**. `pnpm store:bare` reproduces that
  shape locally in seconds, and this repository has already paid a six-minute
  round trip for skipping it.
- **Assert the numbers did not move** — criterion 4, _no datum changes as a
  result of this story_, and it is the boundary Story 3.4 depends on. A test
  that only checks the region would pass while a price ticked.
- **One browser test covering connected and disconnected**, per criterion 5.

## Done when

- A browser test drives connected → disconnected **without a refresh**
- The same test asserts every other region and every number is **unchanged**
- What CI's store can answer was checked **before** the suite ran
- `pnpm verify` passes, and `pnpm e2e` passes **apart from the two specs
  `docs/GAPS.md` records as failing on a developer's store and passing on CI** —
  `pressing a window does not move the chart` at tablet and at phone. Task 3.3.5
  reproduced them on `main` in a clean worktree. **Check them against that entry
  before reading either as your own**, because the suite reports a
  store-dependent failure and a real regression identically.

---

## What was found

### The state the task recorded was the wrong one, and producing the right one found a defect

The brief carried a screenshot of the degraded strip. **It was a cold load with
the backend already down** — not criterion 2's _degrade without a refresh_, which
is a different state. Producing the real one first, by loading a page and then
killing the backend under it:

```text
BEFORE  Market feed · Simulated · Generated test data. Not a market feed. · live
        Backend service · healthy

AFTER   Market feed · Simulated · Generated test data. Not a market feed. ·
        disconnected · The live feed is not connected. Prices shown are the last known.
        Backend service · healthy
```

Two things fall out, and the second is the task's real finding.

**The venue is retained**, which is Task 3.3.5's decision paying off visibly: a
feed cell fed by the socket would have gone blank at exactly the moment a reader
most needs to know what the numbers on the screen are. And the price was
unchanged — `218.29` → `218.29`.

**But `Backend service · healthy` is on that second line, and the backend is
dead.**

### The defect: for thirty seconds the strip pointed away from the fault

Each cell is honest about its own subject. The **pair** says _the market feed
broke and the service is fine_, when the service is what died — and pointing a
reader at the wrong subject is worse than saying nothing.

**It exists because the live feed is the first surface in this chrome that is
faster than its neighbours.** The socket notices in the same tick; the health
check is a 30-second poll. Until today every indicator here learned things at the
same rate, so _reading the set as a set_ meant reading it at one instant. **That
is what the old wording missed**, and the canvas now says it: a surface added to
this strip is reviewed against the others **at the rates they learn things**.

**The repair is a prompt, not an answer.** A lost socket makes the health check
**run now**; what it then reports is its own HTTP result. So the two indicators
stay independent — Task 1.12.4's argument, refused here for the sixth time —
and only the staleness is removed.

> **One indicator may tell another when to look. It may not tell it what it
> sees.**

And it is `useBackendHealth`'s **own existing rule with a second trigger**: the
loop already polls immediately when a hidden tab becomes visible rather than
waiting out the interval, recorded there as _"so a returning user does not read
a stale state."_ `recheckOn` is that sentence with a different cause, and it
reuses the mount path rather than adding a second one.

**Three unit tests hold it**, and the third is the design in one assertion: the
socket says unreachable, the backend answers 200, and the cell **stays healthy**
— because it is.

### The spec, and why it runs in 2.9 s

`routeWebSocket` closes **this page's** market socket and touches nothing else —
the same choice `backend-recovery.spec.ts` made for HTTP, for the same reason
(the pair is shared with every spec in the run). It is also the sharper
instrument: killing the whole backend degrades two indicators at once and cannot
tell you which one the page reacted to.

**No `waitForTimeout`, and that is load-bearing.** The transport reports a closed
socket in the same tick; §11.2's 165 s is for a socket that goes _silent_, not
one that goes away. A spec that waited it out would be asserting the wrong
mechanism at 165× the cost.

**The two cells are asserted moving independently**, which is what goes red if
they are ever collapsed — the venue must still say what it said.

### It was proven to go red, by breaking the rule it tests

`pnpm break` is not the instrument here: its entries run `node`-level checks with
no servers, and this needs a running pair. So the substitution was performed by
hand and the tree checked after:

```text
connectionWordFor: `if (!backendReachable) return null`   →  2 failed
restored                                                  →  2 passed, no diff
```

### A race in my own spec, found by running it beside another

It passed alone and failed in a pair. Not the product: **the figures were
captured before the page had finished acquiring them**, so under a loaded backend
a late answer changed a number between the two reads. `waitUntil: "networkidle"`
is the fix, and the comparison is only meaningful once the page has stopped
acquiring numbers.

### A spec Task 3.3.5 invalidated and did not notice

`market-feed.spec.ts` carried a list described as _"the words this region
rendered for six stories and **must never render again**"_ — `disconnected`,
`live`, `stale`. Task 3.3.5 put them back **on purpose and with a true value**,
so the claim became false.

**It did not go red.** A deployment with no provider renders no connection word
at all and CI has no credential, so the assertion held for a reason entirely
unrelated to what it said it was checking. Corrected to the claim that is now
true — _the unconfigured row of §11.3's grid has no connection word_ — with the
other direction owned by the new spec.

**This is the second time in two tasks that a green suite has hidden a stale
claim**, and both were found by reading rather than by running.

### What CI can answer, checked before the suite as the task demanded

`pnpm store:bare`, then the whole suite against it:

```text
127 passed, 0 failed, 15 skipped
```

**Including the two specs that fail on my own store.** That confirms
`docs/GAPS.md`'s entry from the other direction — they are **store-dependent
rather than flaky**, which is a sharper claim than the worktree reproduction
alone supported, and the entry now says so.

## For a stakeholder — a status report, 2026-09-19

**Where the product is.** A user can explore 518 US companies and their
historical charts, and the screen now tells them whether the market data behind
it is arriving. This task was about what happens **when it stops** — the sixth of
seven in this story, and the one that turns last task's promise into something a
machine checks on every change.

**What this task guarantees: the page does not fall over.**

Pull the plug on the connection and the feed region says so, immediately, without
the page reloading — and **everything else stays exactly as it was**. The prices
on screen do not move, no region disappears, nothing turns red, and there is no
error page. That is now an automated test that runs in **under three seconds** on
every change, rather than something someone once checked by hand.

**But the design review found a real problem first, and it is worth explaining
because it is the kind nothing automatic could have caught.**

Our status bar has two indicators side by side: one for the market feed, one for
the backend service. Kill the backend and this is what a reader saw:

> **Market feed: disconnected** · **Backend service: healthy**

Both statements were _individually_ true at that instant. Together they said
something false and unhelpful: _the market feed broke, the service is fine_ —
when the service was the thing that had died. **It pointed the reader at the
wrong culprit.**

**Why it happened is the interesting part.** The live connection notices a
problem **instantly**. The service check is a poll that runs **every thirty
seconds**. Until this week every indicator on that bar learned things at the same
speed, so reviewing them "as a set" meant looking at them at one moment. The live
feed is the first thing on the screen that is faster than its neighbours — so a
thirty-second window opened in which the bar told a misleading story.

**The fix, and the principle we did not break to get it.** The obvious shortcut
would be to let the feed tell the service indicator that things are bad. We did
not do that, because it would let one indicator put words in another's mouth —
and the whole reason there are two is that they can fail independently and must
be able to disagree.

Instead, losing the connection now makes the service check **run immediately**
rather than waiting for its next scheduled turn. It still reports whatever it
finds. In one line:

> **One indicator may tell another when to look. It may not tell it what it
> sees.**

There is a test for exactly the case that proves the distinction: the connection
drops but the service is genuinely fine, and the service indicator correctly says
so.

**Two pieces of housekeeping worth reporting, because both were quiet.**

An existing automated test said certain words "must never appear" on the screen.
Last task deliberately made them appear — and the test **did not fail**, because
our development machines have no market-data provider configured, so those words
happen not to show up there. It was passing for a reason that had nothing to do
with what it claimed to check. Corrected.

And we verified the new test against a copy of the exact database our build
server uses, before running anything — **127 tests passed, none failed**. That
also settled a question left open last task: two unrelated tests that fail on a
developer's machine and pass on the build server are **data-dependent, not
unreliable**, which is a much more useful thing to know.

**How this unlocks progress.** The honest-degradation promise is now mechanical.
**One task remains in this story** — verification, documentation, and a piece of
market-data evidence we have been waiting for a live trading session to capture.
Then the next story makes a number move for the first time.

**What a user can see today: nothing new**, and that is the point of this one —
it protects what landed yesterday.
