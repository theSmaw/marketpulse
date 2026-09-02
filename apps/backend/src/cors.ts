// Who may call this API from a browser, and the one header they may read back.
//
// Task 1.8.3. The problem this solves is not that the request is blocked — it
// is not. Measured on the shipping tree before this file existed: a page at
// `http://localhost:5173` calling `http://localhost:3000/health` gets
// `TypeError: Failed to fetch`, which names neither CORS nor the origin, while
// the server logs the request and answers it **200**. The browser discards a
// response the server has already produced, so the terminal — the first place
// anyone looks — shows a perfectly healthy request beside a page saying the
// call failed. Task 1.8.2's rendering makes that pair *more* visible rather
// than less: the healthy 200 is two lines now instead of twelve.
//
// **Why CORS and not a Vite proxy**, which was built and measured before being
// rejected. `server.proxy` forwarding `/api/*` to 3000 works — `fetch("/api/health")`
// from the page returns 200 — and it makes the browser same-origin, so no CORS
// exists to configure. That is the objection. Story 1.12 configures an
// allowlist against `http://localhost:5173`; behind a proxy that configuration
// would be exercised by nothing in the one environment anybody runs, and would
// first be tested in production, where the frontend really is a set of static
// files on a different origin from the API.
//
// The measurement that settled it is smaller and sharper than the argument.
// Through the proxy, `x-request-id` **reads back with no configuration at
// all**, because same-origin responses expose every header. Under real CORS it
// does not, unless a server says so — which is the `exposedHeaders` line
// below. A proxy would therefore have hidden the correlation id's absence
// until the first environment that had no proxy, and Task 1.7.2 built that id
// specifically so a user reporting a failure has something to quote.
//
// **Why the library and not a hook.** `@fastify/cors` is 11.3.0, **+2
// packages** (itself and `fastify-plugin`) and **172 kB** on disk, and it
// trips no install script — `esbuild` is still `allowBuilds`' only entry. A
// hand-rolled `onRequest` hook for one origin is about fifteen lines and this
// repository has hand-rolled bigger things than that (Story 1.6 threw away two
// schema libraries; Task 1.7.6 threw away `react-error-boundary`). The
// difference is the failure mode. Those two would have been *verbose* if got
// wrong; this one is either too permissive — a security bug — or subtly wrong
// on preflight, which presents as `TypeError: Failed to fetch` with a 200 in
// the log. That is precisely the symptom this file exists to remove, so the
// hand-rolled version's worst case is indistinguishable from the bug.
//
// Registered inside `buildServer()` for the same reason `registerErrorHandling`
// is: Story 1.9's `app.inject()` instances get the contract, and anything
// registered in index.ts would not be under test.

import cors from "@fastify/cors";
import { REQUEST_ID_HEADER } from "@marketpulse/shared";
import type { FastifyInstance } from "fastify";

export function registerCors(app: FastifyInstance, origin: string): void {
  app.register(cors, {
    // One origin, exactly, and never `true` or `*`.
    //
    // `origin: true` reflects whatever `Origin` the request carried, which is
    // not an allowlist — it is an allowlist-shaped way of allowing everyone.
    // A string here means @fastify/cors compares and answers with that literal
    // value, so an unlisted origin gets no `Access-Control-Allow-Origin`
    // header and the browser refuses the response, which is the behaviour
    // being configured rather than a side effect.
    origin,

    // What this actually does on the wire is worth knowing before somebody
    // reads a `curl` and concludes it is broken. With a string, @fastify/cors
    // sends `access-control-allow-origin: http://localhost:5173`
    // **unconditionally** — to a request from an unlisted origin, and to a
    // request with no `Origin` at all. Measured:
    //
    //   curl -H "Origin: https://evil.example" …  ->  200, ACAO localhost:5173
    //
    // That is correct and is how CORS works: the server asserts who it trusts
    // and the **browser** compares that against its own origin and refuses the
    // response. The server is not the enforcement point and never sees the
    // check fail. Two consequences. There is no `Vary: Origin` on a simple
    // request, because the header is a constant and varies with nothing — its
    // absence here is right rather than an omission. And **CORS protects the
    // browser's user, not this API**: anything that is not a browser ignores
    // all of it, so nothing here is access control. The router and the error
    // handler are.

    // The correlation id, back to the client that can act on it.
    //
    // Without this the header is on the wire and unreadable from JavaScript:
    // CORS exposes only a short safelist, and `x-request-id` is not on it.
    // Task 1.7.2 put the id on every response so a user reporting a failure
    // has something to quote, and Task 1.7.4 put the same value in the error
    // body — this is what keeps the header half of that true across an origin.
    // Imported rather than spelled: a header-name typo is a compile error
    // nowhere.
    exposedHeaders: [REQUEST_ID_HEADER],

    // Not set, deliberately, and each absence is a decision.
    //
    // `credentials` stays off. There is no session, no cookie and no
    // `Authorization` header in this application, and turning it on is the
    // change that makes an origin mistake expensive rather than merely wrong.
    // Whatever Epic 1 does about authentication reverses this on purpose.
    //
    // `methods` is left at @fastify/cors's default, which is **`GET,HEAD,POST`**
    // — read out of the package rather than assumed, because the plausible
    // guess is the wider CRUD set and it is wrong. A preflight for `PUT` or
    // `DELETE` is therefore refused today. That is fine while the whole API is
    // one `GET`, and it is a thing to remember rather than to discover: the
    // first route that takes a `PUT` needs this line, and its symptom will be
    // a browser error on a route that answers `curl` perfectly.
    //
    // `maxAge` is left unset, so preflights are not cached. The default is one
    // browser round trip per preflighted request in development, which is not
    // worth a number nobody has measured against.
  });
}
