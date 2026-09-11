# Task 2.11.5 — Client-side navigation, and the table as a way in

**Status:** Complete — 2026-09-11
**Story:** [2.11 Security Search & Selection](STORY.md)
**Depends on:** 2.11.4

## Objective

Make moving between two securities a **client-side navigation**, and make a row
of the tracked universe a way to open one.

`FRONTEND-STATE.md` and Story 2.10's close both name this as unfinished work
with a cost that is larger than it looks: **every route to a second symbol today
is a document navigation**, which reloads the bundle and takes the module-level
series cache with it. That is why the stale mark had to be demonstrated through
header navigation, and why _"the panel never shows one symbol's bars under
another's name"_ is asserted in jsdom by request identity rather than in a
browser. This task is what makes that browser assertion possible for the first
time.

## Amended 2026-09-11 by Task 2.11.4 — half of this is already done, and one criterion below was wrong

**The premise above is now false for search, and it is the load-bearing half of
it.** Task 2.11.4 navigates with `useNavigate()`, so opening a security from a
search result is **already a client-side navigation**. Measured in a browser on
2026-09-11: a marker set on `window` survives the transition and
`performance.getEntriesByType("navigation")` stays at **one** entry. The module
cache is therefore no longer torn down between symbols, and the condition this
task was written to create **already exists** — which means the browser
assertions it asks for can be written now rather than after more work.

**What is genuinely left**, and it is less than this file describes:

- **The table row as a way in.** Untouched, and still the real work — a `<tr>`
  with an `onClick` is not operable by keyboard and announces nothing.
- **The browser assertions.** Writable today; nothing here has ever asserted them.
- **The supersede-don't-race check**, for the same reason.

**One `Done when` criterion below contradicted a settled decision and has been
corrected.** It read _"the return paints from cache with no request"_.
`FRONTEND-STATE.md` §2 decided the opposite in as many words — the cache is
**"read only to paint sooner and never to skip a request"** — because the
browser's own HTTP cache revalidates each response with `If-None-Match` and the
half a client cache is actually buying is the paint, not the byte. Measured
2026-09-11 over search → NVDA → search → HSY → Back: the return **does** issue a
request, which is the contract working rather than the cache failing.

Implementing the old wording would have meant either breaking §2 or writing an
assertion that cannot pass. The criterion now asserts what the design actually
promises: the return paints **in the first commit** and revalidates behind it.

## What the user can see when this lands

**The product stops reloading.** Opening a second security is instant rather than
a page load, and a security visited before paints its held series in the first
commit instead of fetching it again. Clicking a row in the tracked universe opens
that security — the table stops being a list you read and becomes a way in.

## Work

- **Client-side links.** Every navigation to a security — from a search result,
  from a table row, from anywhere else that acquires one later — is a real
  in-application navigation rather than a document load. Build the destination
  with `securityPath()`; do not interpolate the pattern.

- **A table row is a link, and it is a link in the accessible sense.** A `<tr>`
  with an `onClick` is not operable by keyboard and announces nothing; whatever
  shape is chosen, a row's target must be reachable by Tab, activated by Enter,
  and readable as a link by a screen reader. Decide whether the whole row or the
  symbol cell is the target and record why — the row is a bigger target and
  fights text selection; the cell is smaller and unambiguous.

- **The cache survives the navigation, and prove it in a browser.** With
  client-side routing, the module-level parsed-series cache is no longer torn
  down between symbols, which is the condition the cache was built for and has
  never actually been in. Add the browser assertion that could not previously be
  written: navigate to a symbol, navigate to a second, navigate back, and the
  first paints without a request — and, the assertion that matters more, **the
  panel never shows one symbol's bars under another's name** at any point in that
  sequence.

- **What the panel shows while the next series loads** was settled in Task
  2.10.8; this task is the first thing to exercise it with two real symbols in
  one page lifetime rather than one. If the settled behaviour turns out to be
  wrong under a real switch, that is a finding for `SEARCH-AND-SELECTION.md` and
  a change here, not a new rule invented in a component.

