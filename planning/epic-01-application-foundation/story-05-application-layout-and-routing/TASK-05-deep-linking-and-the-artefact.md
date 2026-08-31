# Task 1.5.5 — Deep-linking, code splitting and the artefact's shape

**Status:** Complete (2026-08-31)
**Story:** [1.5 Application Layout & Routing](STORY.md)
**Depends on:** Task 1.5.4

## Objective

Prove the story's deep-linking criterion against a server that will actually fail it, and take the route-splitting decision deliberately with a measurement behind it — because both land on Story 1.11's desk and both are easy to get wrong in a way that passes locally.

## Work

- **Prove deep-linking against something without an SPA fallback.** Task 1.3.5 measured `vite preview` answering _any_ unmatched path with `index.html` and a 200, and a plain `python3 -m http.server` 404ing the same paths; the dev server behaves like preview. So every route in this story already deep-links on this machine, and that is not evidence of anything. Serve `apps/frontend/dist` from **outside the workspace** with `python3 -m http.server`, request each route path directly, and record what actually happens. The expected outcome is a 404, and **a 404 here is the correct finding rather than a failure of this task**
- **Then say what the answer is, and where it lives.** A history-API fallback is a property of the host, not of the router. There are three shapes and they are not equivalent: a host-level rewrite (whatever Story 1.11 picks), hash routing (no host support needed, and a permanent cost in every URL a user copies), or a static export per route (which the placeholders do not justify). Take the decision or hand it to Story 1.11 explicitly with the constraint written down — what is not acceptable is a criterion recorded as met because the local server was generous
- **Re-check that the missing-asset trap is understood before trusting any local result.** `vite preview` answers a missing asset with `index.html` and a 200 too, so a genuinely broken chunk arrives in the browser as a MIME-type error rather than a 404 naming the file. That is the second reason this task uses a dumb static host
- **Take the code-splitting decision on its merits, with the artefact measured both ways.** `dist/` is three files at the story's baseline — `index.html`, one hashed `assets/*.js` and one hashed `assets/*.css`. A route-level dynamic `import()` makes it many, and splits the **CSS as well as the JavaScript** since the stylesheet is emitted by the same bundler. Measure the split build against the unsplit one rather than assuming splitting is an improvement: four placeholder routes over a 300 kB bundle whose bulk is Base UI and React is the case where splitting plausibly costs more than it saves. **Task 1.5.1 sharpened that arithmetic and it now looks worse for splitting, not better**: the router itself is +37.73 kB and it is needed on the first paint of every route, so it cannot be split out; what is actually splittable is the four placeholders, which are prose and a few classes. Expect the eager chunk to shrink by single-digit kilobytes while the file count multiplies — measure it, but do not be surprised. **Task 1.5.2 makes one part of that arithmetic sharper and one part more tempting.** The four non-landing placeholders together are prose and a handful of classes — the whole of this story's route code is +8 modules and +2.28 kB over the router — so splitting them out is close to free and close to worthless. The landing route is the opposite: it carries Story 1.4's render check and therefore Base UI's ~104 kB, which is the only chunk in this application actually worth splitting — and it is the route served on first paint, so splitting it moves the cost rather than removing it. Say that plainly rather than rediscovering it, and note it changes the day Epic 4 replaces the render check. **Task 1.5.3 adds a third category and it is not splittable at all**: the chrome is +2 modules and +0.73 kB, it renders on every route including the not-found state, and it is outside `<Routes>` entirely — so it is in the eager chunk by construction. **Task 1.5.4 answered the open half of that sentence: the regions live in the landing route, not in the shell**, so their +2 modules and +1.25 kB are splittable — and they are splittable only along with the ~104 kB of Base UI the render check drags behind them, because both are inside `MarketOverview`. The three categories are therefore chrome (cannot be split), placeholders (can be, and it is worth almost nothing) and the landing route (worth ~104 kB and served on first paint). Nothing has changed about which of them is tempting
- **Whatever is decided, the consequence for Story 1.11 has to be stated.** `base` defaults to `/`, so **every** emitted chunk path is absolute; a subpath deployment is then a `base` change and a rebuild applied to a directory rather than to one file. Splitting makes that directory bigger and makes a partial upload a broken application rather than a stale one
- **Check the loading state if splitting is adopted, and note Task 1.5.4 raised what is at stake.** A route boundary that shows nothing while a chunk loads is a blank screen, which is the exact thing the not-found criterion exists to prevent one route over. Splitting the landing route now blanks **four named region landmarks and a 70vh grid**, not a paragraph of prose, so the fallback is a layout question rather than a spinner — and the regions are exactly the boundaries a fallback could be scoped to, which is the same argument Story 1.7 will make for error states. On a fast local network this is invisible; throttle the connection and look
- Re-measure the artefact at the end of this task — modules, JS, CSS, file count — against **four** figures now, so the router's cost, the routes' cost, the chrome's and this task's stay separately attributable rather than arriving as one number: the Story 1.4 baseline of 193 / 300.09 kB / 7.21 kB / 3, Task 1.5.1's router spike at 253 / 337.82 kB, Task 1.5.2's shipped 261 / 340.10 kB / 8.62 kB / 3, Task 1.5.3's shipped 263 / 340.83 kB / 9.13 kB / 3, and **Task 1.5.4's shipped 265 / 342.08 kB / 9.82 kB / 3**, which is now the one to diff against. Five figures rather than four: the router, the routes, the chrome, the regions, and this task

