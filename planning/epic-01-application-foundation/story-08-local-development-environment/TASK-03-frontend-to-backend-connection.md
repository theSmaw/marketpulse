# Task 1.8.3 — The frontend-to-backend connection: proxy or CORS

**Status:** Complete
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

## Outcome

**Backend CORS, `@fastify/cors` 11.3.0, one origin from configuration.** One
new file (`apps/backend/src/cors.ts`), a fifth configuration variable, three
wiring lines, and one dependency. The frontend is unchanged and its built
artefact is **byte-identical** to what it was before this task started.

### The failure, re-taken on the shipping tree

Task 1.8.1's capture reproduced exactly, and Task 1.8.2's rendering makes the
strange half of it easier to see rather than harder. The page:

```
TypeError: Failed to fetch
```

The terminal, at the same moment:

```
[2:21:38.579 PM] INFO (62932): incoming request {"reqId":"3a543821-…","req":{"method":"GET","url":"/health"}}
[2:21:38.585 PM] INFO (62932): request completed {"reqId":"3a543821-…","res":{"statusCode":200},"responseTime":5.97}
```

**The request is not blocked.** The server does the work and answers 200; the
browser discards the response. So the first place anyone looks shows a
perfectly healthy request beside a page saying the call failed, and the page's
own error names neither CORS nor the origin. Before Task 1.8.2 that healthy 200
was twelve rendered lines and easy to lose; it is two now, which is the one
respect in which this trap got better without anyone aiming at it.

### Proxy versus CORS, decided on a measurement rather than on the argument

The Vite proxy was **built and run** before being rejected, not reasoned about.
`server.proxy` forwarding `/api` to `http://localhost:3000` works on the first
try: `curl http://localhost:5173/api/health` is a 200, and from the page
`fetch("/api/health")` returns 200 with the body, no console error, nothing to
configure anywhere.

The stated objection is Story 1.12's, and it holds: 1.12 configures an
allowlist against `http://localhost:5173`, and behind a proxy that
configuration would be exercised by nothing in the one environment anybody
runs — first tested in production, where the frontend genuinely is static files
on a different origin from the API.

**But the measurement that settled it is smaller and sharper than that
argument, and it was not anticipated.** Through the proxy:

```
{ status: 200, requestId: "ad5613b4-b7a0-44c6-a001-a24c46cafecd", body: "{\"status\":\"ok\",…}" }
```

`x-request-id` **reads back with no configuration at all**, because a
same-origin response exposes every header. Under real CORS it does not — the
CORS-safelisted response headers are a short list and `x-request-id` is not on
it — so a server has to say `Access-Control-Expose-Headers` or the id is on the
wire and invisible to the code that would quote it. A proxy would therefore
have hidden the correlation id's absence until the first environment without a
proxy, and Task 1.7.2 built that id specifically so a user reporting a failure
has something to hand over. **The proxy does not hide one piece of
configuration, it hides two**, and the second one is a feature this repository
already paid for.

Two smaller notes from the spike, recorded because the next person to reach for
a proxy will meet them. The target must be `http://127.0.0.1:3000` and not
`http://localhost:3000`: it happened to work here, but the backend binds IPv4
only and `localhost` resolution order is not guaranteed, so the working version
is working by luck. And `rewrite` is required — `/api/health` reaches the
backend as `/api/health` without it, which is a 404 in the shape of a CORS
problem.

### The address families, re-measured

| Address     | Backend 3000                     | Dev server 5173              |
| ----------- | -------------------------------- | ---------------------------- |
| `127.0.0.1` | **200**                          | connection refused           |
| `[::1]`     | connection refused               | **200**                      |
| `localhost` | 200                              | 200                          |
| socket      | `IPv4 … 127.0.0.1:3000 (LISTEN)` | `IPv6 … [::1]:5173 (LISTEN)` |

Unchanged from Task 1.3.5, and it decides how the allowed origin is spelled.
`http://localhost:5173` and `http://127.0.0.1:5173` are **two different
origins** to a browser rather than two spellings of one, and the IPv4 one is
not merely a different string — it is an address the dev server does not answer
on. `localhost` is the only spelling that is both what Vite prints and what the
browser puts in the `Origin` header. `curl` obscures this by trying both
families, which is why it is the wrong instrument for the question.

### The dependency, measured

`@fastify/cors` **11.3.0**: **+2 packages** (itself and `fastify-plugin@6.0.0`;
`toad-cache` was already in the tree through Fastify), **172 kB** on disk, and
it trips **no install script** — `esbuild` is still `allowBuilds`' only entry,
re-checked. Pinned exactly, like `fastify` and `pino-pretty`; `pnpm add` writes
a caret and this repository does not use one.

Per-request cost, measured the way Task 1.7.7 measured the server: two Fastify
instances in one process, one with the plugin and one without, same route and
same logger, 20 000 `app.inject()` calls per arm after a 2 000 warm-up,
alternating rounds so drift cancels.

```
round 1: cors 15.44 µs, none 10.99 µs, delta  4.46 µs
round 2: cors 13.84 µs, none 15.66 µs, delta -1.82 µs
round 3: cors 13.28 µs, none 11.76 µs, delta  1.52 µs
round 4: cors 13.89 µs, none 12.09 µs, delta  1.80 µs
```