- **In-flight requests are superseded, not raced.** `useBarSeries` keys on the
  request as sent and cancels by request identity. A fast sequence of navigations
  must land on the last one; check it rather than assume it, because this is the
  first time the sequence can happen without a page load in the middle.

- **The header's existing navigation must keep working**, and so must a cold deep
  link to `/securities/:symbol` — that is what `specs-deployed/host-routing.spec.ts`
  asserts against the deployed host, and the `staticwebapp.config.json` fallback
  is what makes it true. Client-side routing does not remove the need for either.

## Done when

- Search results and table rows both open a security without a document load
  (**search already does, since Task 2.11.4** — the remaining half is the table)
- A row's target is reachable by keyboard and announces as a link
- A browser spec asserts a symbol → symbol → back sequence, that the return
  **paints in the first commit from the cache while still revalidating** — never
  that it skips the request, which `FRONTEND-STATE.md` §2 forbids — and that no
  intermediate frame shows one symbol's bars under another's name
- A rapid sequence of navigations lands on the last one
- The deep-link path still works cold
- `pnpm verify` and `pnpm e2e` pass

## Notes

The trap is treating this as a link-tag substitution. It is a behaviour change to
the whole page's lifetime: module-level state that has been recreated on every
navigation since the product existed now survives, and anything that was
accidentally relying on the reload is about to stop working. The two candidates
are the series cache, which wants this, and any component holding state keyed on
a symbol it does not re-read — look for the second before assuming there is none.

`e2e/README.md`'s rules about what a browser spec must not assert apply, and the
suite is the fourth workspace package with no `test` script deliberately, which
is the only thing keeping it out of `pnpm test`.

---

## What was done — 2026-09-11

### The table row, and the decision the task asked for

**The target is the symbol cell, not the row**, and the argument is recorded
beside `.symbolLink` in `UniverseTable.module.css` rather than here. In short,
three things, in order of weight:

- **A `<tr onClick>` is not a link.** Not in the tab order, Enter reaches
  nothing, no address to copy or middle-click, and a screen reader announces a
  row of data with no indication that anything opens. Every one of those would
  have to be rebuilt by hand, and each rebuild is a chance to get it wrong.
- **A row-sized target fights selection.** Four of the seven columns are text an
  analyst copies. On a clickable row, a drag across the company name is a
  navigation, and the reader loses the page as the price of trying to copy a
  word off it.
- **The symbol is already the security's identity in this product** — the row
  header, the first thing search matches, and the segment the address carries.
  "Click the symbol to open the security" needs no explaining.

The cost is a smaller target, and most of it is bought back by giving the cell's
padding to the link: the whole cell is clickable, and the column's rhythm is
unchanged. The affordance is the link's own underline, a chevron that holds its
space and fades in, and the pointer — **not** the row's hover tint, which
predates this task, exists to track the eye across seven columns, and would be a
lie if it implied the whole row opened something. `.row:focus-within` joined it,
which is the state that CSS file had been predicting since Task 2.4.4.

The destination is `securityPath(symbol)` and no third spelling of the pattern
was added. An **untracked** security is a link like any other — `UNIVERSE.md`
§12.2's rule arriving at navigation, since its stored bars did not stop
existing.

### The four browser assertions Story 2.10 could not write

`e2e/specs/security-navigation.spec.ts`, five tests, all green locally and in the
suite's 51.

1. A row opens a security and **the application is not reloaded** — a marker on
   `window` survives, and `performance.getEntriesByType("navigation")` stays at
   one entry.
2. The symbol is reachable by keyboard and opens on **Enter**.
3. The return to a security **paints its held answer before the network
   answers, and asks again anyway.**
4. **No frame shows one symbol's bars under another's name.**
5. A fast sequence of navigations **lands on the last one.**

Three and four are produced by **holding the real response open** rather than by
mocking a cache, because against a fast local pair a cache hit and a quick round
trip look identical. Nothing asserts a duration: the delay makes the state, the
assertions are about what is on screen.

