# Task 1.6.1 — Choose the validation approach

**Status:** Complete — 2026-08-31
**Story:** [1.6 Configuration & Environment Handling](STORY.md)
**Depends on:** Story 1.5 (complete)

## Objective

Settle this story's one genuinely open decision — schema library or hand-rolled — from a measurement rather than from reputation, and do it before any configuration module exists to be rewritten.

## Work

- **Start from what already works, because the bar is not "typed".** `apps/backend/src/index.ts` reads `PORT` and `HOST` with about forty lines of hand-rolled code, and Task 1.2.1 got three things right in it that a schema must not regress: a range check that rejects anything that is not an integer in 1–65535, `Number()` rather than `parseInt()` so `"3000nonsense"` is not silently accepted as 3000, and a failure path that runs **before the logger exists** and writes `PORT must be an integer between 1 and 65535, received "nonsense"` to stderr as a plain line. Reproduce that message quality with each candidate and quote the actual output; a library whose default error is `Expected number, received nan` at path `PORT` is a regression wearing a schema
- **Candidates, and the null option is real.** Zod is the default assumption; Valibot is the serious alternative and its pitch is bundle size; a third option is **no library at all** — a `readString`/`readInt`/`readEnum` trio in one file, which is what exists today generalised. With six or so variables in the whole application there is a real question whether a dependency earns its place, and Task 1.4.3 already rejected a generated token pipeline on exactly that reasoning. Whatever wins, the losing options and their reasons go in the Outcome
- **Measure the bundle cost, and measure it in the place it can hurt.** The backend does not ship bytes to anyone, so its cost is install size and nothing else. The frontend does: this application is 265 modules and 342.08 kB (Task 1.5.6's baseline). If the chosen library is intended to validate the frontend's environment too, build with it and record the delta before adopting it. A validator that is only ever used on the server should be a dependency of `apps/backend` only, and the house rule makes that automatic — "does the package's source `import` it?"
- **Check it against this toolchain rather than its README.** `strictTypeChecked` plus `stylisticTypeChecked` with `--max-warnings 0`, `verbatimModuleSyntax`, `isolatedModules`, `module: nodenext` and `exactOptionalPropertyTypes`. The last one is the interesting one: a schema producing `{ host?: string }` from an optional field is a different type from `{ host: string | undefined }`, and Task 1.4.5 already found that distinction breaks the obvious code. Write one schema with an optional value and a default and confirm the inferred type is usable, rather than assuming inference works
- **Check the peer and engine ranges before installing.** TypeScript is pinned at 6.0.3 because typescript-eslint caps at `<6.1.0`; Node is 24.20.0 with `engineStrict` on. A candidate ruled out by a range is a finding, not a silent switch to the other one
- **Decide where the types live, and default to "not `packages/shared`".** Configuration types belong in `packages/shared` only if both apps genuinely import them, and today the two halves share no variable at all — the backend's `PORT` is meaningless in a browser. Putting them there anyway buys a rebuild ordering constraint for nothing. If a shared type does turn out to be needed, that is a finding to record, not a default to take
- Install the winner into the package or packages that import it and leave the tree passing `pnpm verify` **with no configuration module yet**. The module is Task 1.6.2's

## Done when

- The decision is closed with its measurements, the rejected options and the reason each lost
- The error-message comparison is recorded as literal output from each candidate, against the existing hand-rolled message as the baseline
- The reversal trigger is stated: what would make this the wrong choice, and what it would cost to change once Epic 2's Alpaca credentials and Epic 10's LLM credentials are in the schema
- Any new dependency sits in the package that imports it, not at the root — a validator is imported by application code, so the root-only tooling rule does not apply, and the Outcome should say so explicitly because it is the rule most likely to be misapplied here
- `pnpm verify` exits 0, and the frontend artefact is re-measured if anything reached it

## Notes

Task 1.5.1's shape is the model: spike, measure, throw the spike away, install once. Keep it small — this is a decision about six variables, and the cost of getting it wrong is one file.

## Outcome

**Done on 2026-08-31. The null option won: there is no schema library, and configuration stays hand-rolled — the three readers this task spiked, generalised from what `apps/backend/src/index.ts` already does.** Nothing was installed and no source file changed. Zod 4.5.4 and Valibot 1.4.2 were both spiked to full parity with the existing behaviour, measured, and thrown away.

This is a decision about six variables. It was still measured, because "add Zod" is the reflex and the reflex turns out to be wrong here for a reason that is specific to environment variables rather than to schemas in general.

### The toolchain admitted everything, again

| Candidate       | Engines | Peers                              | Install script | Verdict  |
| --------------- | ------- | ---------------------------------- | -------------- | -------- |
| `zod@4.5.4`     | none    | none                               | none           | Admitted |
| `valibot@1.4.2` | none    | `typescript >=5`, `optional: true` | none           | Admitted |
| Hand-rolled     | —       | —                                  | —              | Admitted |

Neither library declares an `engines` field or a TypeScript ceiling, so the 6.0.3 pin and Node 24.20.0 rule out nothing. **`allowBuilds` would not have fired either** — neither package has a `preinstall`/`install`/`postinstall` script, so `esbuild@0.28.2` remains the only one in the tree. As in Task 1.5.1, nothing was narrowed by a range and the decision had to be made on measurements.

### The error messages, as literal output

The baseline is what the tree already prints. Each candidate was written first the way its documentation reads, then a second time to reach parity.

`PORT=nonsense`:

| Source                   | Output                                                             |
| ------------------------ | ------------------------------------------------------------------ |
| **Existing hand-rolled** | `PORT must be an integer between 1 and 65535, received "nonsense"` |
| Zod, idiomatic           | `PORT: Invalid input: expected number, received NaN`               |
| Valibot, idiomatic       | `PORT: Invalid type: Expected number but received NaN`             |

`PORT=99999`:

| Source                   | Output                                                          |
| ------------------------ | --------------------------------------------------------------- |
| **Existing hand-rolled** | `PORT must be an integer between 1 and 65535, received "99999"` |
| Zod, idiomatic           | `PORT: Too big: expected number to be <=65535`                  |
| Valibot, idiomatic       | `PORT: Invalid value: Expected <=65535 but received 99999`      |

Both libraries lose the value the operator actually typed and replace it with `NaN` — which is the one thing the person reading the line already knows, and not the thing they need. **`z.coerce.number()` is where it goes:** the coercion happens before validation, so by the time an issue is raised the original string is gone. Zod's raw `error.message` is worse than the per-issue form above, because it is a pretty-printed JSON array of issue objects rather than a line:

```
[
  {
    "expected": "number",
    "code": "invalid_type",
    "received": "NaN",
    "path": [ "PORT" ],
    "message": "Invalid input: expected number, received NaN"
  }
]
```

That is a fine payload and a poor stderr line, and the fail-before-the-logger path is exactly a stderr line.

Both do report **every** bad key rather than the first — Zod by default, Valibot with `abortEarly: false` — which is the one place the libraries beat the code in the tree today. That is a property of the accumulator, not of the schema, and Task 1.6.2 now owes it: the hand-rolled spike below reproduces it in eleven lines.

### The finding that actually decided it: an empty variable is not an absent one

`PORT=` with no value is the commonest shape in a `.env` file, and Task 1.6.3 is about to write one. The existing code treats blank as absent and falls back to the default. Both libraries treat it as present:

```
env PORT= HOST=
  hand-rolled  {"PORT":3000,"HOST":"127.0.0.1"}
  zod          PORT: Too small: expected number to be >=1
               HOST: Too small: expected string to have >=1 characters
  valibot      PORT: Invalid value: Expected >=1 but received 0
               HOST: Invalid length: Expected >=1 but received 0
```

`Number("")` is `0`, so with `z.coerce` a blank `PORT` is not even a type error — it is **port 0**, which is a real value meaning "any free port". Without the range check it would have started the server on a random port and said nothing. Neither library is wrong here; a schema over `process.env` is a schema over a record whose values are always strings, and "" is a string. It is just that the correct behaviour for an environment variable has to be written by hand either way.

### Parity is reachable, and reaching it is the whole argument

Both were rewritten until they matched the baseline exactly — blank means absent, and every message names the variable and quotes the value:

```
zod-parity / valibot-parity, PORT=nonsense LOG_LEVEL=chatty
  PORT must be an integer between 1 and 65535, received "nonsense"
  LOG_LEVEL must be one of fatal, error, warn, info, debug, received "chatty"
```

In Zod that is a `z.preprocess` mapping blank to `undefined`, a `.refine` doing the integer-and-range check by hand, a `.transform(Number)`, and an `error:` callback per key reading `issue.input`. In Valibot it is the same shape with one extra structural constraint worth recording: **`v.optional()` has to be the outermost schema for a key**, so a preprocess step cannot be piped in front of it — wrapping it in `v.pipe(v.unknown(), …)` makes the key required and every default fails with `Invalid key: Expected "PORT" but received undefined`. The blank handling has to move inside the pipe instead.

Non-blank, non-comment lines for the same three variables including their own error reporting:

| Implementation    | Lines |
| ----------------- | ----- |
| Valibot at parity | 44    |
| Zod at parity     | 48    |
| Hand-rolled       | 84    |

The hand-rolled version is ~36 lines longer, and those 36 lines are `readString`, `readInt`, `readEnum` and the accumulator — reusable across every variable Epic 2 and Epic 10 add, where the library versions' custom `refine`/`check` and `error` callbacks are **per key**. At six variables the gap is 36 lines; the direction it moves in as variables are added is the opposite of the one the line count suggests, because the additions are strings and a string reader already exists.

Once the checks are written by hand, what the library still contributes is walking the object and collecting issues. That is the eleven-line accumulator.

### `exactOptionalPropertyTypes`: both libraries fail the same way, and it is not a tiebreak

The inferred type is usable on its own — `z.infer` and `v.InferOutput` both compile clean under `strictTypeChecked` + `stylisticTypeChecked`, `verbatimModuleSyntax`, `isolatedModules`, `nodenext` and `exactOptionalPropertyTypes`. What does not compile is assigning it to a hand-written interface:

```
error TS2375: Type '{ … LOG_LEVEL?: "fatal" | … | undefined; }' is not assignable
              to type 'Config' with 'exactOptionalPropertyTypes: true'.
```

Both produce `?: T | undefined` for an optional field, where an interface written by hand declares `?: T`. Identical for Zod and Valibot, so it separates neither — but it is the fourth appearance of this option changing what the obvious code means (after Task 1.4.5's permutation grids and Task 1.5.2's `NavLink` className), and it means "declare the interface, infer nothing" is the shape that works. The hand-rolled reader writes the interface and controls the shape exactly; a schema-first module would have to export the inferred type and let it propagate.

### The cost of each, measured

Startup, 20 runs of a built script under `env -i`, and the in-process import alone:

| Implementation | Process, mean | Import cost |
| -------------- | ------------- | ----------- |
| Hand-rolled    | 28 ms         | 0 ms        |
| Valibot        | 29 ms         | 2.2 ms      |
| Zod            | 48 ms         | 19.0 ms     |

Zod adds ~19 ms to every server start. Against the dev loop's ~1.1 s edit-to-new-listener baseline that is under 2% and would not be noticed; it is recorded because it is the only number here that favours the libraries by less than an order of magnitude. Installed sizes are 7.7 MB for Zod and 1.8 MB for Valibot against 0.

**And the frontend, which is where it can actually hurt.** The baseline reproduced first — 265 modules, 342,004 bytes of JavaScript, 9,825 bytes of CSS, three files. Then one module holding a single-variable schema over `import.meta.env`, imported from `main.tsx`, built and reverted:

| Build                          | Modules | JS        | JS gzip   | Δ JS          |
| ------------------------------ | ------- | --------- | --------- | ------------- |
| Baseline (Task 1.5.6)          | 265     | 342.00 kB | 111.95 kB | —             |
| + Valibot, one string variable | 267     | 345.14 kB | 113.14 kB | **+3.14 kB**  |
| + Zod, one string variable     | 360     | 416.88 kB | 132.76 kB | **+74.88 kB** |

**Zod costs +95 modules and +74.88 kB — 20.81 kB gzipped — for one optional string.** That is nearly twice what React Router cost this application, for a schema with one key. Valibot's modular design does what it claims: +2 modules and +1.19 kB gzipped. Neither figure is being spent, because nothing here validates on the frontend; they are recorded so that a later reflex to reuse a server-side validator in the browser is a decision with a number attached rather than a convenience.

Note the baseline is reported by Vite as 342.00 kB where Task 1.5.6 wrote 342.08 kB. The artefact is byte-identical at 342,004 bytes; the earlier figure was a transcription of a differently-rounded report. 265 modules, three files and 9.82 kB of CSS all reproduce exactly.

### Where the types live: not `packages/shared`

The two halves of this story share **no variable at all**. `PORT` and `HOST` are meaningless in a browser; `VITE_API_BASE_URL` is meaningless on the server. Putting a config type in `packages/shared` would buy a rebuild-ordering constraint for nothing, and the story's own note says as much. The backend's config type lives in `apps/backend`. If a genuinely shared value ever appears — a feature flag both sides read — that is a finding for the task that finds it, not a structure to build now.

The root-only tooling rule was checked and, in the event, did not have to be applied: **nothing was installed.** It is worth restating anyway because it is the rule most likely to be misapplied here, and the reversal below would trip it. A validator is `import`ed by application code, not invoked as a command, so it belongs in the package whose source imports it — the same reason `@types/node` sits in `apps/backend`. It would not go at the root beside ESLint and Prettier.

### Reversal triggers

- **A schema library arrives for something that is not configuration, and configuration is then cheaper inside it than outside.** Architectural invariant 2 requires `WorkspaceCommand` objects to be schema-validated, and Epic 11 is where that lands. That is structured JSON from a model, not six environment variables: the defaults are not blank strings, the values are not all strings, and the issue list is a payload rather than a stderr line — every argument above points the other way there. If Zod is adopted for that, moving configuration into it is a small and reasonable follow-on, and this decision should not be treated as having pre-committed anything
- **The variable count stops being small.** Six is not a schema. Thirty interdependent ones, with cross-field rules like "if `REPLAY_MODE` then `REPLAY_CLOCK_SOURCE` is required", is the point where an accumulator of independent readers stops being the right shape
- **A parse is needed somewhere other than startup** — a config endpoint, a request body, a provider response — at which point the object walk is worth paying for

Cost of reversing: one file. `apps/backend/src/config.ts` does not exist yet and is Task 1.6.2's to write; nothing outside it will read `process.env`, which is what keeps this reversible. Epic 2's Alpaca credentials and Epic 10's LLM credentials add keys to that one module and to `.env.example`, and both are required non-empty strings — the easiest case for either approach and the one where the hand-rolled reader is already written.

### Left behind

Nothing. No dependency was added, no source file changed, `pnpm-workspace.yaml` was not touched and the lockfile is unchanged. The frontend artefact is byte-identical to the baseline after the measurement was reverted — same `index-DUP5HHpy.js`, 342,004 bytes — and `pnpm verify` exits 0 in **9.6s**. What this task produces is the decision, the numbers behind it, and the three reader signatures Task 1.6.2 will write for real.
