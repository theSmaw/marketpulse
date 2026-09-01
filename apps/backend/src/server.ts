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
import type { FastifyInstance } from "fastify";

import type { LogFormat, LogLevel } from "./config.js";
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
    // the level and the rendering and nothing else — correlation ids,
    // serialisers and the error shape are Tasks 1.7.2 to 1.7.4.
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
      ...(options.logFormat === "pretty"
        ? { transport: { target: "pino-pretty" } }
        : {}),
    },

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

  // Routes are registered here as they arrive.
  //
  // No JSON response schema on this route yet. Fastify's response schemas are
  // worth having, but choosing a schema approach is entangled with Story 1.6's
  // configuration validation and Story 1.7's error shape, and picking one here
  // would pre-empt both. A deliberate deferral rather than an oversight.
  app.register(healthRoutes);

  return app;
}