## Done when

- Each route path has been requested directly from a static host with no SPA fallback, and the result is recorded
- The deep-linking answer is either implemented or handed to Story 1.11 with its constraint stated — not recorded as met on local evidence
- Route splitting is decided with the artefact measured both ways, and the decision names who pays for it
- The artefact's shape is re-measured and recorded
- `pnpm verify` exits 0

## Notes

This is the task most likely to end with "the criterion cannot be fully met inside Epic 1", and that is an acceptable outcome as long as it is written down where Story 1.11 will read it. What is not acceptable is the criterion being ticked because the local server has a fallback nobody chose.

## Outcome

No source changed. This task is a measurement and two decisions: **deep-linking
is handed to Story 1.11 with its constraint written down**, and **route
splitting is rejected on its own numbers**. `dist/` is still three files and the
artefact figures are unchanged from Task 1.5.4 — 265 modules, 342.08 kB of
JavaScript, 9.82 kB of CSS — which is itself the result rather than an omission.

### Deep-linking, against a host that actually fails it

`apps/frontend/dist` copied outside the workspace and served by
`python3 -m http.server`, with each path requested directly:

| Path                      | Dumb static host | `vite preview`  |
| ------------------------- | ---------------- | --------------- |
| `/`                       | 200 `text/html`  | 200 `text/html` |
| `/investigations`         | **404**          | 200 `text/html` |
| `/securities`             | **404**          | 200 `text/html` |
| `/replay`                 | **404**          | 200 `text/html` |
| `/definitely-not-a-route` | **404**          | 200 `text/html` |
| `/assets/nope.js`         | **404**          | 200 `text/html` |

**The 404s are the correct finding, not a failure of this task.** The dev server
behaves like `preview`; every one of those 200s is 1101 bytes of the same
`index.html`, which is exactly why passing this criterion locally is not
evidence of anything.

**A second criterion turns out to rest on the same host property, and this
story recorded it as met on local evidence.** On the dumb host,
`/definitely-not-a-route` returns _Python's_ error page — `NotFound` never
mounts, because the document that would boot React is never served. So
"an unknown route renders a not-found state rather than a blank screen" is met
**given a history-API fallback** and not otherwise. Task 1.5.2 built the route
correctly and the route is fine; what was untested was the hosting assumption
underneath it. Both criteria are annotated in `STORY.md` rather than quietly
left ticked.

With a fallback present, both work end to end — checked in a browser against
`vite preview` rather than inferred: `/replay` on a cold load renders the
Market Replay heading with `aria-current="page"` on its navigation link, and
`/no-such-page` renders "No such page" with the chrome intact and no link
marked current.

### The answer, and where it lives

