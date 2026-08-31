# Task 1.6.2 — The backend configuration module

**Status:** Complete — 2026-08-31
**Story:** [1.6 Configuration & Environment Handling](STORY.md)
**Depends on:** Task 1.6.1

## Objective

One place on the backend that reads the environment, validates it against a declared schema and hands the rest of the application typed settings — replacing the inline reads in `index.ts` without losing anything they already do.

## What Task 1.6.1 hands this task

**There is no schema library.** The decision was measured and closed on 2026-08-31 — Zod and Valibot were both spiked to parity and rejected — so "validates it against a declared schema" below means a declared set of readers, not a library. Four things came out of that spike that this task should take rather than rediscover:

- **The three reader signatures.** `readString(env, key, fallback)`, `readInt(env, key, fallback, min, max)` and `readEnum(env, key, allowed)`, over a `Record<string, string | undefined>` passed in rather than reaching for `process.env` inside — which is what makes the module testable in Story 1.9 without touching the process
- **Blank means absent, and this is the finding neither library got right.** `PORT=` is the commonest shape in a `.env` file and Task 1.6.3 is about to write one. `Number("")` is `0`, so a blank port that is not treated as absent starts the server on a random free port and says nothing about it
- **The accumulator is about eleven lines**, and it is the only thing the libraries were doing that the current code does not: catch each reader's `ConfigError`, collect the messages, throw once with all of them joined by newlines. That is the "report every invalid key" bullet below, already sized
- **Declare the interface; do not infer it.** `exactOptionalPropertyTypes` means an optional key is `?: T`, not `?: T | undefined`, so the config type is written by hand and the readers are built to fit it — spreading a conditional `...(value === undefined ? {} : { KEY: value })` for genuinely optional keys

## Work

- **Create `apps/backend/src/config.ts`** (one module, not a directory) exporting a typed settings object and the schema behind it. Nothing outside it may read `process.env` — that is the invariant the module exists to create, and it is worth stating in the file's own comment because it is the thing that decays first
- **Move `PORT` and `HOST` into it and keep all three behaviours Task 1.2.1 built.** The range check, `Number()` over `parseInt()`, and the fail-before-the-logger path that writes a plain stderr line and exits 1. `apps/backend/src/index.ts` says in its own opening comment that this story owns replacing it and why the inline version was correct at the time; that comment should be updated or removed rather than left describing a state that no longer exists
- **Improve on it in one specific way: report every invalid key, not the first.** Today the reads are sequential, so a bad `PORT` and a bad `HOST` are two runs to discover. A schema makes reporting both at once nearly free, and "names the offending key" reads better in the plural
- **Decide where validation happens and make it once.** Parse at module load and export the frozen result, or export a `loadConfig()` the entrypoint calls. The second is the one Story 1.9 will want — a module that throws on import is hostile to a test that wants to assert the throwing — and `buildServer()` already keeps process concerns out of the application for the same reason. Pick deliberately and write the reason down
- **Keep the entrypoint the only thing that exits.** `config.ts` throws a typed error; `index.ts` catches it, writes the plain stderr line and calls `process.exit(1)`. A configuration module that calls `process.exit` itself cannot be tested and cannot be reused
- **Decide whether the module exposes a machine-readable declaration of its variables, because Task 1.6.6 is about to ask.** With a schema library there is an object to walk when generating or checking `.env.example`; with readers there is not, unless the module is written to have one — a `CONFIG_VARIABLES` array of `{ key, required, default, description }` that both the readers and a documentation check consume, rather than a `.env.example` maintained by hand against a file nothing compares it to. It is a handful of lines here and it is the difference between 1.6.6 having a staleness answer and having a sentence apologising for not having one. Decide it deliberately: hand-maintained is defensible at six variables, and "we chose not to" is a finding as long as 1.6.6 inherits it rather than discovering it
- **Do not invent variables.** The application has `PORT` and `HOST` and nothing else today. Epic 2 brings Alpaca credentials and Epic 10 brings an LLM key; this task builds the mechanism they arrive into, not placeholder entries for them. An `.env.example` full of variables nothing reads is worse than none
- Update the health route only if it genuinely needs a setting — it reads `version` from `package.json` today and that is not configuration

## Done when

- No `process.env` read exists outside `apps/backend/src/config.ts`, verified by grep and stated in the Outcome
- A missing or invalid `PORT` still exits 1 before the logger exists, with a message naming the key and the value it was given — re-run the exact Task 1.2.6 checks (`PORT=nonsense`, `PORT=0`, `PORT=70000`, empty string) and quote the output
- Two simultaneously invalid variables produce two named errors in one run
- The dev loop's baseline is unchanged: edit to new listener still ~1.1s, of which the signal half is ~100–140 ms. A configuration module that costs measurable startup time is a finding
- `pnpm verify` exits 0

## Notes

This is the smallest task in the story if the previous one did its job. The whole content is a move plus one improvement; the temptation to build a settings framework for an application with two settings is the thing to resist.

## Outcome

**Done on 2026-08-31.** `apps/backend/src/config.ts` is the one place this application reads the environment, and it is the only file in the workspace containing `process.env` — 186 lines, most of them comment, no dependency added and nothing installed. `index.ts` lost 40 lines and kept the two things that are genuinely about the process: catching the error and exiting.

### The invariant, verified rather than asserted

```
$ grep -rn "process\.env" apps packages scripts --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=storybook-static
apps/backend/src/config.ts:153:  env: Record<string, string | undefined> = process.env,
```

