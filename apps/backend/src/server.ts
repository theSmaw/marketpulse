// The application, separated from the process that runs it.
//
// `buildServer()` creates and configures a Fastify instance and returns it
// *without listening*. Everything that concerns the operating system — reading
// the environment, binding a socket, handling signals — lives in index.ts.
//
// The split is not ceremony. Story 1.9 drives an instance with `app.inject()`
// and no listening socket; Stories 1.7 and 1.12 attach error handling and CORS
// to this same factory. Doing it now costs one file.

// `verbatimModuleSyntax` means type-only imports have to say so. Kept as a
// separate `import type` statement rather than an inline `{ type X }`
// specifier: the inline form erases to `import Fastify, {} from "fastify"` in
// the emitted JS, which is valid but reads like a mistake.
import Fastify from "fastify";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { REQUEST_ID_HEADER } from "@marketpulse/shared";

import type { LogFormat, LogLevel } from "./config.js";
import { registerCors } from "./cors.js";
import { registerErrorHandling } from "./errors.js";
import { resolveRequestId } from "./request-id.js";
import { healthRoutes } from "./routes/health.js";

// What the application needs from the process, which is currently only how to
// log. Not the whole `Config` — this factory has no business knowing there is
// a port, and a test that wants a quiet server should not have to invent one.
//
// The two types come from config.ts, which is the wrong direction on paper: the
// application importing from the module that reads the environment. It is a
// type-only import, so it erases entirely and there is no runtime edge. And the
// alternative is worse — declaring the vocabularies here would put the allowed
// values in one file and the reader that validates against them in another,
// which is the drift `env:check` exists to catch elsewhere. These are
// configuration vocabularies; they live with the configuration.
export interface ServerOptions {
  readonly logLevel: LogLevel;
  readonly logFormat: LogFormat;

  // The one browser origin allowed to call this API (Task 1.8.3). A `string`
  // and not the `Config` type, for the reason above: this factory takes what
  // the application needs, not everything the process read.
  readonly corsOrigin: string;
}