**Criterion three was the corrected one**, and the correction held up. It
asserts the paint and the revalidation, never a skipped request —
`FRONTEND-STATE.md` §2 forbids the latter in as many words, and the spec asserts
that the return _did_ issue a request.

### Every one of those was substituted, and one of them was blind

`CLAUDE.md`'s rule that a break which does not go red is not evidence earned its
place here.

| Substitution                                        | Result                                |
| --------------------------------------------------- | ------------------------------------- |
| `Link` → plain `<a href>`                           | red — two navigation entries          |
| The cache read in `useBarSeries` → always `loading` | red — no held answer on return        |
| The view reset on a key change removed              | red — the old answer under a new name |
| **All cancellation removed** from `useBarSeries`    | **green** — the test was blind        |

The fourth is the finding. The supersession test originally delayed three
answers so they arrived out of order and asserted the last symbol's heading with
"an answer" under it — and **a wrong series renders as an answer too**. It was
rewritten so the two securities navigated away from answer **503** instead, and
late: a failure state carries a sentence and a retry control that no answer has,
which is distinguishable on CI's empty store as much as on a backfilled one. It
is red now.

Two narrower facts came out of the same exercise and are recorded in the spec
rather than lost: the suite stays **green with only the identity guard removed**,
because the effect teardown's abort alone supersedes a navigation that fast — the
guard is for an answer that had already _resolved_ when the abort landed, an
order that cannot be timed deterministically from outside the page, and
`use-bar-series.test.ts` is where it is checked. And a held response that
outlives its test fails that test from the route callback, _after_ every
assertion in it has passed; `page.unrouteAll({ behavior: "ignoreErrors" })` in an
`afterEach` is the fix.

### The second candidate the Notes told us to look for — found, and benign

The warning was that module-level and component state recreated on every page
load since the product existed now survives. The parsed-series cache is the
first and wants it. **The second is the search field's query**, and it is not
merely alive — it falsifies a line in the subject document.

`SEARCH-AND-SELECTION.md` §3's table said Back returns to the list "with **an
empty field**", which followed from "the query is component state" _given_ that
every navigation reloaded the bundle. It no longer follows: `/securities` and
`/securities/:symbol` are two `<Route>`s rendering the **same** module, so React
re-renders `SecurityExplorer` rather than re-mounting it. Measured in Chromium:
the field still reads `nvid` after opening NVDA, after Back, and after a row
click. The behaviour is kept — a query that survives Back is strictly friendlier
and nothing in §3 was argued from the field emptying — and the file now carries a
dated amendment, as does the handoff row that told Task 2.11.9 to say "Back loses
my search" out loud. It says the opposite now.

### What was swept upward

- **ADR 0023** said a green frontend suite does "not certify client-side
  supersession between two securities … the only route is a document
  navigation". Both halves are now false. It has a dated amendment, not a
  rewrite, and the amendment is careful to state the narrower thing that is
  still true.
- **`SEARCH-AND-SELECTION.md`** §3 (above), §7's two handoff rows, and §8 gains
  the gap this task created: nothing in `pnpm verify` can see whether a
  navigation stays client-side, because jsdom has no history and no bundle to
  reload. Swapping the `Link` for an `<a href>` leaves every unit, component and
  integration test green.
- **`e2e/README.md`** gains the spec, the corrected file and test counts (ten
  files, 51 tests), and a section on producing a state by holding a response
  open — including the blind-test finding, which is the part most likely to be
  repeated.
- **`CLAUDE.md`** gains one line: `renderWithContext` passes the router as
  Testing Library's `wrapper` rather than wrapping the element, because
  `rerender` replaces the root it was given and otherwise throws several
  assertions after the one that read correctly. That was a real failure in this
  task, in `UniverseTable.test.tsx`.

### What did not change

