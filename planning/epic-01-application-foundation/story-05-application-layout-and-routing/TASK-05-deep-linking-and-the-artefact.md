# Task 1.5.5 — Deep-linking, code splitting and the artefact's shape

**Status:** Not started
**Story:** [1.5 Application Layout & Routing](STORY.md)
**Depends on:** Task 1.5.4

## Objective

Prove the story's deep-linking criterion against a server that will actually fail it, and take the route-splitting decision deliberately with a measurement behind it — because both land on Story 1.11's desk and both are easy to get wrong in a way that passes locally.

## Work

- **Prove deep-linking against something without an SPA fallback.** Task 1.3.5 measured `vite preview` answering _any_ unmatched path with `index.html` and a 200, and a plain `python3 -m http.server` 404ing the same paths; the dev server behaves like preview. So every route in this story already deep-links on this machine, and that is not evidence of anything. Serve `apps/frontend/dist` from **outside the workspace** with `python3 -m http.server`, request each route path directly, and record what actually happens. The expected outcome is a 404, and **a 404 here is the correct finding rather than a failure of this task**
- **Then say what the answer is, and where it lives.** A history-API fallback is a property of the host, not of the router. There are three shapes and they are not equivalent: a host-level rewrite (whatever Story 1.11 picks), hash routing (no host support needed, and a permanent cost in every URL a user copies), or a static export per route (which the placeholders do not justify). Take the decision or hand it to Story 1.11 explicitly with the constraint written down — what is not acceptable is a criterion recorded as met because the local server was generous
- **Re-check that the missing-asset trap is understood before trusting any local result.** `vite preview` answers a missing asset with `index.html` and a 200 too, so a genuinely broken chunk arrives in the browser as a MIME-type error rather than a 404 naming the file. That is the second reason this task uses a dumb static host
- **Take the code-splitting decision on its merits, with the artefact measured both ways.** `dist/` is three files at the story's baseline — `index.html`, one hashed `assets/*.js` and one hashed `assets/*.css`. A route-level dynamic `import()` makes it many, and splits the **CSS as well as the JavaScript** since the stylesheet is emitted by the same bundler. Measure the split build against the unsplit one rather than assuming splitting is an improvement: four placeholder routes over a 300 kB bundle whose bulk is Base UI and React is the case where splitting plausibly costs more than it saves. **Task 1.5.1 sharpened that arithmetic and it now looks worse for splitting, not better**: the router itself is +37.73 kB and it is needed on the first paint of every route, so it cannot be split out; what is actually splittable is the four placeholders, which are prose and a few classes. Expect the eager chunk to shrink by single-digit kilobytes while the file count multiplies — measure it, but do not be surprised
- **Whatever is decided, the consequence for Story 1.11 has to be stated.** `base` defaults to `/`, so **every** emitted chunk path is absolute; a subpath deployment is then a `base` change and a rebuild applied to a directory rather than to one file. Splitting makes that directory bigger and makes a partial upload a broken application rather than a stale one
- **Check the loading state if splitting is adopted.** A route boundary that shows nothing while a chunk loads is a blank screen, which is the exact thing the not-found criterion exists to prevent one route over. On a fast local network this is invisible; throttle the connection and look
- Re-measure the artefact at the end of this task — modules, JS, CSS, file count — against **both** the Story 1.4 baseline of 193 / 300.09 kB / 7.21 kB / 3 and Task 1.5.1's measured router figure of 253 / 337.82 kB, so the router's cost and the routes' cost stay separately attributable rather than arriving as one number

## Done when

- Each route path has been requested directly from a static host with no SPA fallback, and the result is recorded
- The deep-linking answer is either implemented or handed to Story 1.11 with its constraint stated — not recorded as met on local evidence
- Route splitting is decided with the artefact measured both ways, and the decision names who pays for it
- The artefact's shape is re-measured and recorded
- `pnpm verify` exits 0

## Notes

This is the task most likely to end with "the criterion cannot be fully met inside Epic 1", and that is an acceptable outcome as long as it is written down where Story 1.11 will read it. What is not acceptable is the criterion being ticked because the local server has a fallback nobody chose.
