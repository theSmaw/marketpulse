// GET /health — the one route this story ships.
//
// A Fastify plugin in its own file rather than an `app.get(...)` inline in
// buildServer(). One route does not need a directory; the second one will, and
// the cost of setting the pattern now is a file and an import.

import process from "node:process";

import type { FastifyPluginCallback } from "fastify";

// The version comes from the package manifest rather than a string literal
// that would drift from it on the first release.
//
// Task 1.2.3 was written expecting this to need `createRequire`, on the
// grounds that package.json sits outside `rootDir` and so cannot be a program
// input. That was checked rather than trusted, and it is wrong: `module:
// nodenext` turns `resolveJsonModule` on, TypeScript admits the file without a
// TS6059 rootDir error, emits no copy of it into dist/, and rewrites nothing —
// the specifier below survives compilation verbatim and Node resolves it under
// its own import-attributes support.
//
// It resolves to the same file from src/ and from dist/, because both are one
// directory below the package root, so `routes/` is two levels down in either.
// Only the dist/ case can actually occur: Task 1.2.2 rejected running the
// TypeScript directly, so nothing ever executes apps/backend/src.
//
// The payoff over `createRequire` is that `version` is typed as a string by
// the compiler reading the actual manifest, so there is no `any` to narrow and
// no runtime shape check to write.
import manifest from "../../package.json" with { type: "json" };

// A string literal union, not a boolean and not a free string. Today it only
// ever emits "ok": there is no dependency for this server to be degraded about
// until Epic 2 adds one, and "unreachable" is the absence of a response, which
// no server can report about itself (Story 1.12 decides that client-side).
// Epic 3 adds market-feed state here, and the union is what makes that an
// addition rather than a breaking change.
export type HealthStatus = "ok";

export interface HealthResponse {
  status: HealthStatus;

  // apps/backend's package.json version. Not the git SHA and not a build
  // stamp — Story 1.11 can decide it wants one of those.
  version: string;

  // *Process* uptime, not time since the server started listening. They differ
  // by milliseconds today and could differ by more once startup does real
  // work, so the field says which one it is, and the unit is in the name
  // rather than in a comment nobody reads over the wire.
  uptimeSeconds: number;
}

// FastifyPluginCallback rather than the async form: there is nothing to await
// here, and an async function that never awaits is a lie the linter is right
// about.
export const healthRoutes: FastifyPluginCallback = (app, _options, done) => {
  app.get("/health", (_request, reply) => {
    const body: HealthResponse = {
      status: "ok",
      version: manifest.version,
      uptimeSeconds: process.uptime(),
    };

    // 200 stated rather than left to Fastify's default, because this route's
    // status code is part of its contract with Story 1.12. The content type is
    // Fastify's own doing for a returned object; confirmed, not assumed.
    return reply.code(200).send(body);
  });

  done();
};
