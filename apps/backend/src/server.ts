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

import { healthRoutes } from "./routes/health.js";

// Stays synchronous, decided in Task 1.2.3 rather than left to drift.
// `app.register()` is itself synchronous — it queues the plugin and defers
// loading to `ready()`/`listen()`, so a caller that listens gets a fully
// registered instance without this factory awaiting anything. The moment
// something here needs `await app.register(...)` or an explicit
// `await app.ready()`, this becomes `Promise<FastifyInstance>` and every caller
// changes with it, Story 1.9's tests included. Nothing needs that yet.
export function buildServer(): FastifyInstance {
  const app = Fastify({
    // Fastify's built-in logger at its defaults, and no further. Structured
    // JSON, levels, correlation ids and request logging are Story 1.7's
    // acceptance criteria — pino-pretty, serializers and a LOG_LEVEL variable
    // belong there, not here.
    logger: true,
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
