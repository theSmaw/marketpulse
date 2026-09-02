# Task 1.8.3 — The frontend-to-backend connection: proxy or CORS

**Status:** Not started
**Story:** [1.8 Local Development Environment](STORY.md)
**Depends on:** Task 1.8.1

## Objective

Settle how a browser on `http://localhost:5173` reaches a server on `http://127.0.0.1:3000`, prove the chosen mechanism with a throwaway request, and leave the shipping request to Story 1.12.

## Work

- **The failure is already established — Task 1.8.1 took it, and it is worse than the usual telling.** `fetch("http://localhost:3000/health")` from the page at `http://localhost:5173/` gives `TypeError: Failed to fetch`, which names neither CORS nor the origin, while **the backend logs the request and answers it 200**. So the request is not blocked; the browser discards the response after the server has already done the work. Start from that capture rather than re-deriving it, and note the consequence for whoever debugs this next: the terminal — the first place anyone looks — shows a perfectly healthy request beside a page that says the call failed
- **The two answers are alternatives and one of them makes Story 1.12's work vacuous.** Vite's `server.proxy` gives the browser a same-origin path (`/api/*` on 5173, forwarded to 3000) and no CORS is involved at all. Backend CORS keeps the two origins distinct and lets the server say who may call it. **Story 1.12 configures CORS against `http://localhost:5173`** — so choosing a proxy here leaves that configuration testing nothing in the one environment anybody runs. That is the deciding consideration and it belongs in the write-up whichever way it goes
- **Whatever is chosen, it must not be a third place the base URL lives.** The frontend's environment boundary is `envPrefix` plus `envDir` (ADR 0006): a `VITE_`-prefixed value is substituted into the bundle at build time, a non-prefixed read compiles to `undefined`. `apps/frontend/.env.example` currently documents **nothing**, deliberately, and this may be the task that gives it its first entry. If it does, `pnpm env:check`'s fourth check applies — every name there must carry the `VITE_` prefix, and a non-prefixed one is a variable that silently never arrives
- **Frontend configuration is build-time, and that constrains the answer.** One artefact cannot be promoted across environments, which is the same shape as `base` and the reason no runtime configuration mechanism was invented in Story 1.6. If the API's address becomes a build-time literal here, Story 1.11 inherits a rebuild-per-environment consequence and should be told so in writing rather than discovering it
- **Get the address family right.** `vite` and `vite preview` bind IPv6 loopback (`[::1]`); `apps/backend` defaults to `127.0.0.1`, IPv4. `curl http://localhost:5173/` works and `curl http://127.0.0.1:5173/` is connection-refused; the backend is the reverse. Both are "localhost" to a browser and are not to a script, so a proxy target, a documented `curl` and any readiness check each have to name the right one. Measure it rather than reasoning about it — this bit people in Task 1.3.5
- **Add no dependency without measuring it.** If backend CORS is the answer, `@fastify/cors` is the obvious package and its cost — packages, install size, whether it trips `allowBuilds`, and the per-request delta against the shipping server's 13.8 µs `app.inject()` baseline — should be recorded the way `pino-pretty`'s was. Hand-rolling an `onRequest` hook is the alternative and is not obviously wrong for one allowed origin
- **Remove the probe before finishing, and prove it left.** The temporary fetch is scaffolding, not the slice. Story 1.12 owns the real call, its loading and error states, and what the header's `FeedIndicator` does with the answer. Rebuild after removing it and confirm the artefact is unchanged — Task 1.7.6 used the same check on its throwing probes

## Done when

- The chosen mechanism is decided against Task 1.8.1's captured failure rather than a remembered one, and the 200-in-the-terminal detail is carried into the write-up
- Proxy versus CORS is closed with the Story 1.12 consequence stated explicitly, and the rejected option recorded with why
- A throwaway request from the frontend reaches `GET /health` in the running pair with no console error, demonstrated in a browser rather than with `curl`
- The IPv4/IPv6 asymmetry is re-measured and written down wherever an address is now hardcoded
- Any new dependency carries a measured cost; any new `VITE_` variable is in `apps/frontend/.env.example` and `pnpm env:check` passes
- The probe is gone and the frontend rebuilds to the same output as before it existed
- `pnpm verify` exits 0

## Notes

This task's deliverable is a mechanism and a decision, not a feature. The criterion is "the frontend can call the backend without CORS or proxy errors" — _can_, which is a property of the environment. What it actually calls, and what it shows while waiting, is Story 1.12's vertical slice.