**Handed to Story 1.11, because the fallback is a property of the host and the
host is not chosen yet.** Hash routing was the alternative that needs no host
support, and it loses: it puts `/#/` in every URL a user copies, pastes into an
investigation, or files in a ticket, permanently, to avoid one line of hosting
configuration on a platform that has not been picked. A static export per route
is not justified by four placeholders and stops being possible the moment
Epic 4 gives `/securities/:symbol` a parameter.

**Three constraints go with it, and the third is the one that would otherwise
be discovered in production.**

- The rewrite must serve `index.html` with **200**, not a redirect. A 302 to `/`
  loses the path, which is the whole point of deep-linking
- `base` is `/`, so every emitted asset path is absolute. A subpath deployment
  is a `base` change and a **rebuild**, not a rewrite rule — ADR 0003's finding,
  restated here because a fallback is exactly where somebody would try to fix it
  cheaply
- **The rewrite must not be a blanket catch-all.** A fallback that answers
  _every_ unmatched path with `index.html` answers a missing asset that way too
  — which is precisely the `vite preview` trap measured above and in Task 1.3.5,
  arriving in the browser as a MIME-type error rather than a 404 naming the
  file. Scope it to paths that are not under `/assets/`, or let `/assets/*`
  404 explicitly. The failure this prevents is a partially uploaded deploy
  looking like a broken application with no error that names the missing file

### Route splitting, measured both ways and rejected

Built with a `React.lazy` per route module and one `<Suspense>` boundary, then
reverted — the reverted build reproduces the unsplit hashes exactly.

|                        | Unsplit                            | Split                                   |
| ---------------------- | ---------------------------------- | --------------------------------------- |
| Files in `dist/`       | **3**                              | **12**                                  |
| JavaScript, total      | 342.08 kB                          | 343.52 kB                               |
| CSS, total             | 9.82 kB                            | 9.83 kB                                 |
| Gzipped, total         | 114.36 kB                          | 115.62 kB                               |
| Eager chunk (JS + CSS) | 351.90 kB                          | 236.53 kB                               |
| First paint of `/`     | 351.90 kB, 2 files, one round trip | 351.39 kB, 7 files, **two** round trips |

**The eager chunk does shrink — by 105.37 kB — and not one of those bytes is
saved on the route the product opens on.** They move into
`MarketOverview-*.js` at 108.85 kB, which is Base UI arriving on a second
waterfall instead of the first. Splitting relocates the cost of the landing
route rather than removing it, and adds 1.44 kB of JavaScript and nine files
doing so. React and React Router stay in the eager chunk either way, because
the chrome renders on every route including the not-found state.

The three non-landing routes are where the eager saving is real, and they are
reached by clicking a link — so the chunk fetch lands mid-interaction, which is
a worse place to spend a round trip than the initial load. The four placeholder
route chunks are 0.34–0.64 kB each.

**Nobody pays for this today, and Story 1.11 would.** The artefact stops being
three files and becomes a directory of twelve with absolute hashed paths, where
a partial upload is a broken application rather than a stale one.

**The reversal trigger is Epic 4**, which replaces Story 1.4's render check with
the real overview. The moment Base UI is no longer dragged in by a temporary
render check on the landing route, the arithmetic is a different one — and if
the topology, the charts or the replay controls make any single route large,
that route is the case for splitting rather than all five.

### The loading state, looked at rather than reasoned about

Served from a static host that sleeps 2s on every lazy chunk, so the fallback
was visible instead of theoretical. **The chrome renders immediately and the
entire page body is empty** — `AppHeader` is outside `<Routes>` and in the eager
chunk, so what a `fallback={null}` blanks is the whole of `<main>`: four named
region landmarks and the 70vh grid, replaced by nothing, under a header that
looks perfectly healthy.

That is a more specific problem than "a blank screen", and it is the argument
for scoping a fallback to the regions rather than to the router — the same
boundaries Story 1.7 will put error states inside. Recorded rather than built:
nothing here is split, so nothing here needs a fallback.

One measurement caveat stated rather than buried: the delaying host was
single-threaded, so the five chunk requests **serialised** (2055 / 4061 / 6072 /
8079 / 10084 ms). The 2s-per-chunk figure is the instrument, not a network
prediction; what the sequence shows is the shape — eager chunk complete at
34 ms, body renderable only after the last of five further requests.
