// The `.env.example` files describe what the application actually reads. This
// is the check that says so.
//
// Task 1.6.6 wrote the examples; without this they would be prose, and prose
// about configuration goes stale on the first variable anyone adds. There is no
// schema object to reflect over — Task 1.6.1 closed that decision as no schema
// library — so what this walks is `CONFIG_VARIABLES` in
// `apps/backend/src/config.ts`, a plain `{ key, required, default, description }`
// table that Task 1.6.2 exported for exactly this purpose. The readers
// deliberately do **not** loop over that table, so it is a declaration beside
// them rather than above them, and this script is the only thing keeping the
// two in step.
//
// **What it proves,** in both directions and for both packages:
//
//   1. Every variable the backend reads appears in `apps/backend/.env.example`,
//      and nothing appears there that nothing reads.
//   2. The default each variable documents is the default the code uses. This
//      is the half a grep cannot do, and the half that rots first — a default
//      changed in `config.ts` leaves a plausible wrong number in the example.
//   3. Every name in `apps/frontend/.env.example` carries the `VITE_` prefix
//      from `envPrefix` in `vite.config.ts`. A non-prefixed name there is not a
//      secret leak — Task 1.6.6 measured that the read compiles to `void 0` —
//      it is a variable that will silently never arrive, which is the more
//      likely mistake and the harder one to debug.
//
// **What it does not prove:** that the placeholder values are safe, or that a
// real secret is not sitting in the example. Nothing cheap can — a plausible
// placeholder and a real key are the same shape. `.gitignore` covers `.env` and
// `!.env.example` covers this file, so what protects the example is that it is
// reviewed like any other tracked file.
//
// It reads the backend's **built** output, because the table is TypeScript and
// this script is not. `pnpm verify` runs `build` first, so the file is there;
// run standalone on a clean tree it says so rather than throwing a resolver
// error.
//
// Dependency-free on purpose, like `check-stories.mjs` beside it: this
// workspace has no test runner until Story 1.9.

import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

// Resolved from this file rather than from the working directory, so the script
// gives the same answer from a package directory as it does from the root.
const REPO_ROOT = resolve(import.meta.dirname, "..");

const BACKEND_CONFIG = resolve(REPO_ROOT, "apps/backend/dist/config.js");
const BACKEND_EXAMPLE = resolve(REPO_ROOT, "apps/backend/.env.example");
const FRONTEND_EXAMPLE = resolve(REPO_ROOT, "apps/frontend/.env.example");

const FRONTEND_PREFIX = "VITE_";

/** @type {string[]} */
const problems = [];

/**
 * The `KEY=value` assignments in a `.env`-shaped file, ignoring comments and
 * blank lines. Deliberately not a full parser: Node's own loader handles
 * quoting and multi-line values, and this only needs the names and the plain
 * defaults the examples are written with.
 *
 * @param {string} source
 * @returns {Map<string, string>}
 */
function parseAssignments(source) {
  /** @type {Map<string, string>} */
  const assignments = new Map();

  for (const line of source.split("\n")) {
    const trimmed = line.trim();

    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const match = /^(?<key>[A-Za-z_][A-Za-z0-9_]*)=(?<value>.*)$/u.exec(
      trimmed,
    );

    if (match?.groups === undefined) {
      problems.push(`Unparseable line in an example file: ${trimmed}`);
      continue;
    }

    assignments.set(match.groups["key"] ?? "", match.groups["value"] ?? "");
  }

  return assignments;
}

/**
 * @param {string} path
 * @returns {Promise<string>}
 */
async function read(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    console.error(`Missing ${relative(REPO_ROOT, path)}.`);
    process.exit(1);
  }
}

// --- The backend: both directions, plus the defaults ---

/** @type {{ CONFIG_VARIABLES: readonly { key: string, required: boolean, default: string | undefined, description: string }[] }} */
let config;

try {
  config = await import(BACKEND_CONFIG);
} catch {
  console.error(
    `Cannot read ${relative(REPO_ROOT, BACKEND_CONFIG)} — run \`pnpm build\` first.`,
  );
  process.exit(1);
}

const declared = new Map(config.CONFIG_VARIABLES.map((v) => [v.key, v]));
const documented = parseAssignments(await read(BACKEND_EXAMPLE));

for (const [key, variable] of declared) {
  if (!documented.has(key)) {
    problems.push(
      `${key} is read by apps/backend but is not in apps/backend/.env.example.`,
    );
    continue;
  }

  // Only optional variables carry their default as the example value. A
  // required one has no default to compare against and its placeholder is
  // whatever reads as obviously fake.
  const expected = variable.default;
  const actual = documented.get(key);

  if (!variable.required && expected !== undefined && actual !== expected) {
    problems.push(
      `${key} defaults to ${JSON.stringify(expected)} in config.ts but apps/backend/.env.example says ${JSON.stringify(actual)}.`,
    );
  }
}

for (const key of documented.keys()) {
  if (!declared.has(key)) {
    problems.push(
      `${key} is in apps/backend/.env.example but nothing in apps/backend reads it.`,
    );
  }
}

// --- The frontend: the prefix, which is the whole boundary ---

for (const key of parseAssignments(await read(FRONTEND_EXAMPLE)).keys()) {
  if (!key.startsWith(FRONTEND_PREFIX)) {
    problems.push(
      `${key} is in apps/frontend/.env.example without the ${FRONTEND_PREFIX} prefix, so it would never reach the browser — the read compiles to \`void 0\`. Prefix it, or move it to apps/backend/.env.example.`,
    );
  }
}

if (problems.length > 0) {
  console.error("Configuration examples are out of step:\n");

  for (const problem of problems) {
    console.error(`  ✗ ${problem}`);
  }

  console.error("");
  process.exit(1);
}

console.log(
  `${String(declared.size)} backend variables documented, frontend example clean.`,
);