The cold deep link to `/securities/:symbol` is still a document load and must
stay one; `security-series.spec.ts` and `specs-deployed/host-routing.spec.ts`
keep it honest, and both still pass. The header's navigation is untouched. No
chart, no sparkline, no window control — those are Stories 2.12 and 2.13.

### Gates

`pnpm verify` green. `pnpm e2e` green — **51 tests in ten files**, including the
axe gate at zero violations on the two pages it covers.

---

## For the stakeholder — what this actually bought, in plain terms

### The problem, without the jargon

Until today, MarketPulse behaved like a website from about 2005: every time you
opened a different company, the browser threw the entire application away and
downloaded it again. It worked, but it was a full page reload each time — the
flicker you know from clicking between pages on a badly built site — and the
application forgot everything it had just learned.

That mattered more than it sounds. Two weeks ago we built a small memory that
holds the price history the application has already downloaded and prepared, so
that going back to a company you just looked at is instant instead of another
trip to the server. **That memory was being wiped out by the page reload every
single time.** We had built the thing and never once been able to use it, and —
worse — had no way to prove it worked, because the only way to reach a second
company was the reload that destroyed it.

### What changed

Two things, and the second is the visible one.

**Moving between companies no longer reloads the application.** Open NVIDIA,
then AMD, then press Back — the application stays alive the whole time. It is
faster, it does not flicker, and the memory survives, so a company you have
already looked at appears **immediately**, with its real numbers already on
screen, while the application quietly checks in the background whether anything
has changed. That "immediately, then check" behaviour is deliberate: we would
rather show you what we already know instantly and tell you we are refreshing
than make you wait for a server to confirm something we already had.

**The list of 518 companies became a way in.** It was a table you read. Each
company's ticker symbol is now a proper link: click it, or tab to it and press
Enter, and you land on that company's page. Combined with the search box that
shipped yesterday, there are now two honest ways to get to a company — type its
name, or find it in the list — and both work without a mouse.

### Two decisions worth explaining

**We made the ticker symbol the clickable thing, not the whole row.** The
tempting option is to make the entire row clickable, because it is a bigger
target. We did not, for two reasons. The first is accessibility: a whole row that
responds to a click is invisible to a keyboard and to a screen reader — it looks
clickable to a sighted mouse user and is unreachable to everybody else. The
second is more practical: analysts select and copy text out of tables constantly,
and on a fully clickable row, trying to copy a company's name navigates you away
from the page instead. So the symbol is the target, it fills its whole cell so it
is comfortably big, and it tells you it is a link with an underline and a small
arrow when you point at it or tab to it.

**We refused to let the memory skip the check.** There was a version of this task
written down that said returning to a company should show the held data with no
request at all. We deliberately did not build that. Data that is served from
memory with nothing ever verifying it is how a financial product ends up showing
somebody a stale price and never correcting it. The rule is: show what we hold
immediately so the screen is useful, **and always ask anyway**. The check is
cheap — the server usually replies "nothing has changed" with an empty
response — and it means nothing on screen can go quietly out of date.

### The part that is about how we work rather than what shipped

We wrote five automated checks that drive a real browser through these journeys,
and then we deliberately broke the application four different ways to see whether
the checks noticed. Three of them noticed immediately. **One did not** — it
passed happily against a version of the code with a genuine defect in it, because
it had been asking "is there an answer on screen?" when it should have been
asking "is it the _right_ answer?". We found that because we went looking; a
check nobody has ever seen fail is a check nobody should trust. It has been
rewritten and it now catches the defect.

That is roughly the level of paranoia this project applies to everything, and it
is the reason its test suite is worth something.

### Where this leaves the product

The epic's goal is "find a security and look at it". Finding it shipped
yesterday; moving between them shipped today, and it now feels like an
application rather than a set of pages. What you still cannot do is **see** a
price move — everything is stated as numbers and sentences, because nothing in
MarketPulse draws a chart yet. That is the next two pieces of work (Stories 2.12
and 2.13: the price chart, then the volume chart), and they land on the page this
navigation now gets you to without a reload.
