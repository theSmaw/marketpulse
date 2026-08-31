# Task 1.6.2 — The backend configuration module

**Status:** Not started
**Story:** [1.6 Configuration & Environment Handling](STORY.md)
**Depends on:** Task 1.6.1

## Objective

One place on the backend that reads the environment, validates it against a declared schema and hands the rest of the application typed settings — replacing the inline reads in `index.ts` without losing anything they already do.

## Work

- **Create `apps/backend/src/config.ts`** (one module, not a directory) exporting a typed settings object and the schema behind it. Nothing outside it may read `process.env` — that is the invariant the module exists to create, and it is worth stating in the file's own comment because it is the thing that decays first
- **Move `PORT` and `HOST` into it and keep all three behaviours Task 1.2.1 built.** The range check, `Number()` over `parseInt()`, and the fail-before-the-logger path that writes a plain stderr line and exits 1. `apps/backend/src/index.ts` says in its own opening comment that this story owns replacing it and why the inline version was correct at the time; that comment should be updated or removed rather than left describing a state that no longer exists
- **Improve on it in one specific way: report every invalid key, not the first.** Today the reads are sequential, so a bad `PORT` and a bad `HOST` are two runs to discover. A schema makes reporting both at once nearly free, and "names the offending key" reads better in the plural
- **Decide where validation happens and make it once.** Parse at module load and export the frozen result, or export a `loadConfig()` the entrypoint calls. The second is the one Story 1.9 will want — a module that throws on import is hostile to a test that wants to assert the throwing — and `buildServer()` already keeps process concerns out of the application for the same reason. Pick deliberately and write the reason down
- **Keep the entrypoint the only thing that exits.** `config.ts` throws a typed error; `index.ts` catches it, writes the plain stderr line and calls `process.exit(1)`. A configuration module that calls `process.exit` itself cannot be tested and cannot be reused
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