That pattern — a large first delta, a negative second, then two consistent ones
— **reproduced identically across three separate runs**, so it is the
alternating order's JIT warm-up rather than noise, and rounds 3 and 4 are the
settled figure: **about +1.5 µs on a ~13 µs request**. Worth stating precisely
because the tempting reading of round 2 is "inside the noise", and running it
three times is what shows it is not.

**The library over a hand-rolled hook**, against this repository's own habit —
Story 1.6 threw away two schema libraries and Task 1.7.6 threw away
`react-error-boundary`. The difference is the failure mode. Those two would
have been merely verbose if hand-rolled wrong; a hand-rolled CORS is either too
permissive, which is a security bug, or subtly wrong on preflight, which
presents as `TypeError: Failed to fetch` with a 200 in the log — **exactly the
symptom this task exists to remove**. Its worst case is indistinguishable from
the bug being fixed.

### What it does on the wire, including the part that looks broken

```
Origin: http://localhost:5173   -> 200, access-control-allow-origin: http://localhost:5173
                                        access-control-expose-headers: x-request-id
Origin: https://evil.example    -> 200, access-control-allow-origin: http://localhost:5173
no Origin at all                -> 200, access-control-allow-origin: http://localhost:5173
OPTIONS preflight               -> 204, allow-methods: GET,HEAD,POST
                                        allow-headers: content-type
                                        vary: Access-Control-Request-Headers
```

**The second line is correct and reads as a bug.** With a string origin,
`@fastify/cors` asserts the allowed origin unconditionally; it does not compare
and it never rejects. The **browser** compares that header against its own
origin and refuses the response, so the server never sees the check fail. Two
things follow: there is no `Vary: Origin` on a simple request because the
header is a constant and varies with nothing — its absence is right rather than
missing; and **CORS is not this API's access control**, since anything that is
not a browser ignores all of it. The router and the error handler are.

The allowlist is nonetheless real and was proved by making it fail. With
`CORS_ORIGIN=https://marketpulse.example` the same page gets `TypeError: Failed
to fetch` again while the server logs another 200 — which is the same trap,
now with the mechanism configured, and is what distinguishes this from
`origin: true`.

**`methods` defaults to `GET,HEAD,POST`**, read out of the package rather than
assumed — the plausible guess is the wider CRUD set and it is wrong. A
preflighted `PUT` or `DELETE` is refused today. Fine while the whole API is one
`GET`; the first route taking a `PUT` needs that line, and its symptom will be
a browser error on a route that answers `curl` perfectly.

### The demonstration

The probe was `fetch("http://localhost:3000/health")` at the bottom of
`main.tsx`, and in the browser on the running pair:

```
[probe] 200 3514182c-6854-4a99-bb37-6446bb7af057 {"status":"ok","version":"0.0.0","uptimeSeconds":51.92}
```

One console entry, no exception, no CORS error — and the middle field is the
`x-request-id`, read from JavaScript across an origin, which is `exposedHeaders`
doing the one job it was added for. A page load costs the shared terminal
**2 lines**, confirming Task 1.8.2's prediction that the Story 1.12 floor is 2
and not 12: a simple `GET` is not preflighted, so there is no `OPTIONS` pair
beside it.

The probe is gone. `apps/frontend/dist` rebuilds to **`index-C-Puqfnm.js`** and
**`index-DFxUCjbx.css`**, md5 `cba2825c…` and `f98519e3…`, identical to the
tree before the probe existed, and `localhost:3000` appears **zero** times in
the artefact.

### Configuration, and what Story 1.11 inherits

`CORS_ORIGIN` is the fifth variable, read by `config.ts` like every other one,
documented in `apps/backend/.env.example`, and checked by `pnpm env:check` —
which was made to fail before it was made to pass. It defaults to
`http://localhost:5173`, so **a clean clone with no `.env` at all has a working
pair**, which is this story's headline criterion and the same reason `PORT` is 3000.

Two consequences written into `config.ts` rather than left to be discovered.
**The default is not safe by omission**: a deployment that never sets
`CORS_ORIGIN` allows a page at `http://localhost:5173` to call it, so
somebody's local dev server can talk to production. That is small — there is no
cookie or credential to ride along, because `credentials` is off — and it is
real, so **Story 1.11 sets this variable explicitly**. And there is no
environment concept to lean on (ADR 0007 §1), so "required in production" is
not something this application can express; a documented default that
`env:check` keeps honest is what replaces it.

**No `VITE_` variable was added, and that is the decision rather than an
omission.** The probe hardcoded the address and the probe is gone, so nothing
in the frontend reads an API address — `apps/frontend/.env.example` still
documents nothing, deliberately, exactly as Task 1.6.6 left it. Story 1.12 owns
the real call and therefore owns the variable, and it should know what it is
buying: frontend configuration is **statically substituted at build time**, so
a `VITE_API_BASE_URL` makes the API's address a literal in the bundle, one
artefact cannot be promoted across environments, and Story 1.11 inherits a
rebuild-per-environment consequence — the same shape as `base` and `basename`
(Task 1.6.5). Adding the variable here would have meant a documented name that
nothing reads, in the one file whose whole job is to be honest about what is
read.
