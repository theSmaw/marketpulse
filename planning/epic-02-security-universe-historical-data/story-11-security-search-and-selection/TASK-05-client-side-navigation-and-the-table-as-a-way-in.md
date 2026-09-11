# Task 2.11.5 — Client-side navigation, and the table as a way in

**Status:** Not started
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
