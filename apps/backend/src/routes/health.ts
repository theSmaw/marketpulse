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

// The response shape and its status union. They were declared in this file
// until Task 1.12.1 and now live in packages/shared, because Story 1.12's
// frontend has to compile against the same definition rather than a second
// copy of it — and because this import is what makes apps/backend's declared
// dependency on that package honest for the first time.
//
// Only the *type* moved. The schema below and its guard stay here:
// JsonSchemaProperty is deliberately not in packages/shared, since nothing
// outside this application declares a response schema.
import { HEALTH_STATUSES } from "@marketpulse/shared";
import type { HealthResponse } from "@marketpulse/shared";

import { apiErrorSchema } from "../errors.js";
import type { JsonSchemaProperty } from "../json-schema.js";

// The response schema, and the guard that keeps it in step with the
// `HealthResponse` interface — which now lives in packages/shared, so the guard
// is checking one package's object against another package's type. That is the
// arrangement working rather than a smell: the wire shape is the contract and
// the schema is this server's rendering of it, and TS1360 fires across the
// package boundary exactly as it did within the file.
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
//
// `JsonSchemaProperty` was declared here until Task 1.7.4 and now lives in
// ../json-schema.ts, because the error contract's schema needs the same guard
// and two copies of the type is how the two schemas stop agreeing.
const healthProperties = {
  // `enum: HEALTH_STATUSES` rather than a literal `["ok"]`, so the union is
  // enforced by the serialiser and the compiler from one source and the two
  // cannot disagree — the shape apiErrorSchema already has with
  // API_ERROR_CODES. Epic 3 widening HealthStatus reaches the wire without an
  // edit here.
  status: { type: "string", enum: HEALTH_STATUSES },
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

    // 500 declared even though this handler cannot fail today, and it is not
    // ceremony: a route-level response schema is the *only* place Fastify will
    // apply the serialiser to what an error handler sends. Measured both ways —
    // with this entry, a body the error handler decorated with `stack` and
    // `cause` reached the wire as the four contracted fields; without it, both
    // extra fields went out verbatim. So this is the second mechanism behind
    // criterion 6, and it is per-route and opt-in. The first one covers
    // everything and is `apiError()` itself, which builds an object with no
    // slot for anything else.
    //
    // Declare this on every route that can fail. Nothing in `pnpm verify`
    // checks that you did.
    500: apiErrorSchema,
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