One occurrence, in the module whose comment claims it. The default parameter is what makes that true: `loadConfig()` takes `env` so Story 1.9 can drive it with a plain object, and defaults it so no caller has to reach for the process to get the ordinary behaviour. Every other match in the tree is prose in a comment.

### The Task 1.2.6 checks, re-run against the built output

Byte-for-byte the same messages as before the move, plus two cases the original was never asked:

| Invocation               | Exit | stderr                                                                        |
| ------------------------ | ---- | ----------------------------------------------------------------------------- |
| `PORT=nonsense`          | 1    | `PORT must be an integer between 1 and 65535, received "nonsense"`            |
| `PORT=0`                 | 1    | `PORT must be an integer between 1 and 65535, received "0"`                   |
| `PORT=70000`             | 1    | `PORT must be an integer between 1 and 65535, received "70000"`               |
| `PORT=3000nonsense`      | 1    | `PORT must be an integer between 1 and 65535, received "3000nonsense"`        |
| `PORT=3.5`               | 1    | `PORT must be an integer between 1 and 65535, received "3.5"`                 |
| `PORT= HOST=`            | —    | `Server listening at http://127.0.0.1:3000`                                   |
| `PORT=8080 HOST=0.0.0.0` | —    | `Server listening at http://127.0.0.1:8080` **and** `http://172.20.10.2:8080` |

`3000nonsense` is `Number()` earning its comment — `parseInt` would have started the server on 3000. `3.5` is the `Number.isInteger` half. The blank pair is Task 1.6.1's deciding finding still holding after the move: `PORT=` is the default, not port 0. And the last row is the reminder from CLAUDE.md that Fastify rewrites `0.0.0.0` to `127.0.0.1` in its own log line — the second address is what proves the bind, and the socket is the thing to check.

### Two invalid variables, one run

This is the only thing the module does that the code it replaces did not. It cannot be demonstrated with the shipped variables, because `PORT` is the only one that can be invalid — `HOST` is any non-blank string. So it was demonstrated with a temporary second `readInt` call, reverted immediately afterwards:

```
$ PORT=nonsense TEMP_PROBE=99 node dist/index.js
PORT must be an integer between 1 and 65535, received "nonsense"
TEMP_PROBE must be an integer between 1 and 10, received "99"
$ echo $?
1
```

Both keys named, one run, exit 1. The accumulator is eleven lines exactly as Task 1.6.1 sized it. The one thing worth recording about writing it: the obvious shape needs a non-null assertion on the success path, which `strictTypeChecked` forbids, so the readers return `T | undefined` and the throw condition carries two undefined checks that are dead at runtime and are what narrow the types. Redundant-looking code that the compiler requires, and it is commented as such — the alternative is a fallback value handed to the accumulator that would be a plausible-looking lie in a config object that should never have been returned.

### The decisions this task was asked to take

**Validation happens on call, not on import.** `loadConfig()` is a function the entrypoint calls; the module has no side effects. A module that throws on import cannot be tested by anything that wants to assert the throwing, which is precisely what Story 1.9 will want, and it is the same reason `buildServer()` keeps process concerns out of the application. The frozen result is the caller's to hold.

**`config.ts` throws, `index.ts` exits.** `ConfigError` is exported so the entrypoint can tell an operator mistake from a bug: the first gets a plain stderr line, anything else falls through as itself. Nothing in `config.ts` calls `process.exit`.

**Yes to a machine-readable declaration.** `CONFIG_VARIABLES` is exported as an array of `{ key, required, default, description }` — two entries and about twelve lines. Task 1.6.6 now has something to walk, so `.env.example` gets a real staleness check rather than a sentence apologising for not having one. What it deliberately is **not** is the readers' source of truth: making `loadConfig` loop over the table would trade two checked call sites for a generic executor, which is the settings framework this story exists to resist. The cost is that the table and the readers are two lists, kept in step by being two dozen lines apart on one screen, and by the check 1.6.6 writes.

**No `readEnum`.** Task 1.6.1 handed over three reader signatures and this task built two. Nothing here has an enum variable — `LOG_LEVEL` is Story 1.7's and `NODE_ENV`/`APP_ENV` is the next task's — and a reader with no caller is scaffolding ahead of the task that wants it. `TASK-03` has been amended to build it when it brings the first enum, with the message shape stated so it does not get invented twice.

**No variables invented.** `PORT` and `HOST`, as before. Epic 2's Alpaca credentials and Epic 10's model key arrive into this mechanism; they do not get placeholder entries now.

**The health route was not touched.** It reads `version` from the package manifest, which is build metadata rather than configuration.

### Startup cost: none, measured both ways

Process start to the `Server listening` line, ten runs each, the same tree with `index.ts` at HEAD and with the module in place:

| Build             | min   | median    | max    |
| ----------------- | ----- | --------- | ------ |
| Before (inline)   | 75 ms | **77 ms** | 105 ms |
| After (config.ts) | 74 ms | **76 ms** | 117 ms |

One millisecond of median, inside the run-to-run spread. That is the expected result rather than a lucky one — Task 1.6.1 measured the hand-rolled reader's import cost at 0 ms because it imports nothing, and this module still imports nothing but `node:process`. The Zod row of that table was 19 ms, which is the number this would have been paying on every start and every dev-loop restart.

The signal half is untouched and stays untouched: `SIGTERM` to the built server exits 0 in **2 ms** over five runs. That is the bare process; CLAUDE.md's ~100–140 ms figure is the same drain measured inside `node --watch`, and nothing in this task is on that path.

### `pnpm verify`

Exit 0 — build, lint, `format:check`, `stories` (6 components, 6 stories files), `test`. No new dependency, so no lockfile change and `allowBuilds` did not come into it.