// Stays synchronous, decided in Task 1.2.3 rather than left to drift.
// `app.register()` is itself synchronous — it queues the plugin and defers
// loading to `ready()`/`listen()`, so a caller that listens gets a fully
// registered instance without this factory awaiting anything. The moment
// something here needs `await app.register(...)` or an explicit
// `await app.ready()`, this becomes `Promise<FastifyInstance>` and every caller
// changes with it, Story 1.9's tests included. Nothing needs that yet.
//
// It now takes the logger settings. There is no default: a caller has to say
// what it wants, which is one line for index.ts and is the point for Story
// 1.9 — `buildServer({ logLevel: "silent", logFormat: "json" })` is a server
// that does not narrate every injected request. A default here would be a
// second copy of config.ts's defaults, and two copies of a default is how they
// stop agreeing.
export function buildServer(options: ServerOptions): FastifyInstance {
  const app = Fastify({
    // Fastify's built-in pino. `logger: true` until Task 1.7.1, which added
    // the level and the rendering; Task 1.7.2 added the request serialiser and
    // the correlation id below. The error shape is Tasks 1.7.3 and 1.7.4.
    //
    // `transport` is set only for `pretty`, and its absence is what makes json
    // the cheap path: a transport is a worker thread, and the JSON server
    // should not start one to do nothing. Measured against the 74 ms median
    // start-to-listening, the transport costs about 5 ms and the SIGTERM half
    // of the dev loop about 1 ms; 5000 records followed immediately by
    // `process.exit()` lost nothing in either mode, to a file or to a pipe.
    //
    // `pino-pretty` is resolved by name, at runtime, from a string. That is why
    // it is a `dependency` and not a `devDependency`, against the first read of
    // the house rule: nothing here `import`s it, but `LOG_FORMAT=pretty` in an
    // environment that pruned it is `ERR_MODULE_NOT_FOUND` at startup, in the
    // one place that is hardest to debug. 448 kB in the image is the price of
    // a documented value not being a trap.
    logger: {
      level: options.logLevel,

      // The request record, chosen rather than inherited (Task 1.7.2).
      //
      // pino's default `req` serialiser logs method, url, host, remoteAddress
      // and remotePort — and, importantly, **no headers**, so no Authorization
      // has ever reached a log line here. That is a constraint this narrowing
      // inherits and must not relax; anything added to this object is a field
      // every request writes forever.
      //
      // Three fields are dropped. `host` is this server's own bind address,
      // already known to anyone reading its log and constant across every
      // record. `remoteAddress` and `remotePort` are the two with a privacy
      // dimension, and the argument against them is not only that: behind
      // Story 1.11's proxy or load balancer they become the proxy's address,
      // so they would be a field that is quietly *wrong* rather than one that
      // is merely absent. If a client address is ever wanted, it comes from a
      // forwarded-header decision taken on purpose, not from this default.
      //
      // `url` and not `path`, so the query string is logged. The standing rule
      // is that personal data never goes in a URL in the first place, which
      // makes a query string here filter parameters — and a logged request
      // without them is not the request that was made. That rule is the thing
      // holding this open: the day a query string carries something sensitive,
      // this line is the second place to change and the first is the caller.
      //
      // The `res` serialiser is deliberately left as Fastify's, which logs
      // `statusCode` and nothing else. Restating a one-field default here would
      // be a second copy to keep in step for no gain.
      serializers: {
        req: (request: FastifyRequest) => ({
          method: request.method,
          url: request.url,
        }),
      },

      // How `pretty` renders, chosen in Task 1.8.2 against the measured
      // baseline rather than left at pino-pretty's defaults.
      //
      // `singleLine` is the whole of the legibility fix. Task 1.8.1 counted
      // **12 rendered lines for one `GET /health`** — six per record, because
      // the default puts the message, `reqId` and an expanded `req` or `res`
      // object each on their own line — against a frontend HMR update costing
      // one. In a controlled session of one page load, three requests and four
      // edits, 94% of the shared terminal was this server and 77% of it was
      // three requests. `singleLine` collapses a request to **two** lines and
      // drops no field: the record is the same record, rendered flat.
      //
      // It was chosen over the obvious alternative — a lower `LOG_LEVEL` in
      // the dev loop — because that one has a trap in it. Above `info` a
      // healthy server is completely silent, `Server listening at …`
      // included (ADR 0007 §2), so a quieter loop and a failed start look
      // identical. This changes the rendering and leaves the severity floor
      // exactly where it was.
      //
      // `messageFormat` was tried and rejected in the same measurement.
      // Interpolating `{req.method} {req.url}` into the message reads well on
      // the two records that have a `req` and leaves a ragged run of spaces on
      // every record that does not — the `Server listening` line included,
      // since a template is applied to every record and there is no per-record
      // form. `ignore` was tried too and nothing is ignored: `reqId` is half
      // the width of a line and it is the field that exists precisely to
      // survive interleaving, which is what Story 1.12 brings the moment the
      // page starts calling the API. Proximity is not a correlation id.
      //
      // A stack is still multi-line, and that is pino-pretty's behaviour
      // rather than luck — verified on a thrown 500, where the `err` object
      // keeps its indented `stack` while the surrounding records are flat. So
      // the one thing worth reading down the page still reads down the page.
      //
      // `translateTime` answers the second finding: three clocks in one
      // stream. tsc and Vite both print 12-hour without milliseconds
      // (`8:57:35 PM`); pino printed 24-hour with them (`[20:57:36.471]`), so
      // comparing an HMR update against a request took mental arithmetic in
      // the one terminal where they sit side by side. `SYS:` is load-bearing —
      // without it pino-pretty formats in **UTC**, which is a clock that
      // silently disagrees with the other two rather than one that obviously
      // does. The milliseconds stay: they are what this repository's own
      // restart and drain timings are read off.
      ...(options.logFormat === "pretty"
        ? {
            transport: {
              target: "pino-pretty",
              options: { singleLine: true, translateTime: "SYS:h:MM:ss.l TT" },
            },
          }
        : {}),
    },

    // The correlation id. See request-id.ts for the generator, the inbound-id
    // decision and the validation behind it.
    //
    // This sits beside `logger` rather than inside it on purpose: `genReqId` is
    // a Fastify option, not a pino one, and the id it returns is `request.id` —
    // available to routes and hooks — of which the log field is one consumer.
    genReqId: (request) => resolveRequestId(request.headers),

    // No `forceCloseConnections` here, and that is a measured decision rather
    // than an omission (Task 1.2.4). Fastify 5 defaults it to `'idle'`, but the
    // `'idle'` branch of its onClose hook is gated on `options.serverFactory`,
    // which this server does not supply — so none of Fastify's force-close
    // paths run here. It does not matter: Node's own `server.close()` destroys
    // idle connections (Node 19+), so `app.close()` resolved in under a
    // millisecond with an idle keep-alive socket held open. Measured against
    // both Fastify and a bare `http.createServer` to confirm the attribution.
    //
    // This matters because the server advertises `Keep-Alive: timeout=72`. If
    // close() *did* wait on idle sockets, shutdown would read as a 72-second
    // hang having nothing to do with work in flight. It does not, so the
    // application needs no option set for the benefit of the process.
  });

  // The id, back to the client. Without this it exists only in the log, and a
  // user reporting a failure has nothing to quote.
  //
  // `onRequest` and not `onSend`, and not a per-route line. It is the earliest
  // hook, so the header is already on the reply before anything downstream can
  // fail — verified on a 404 and on a thrown 500, where the response is
  // produced by Fastify's own handlers and no route code runs at all. A
  // per-route line would cover exactly the routes somebody remembered.
  app.addHook("onRequest", (request, reply, done) => {
    reply.header(REQUEST_ID_HEADER, request.id);
    done();
  });

  // The error contract, before the routes rather than after them (Task 1.7.4).
  //
  // Order does not actually matter to Fastify — `setErrorHandler` and
  // `setNotFoundHandler` on the root instance apply to everything registered on
  // it, whenever they are called. It is written first because it reads as what
  // it is: a property of the application, not of any route. See errors.ts for
  // the status-to-code mapping and the log levels.
  registerErrorHandling(app);

  // Who may call this from a browser (Task 1.8.3). See cors.ts for why this is
  // a real allowlist on the server rather than a Vite proxy that would make
  // the question disappear in development and reappear in production.
  //
  // After the error contract and before the routes, which is where it reads
  // rather than where it has to be — like `registerErrorHandling`, this is a
  // property of the application and not of any route. Fastify's own ordering
  // constraint is the one that matters and it is satisfied either way: a
  // plugin registered on the root instance applies to everything on it.
  registerCors(app, options.corsOrigin);

  // Routes are registered here as they arrive.
  //
  // Task 1.2.3 deferred the response-schema question to Story 1.7 and Task
  // 1.7.3 answered it: **Fastify's own JSON Schema support, per route, and no
  // new dependency** — ajv and `fast-json-stringify` are already in the tree as
  // Fastify's own. `/health` carries one; see routes/health.ts for what it buys
  // and for the compile-time guard that keeps it honest.
  //
  // Story 1.6's argument against a schema library does not transfer here and
  // was not reused: that was a schema over `process.env`, which is a schema
  // over strings. A response body is typed data, which is the case a schema is
  // actually good at.
  //
  // Nothing is declared at this level. A schema here would be an application
  // saying something about routes it has not seen; the shape of a response
  // belongs to the route that produces it.
  app.register(healthRoutes);

  return app;
}
