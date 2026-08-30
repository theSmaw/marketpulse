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

export function buildServer(): FastifyInstance {
  const app = Fastify({
    // Fastify's built-in logger at its defaults, and no further. Structured
    // JSON, levels, correlation ids and request logging are Story 1.7's
    // acceptance criteria — pino-pretty, serializers and a LOG_LEVEL variable
    // belong there, not here.
    logger: true,
  });

  // Routes are registered here as they arrive. `GET /health` is Task 1.2.3;
  // until then the only thing this server serves is Fastify's own 404, which
  // is enough to prove it is serving at all.

  return app;
}
