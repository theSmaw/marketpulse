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

// The response schema, and the guard that keeps it in step with the interface
// above.
//
// Fastify serialises a schema'd response through `fast-json-stringify`, which
// **strips every property the schema does not declare**. That is the mechanism
// behind Story 1.7's "no internal detail reaches a client" criterion, and it is
// stronger than remembering: measured on this route, a `secret` field added to
// the body vanished from the wire entirely with the schema in place and was
// serialised verbatim without it.
//
// The same stripping is silent, which is the trap. Add a field to
// `HealthResponse`, forget it here, and it disappears at runtime with a green
// `tsc -b`, a green lint and a green build — a fourth silent-failure class
// beside the misspelled CSS Module class, the missing `.js` import extension
// and the unchecked router path.
//
// `satisfies Record<keyof HealthResponse, JsonSchemaProperty>` is what closes
// it, for zero dependencies: a field added to the interface and not to this
// object is `TS1360` naming the missing property, and a property here that is
// not on the interface is an excess-property error. Verified both ways round.
//
// Two things it does not close, both measured and both accepted. A declared
// property whose JSON type disagrees with the TypeScript one is **coerced
// silently** — a `number` declared as `"string"` went out as `"1.5"` — because
// this guard checks that the keys match, not that the types do. And a property
// the schema marks `required` that the handler omits is a **500 at runtime**
// with `"x" is required!` as the message, which is loud rather than silent but
// is still a runtime failure rather than a compile one. Known and dated
// 2026-09-01; closing either would mean deriving the type from the schema, and
// see the outcome of Task 1.7.3 for why that dependency was not taken.
interface JsonSchemaProperty {
  readonly type: "string" | "number" | "boolean";
  readonly enum?: readonly string[];
}

const healthProperties = {
  status: { type: "string", enum: ["ok"] },
  version: { type: "string" },
  uptimeSeconds: { type: "number" },
} satisfies Record<keyof HealthResponse, JsonSchemaProperty>;

// `required` is derived rather than written out, so it cannot fall behind the
// properties it lists. Everything in this response is always present; the day
// something here is genuinely optional, this line becomes a literal and the
// omission becomes a decision rather than a default.
const healthSchema = {
  response: {
    200: {
      type: "object",
      properties: healthProperties,
      required: Object.keys(healthProperties),
    },
  },
};

// FastifyPluginCallback rather than the async form: there is nothing to await
// here, and an async function that never awaits is a lie the linter is right
// about.
export const healthRoutes: FastifyPluginCallback = (app, _options, done) => {
  app.get("/health", { schema: healthSchema }, (_request, reply) => {
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
