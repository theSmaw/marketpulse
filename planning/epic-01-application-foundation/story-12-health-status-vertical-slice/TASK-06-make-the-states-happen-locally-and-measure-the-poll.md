# Task 1.12.6 — Make all three states happen locally, prove recovery, and measure what the poll costs

**Status:** Not started
**Story:** [1.12 Health & Status Vertical Slice](STORY.md)
**Depends on:** Task 1.12.5

## Objective

Produce every state by a real cause rather than by a flag, watch recovery happen without a reload, and put numbers under "polling is deliberate about frequency and does not spam logs". Local only; the deployed environment is Task 1.12.7's.

## Work

- **Produce each state by a cause, and write down the cause beside the reading.** Unreachable: stop the backend, and separately hold port 3000 with a squatter — which is the state `pnpm dev` leaves you in while looking entirely healthy, sixteen log lines scrolled away behind Vite's banner and nothing exiting non-zero. Degraded: Task 1.12.1 defined it structurally and named two producible causes, so there are two readings to take rather than one — `not-ok-status`, by pointing `VITE_API_BASE_URL` at something that answers non-2xx, and `unreadable-body`, by pointing it at any static host, which answers `index.html` at **200** and is the `vite preview` trap this repository has measured twice. Healthy: the ordinary pair
- **A socket that accepts and never answers is a different failure from a refused connection**, and it is the one that hangs `fetch` forever without a timeout. Produce it — Task 1.8.4's squatter is the recipe — and confirm the indicator reaches a state rather than staying on the last one. **The state it must reach is `unreachable` and not `degraded`**: latency is deliberately not degradation, so a timeout means nothing arrived. That is an assertion rather than an observation, and it is the one that fails if the deadline was never wired
- **Watch recovery rather than inferring it.** Stop the backend, see the state change, start it again, and see the state return with **no page reload**. Prove it was not a reload the cheap way: `performance.timeOrigin` unchanged and exactly one `navigation` entry, which is the same check this repository uses for HMR
- **Confirm the last successful check time is right and survives.** It must not clear on a failed poll, must not advance on one, and must read as the time of the last _successful_ check rather than the last attempt. That is one line of code and the most likely thing in this story to be quietly wrong
- **Count the log lines rather than estimating them.** The rendered floor is 2 lines per healthy request and 3 per 404 since Task 1.8.2; take the actual figure over a minute of a running pair with one tab open, and again with several. Record it beside the interval Task 1.12.3 chose, so the choice can be re-read against evidence later
- **Re-check the `ignore: "reqId,pid"` reversal trigger, because it is explicitly this story's.** `reqId` was kept in the `pretty` rendering precisely because this story is what makes requests interleave. Now that they do, look at the terminal: if they do not in fact interleave, the lever is worth **172 → 117 columns**, which is the difference between a request line wrapping and not. Decide it on what the terminal actually looks like
- **Take the frontend's own cost.** Whether the poll produces a re-render per tick regardless of whether anything changed, and whether the effect survives a route change without tearing down and re-establishing. Neither is a performance target at this size; both are the shape Epic 3 inherits
- Re-take the artefact figures. The frontend's bundle has moved once in seven stories and this story moves it again — modules, JavaScript bytes, CSS bytes, file count and the md5 of each. **Say which build produced them**: a default build and a deploy build differ in two files, the JavaScript by 72 bytes and `index.html` at an identical 1,101 B because it carries the hashed script filename, so a size comparison reports the document unchanged and it is not

## Done when

- All three states have been seen locally, each from a named cause, with the reading recorded
- Recovery has been watched happening, with `timeOrigin` and the navigation count proving it was not a reload
- The log-line cost of the chosen interval is a measured figure rather than an estimate
- The `reqId` rendering question is decided on evidence and recorded
- `pnpm verify` passes and `pnpm ready` still answers correctly for both the healthy pair and the half-pair

## Approach note

Every state in this story is a client-side conclusion, so the server log will say the system is healthy through most of what this task produces — and in the cross-origin case it will say **200 with a full body** while the browser says `TypeError: Failed to fetch`. The browser is the only instrument that can see what this story built. Take every reading there.
