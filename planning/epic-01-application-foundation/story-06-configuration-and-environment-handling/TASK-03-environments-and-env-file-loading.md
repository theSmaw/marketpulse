# Task 1.6.3 — Environments, and how a `.env` file is loaded

**Status:** Not started
**Story:** [1.6 Configuration & Environment Handling](STORY.md)
**Depends on:** Task 1.6.2

## Objective

Answer "distinct configuration for development, test and production" on the backend, and decide how a `.env` file reaches the process — both from nothing, because neither exists today.

## Work

- **Start from the measured fact that `NODE_ENV` is read nowhere.** Task 1.2.5 ran the built server with `NODE_ENV=production` and nothing about its behaviour or its logs differed. So this is a decision, not an alignment, and the first question is whether the application needs an environment concept at all yet or only a way to load different values. Recording "one variable, three files, no branching" as the answer is a legitimate outcome; inventing an `isProduction` flag that nothing branches on is not
- **If there is an environment concept, name the variable deliberately.** `NODE_ENV` is understood by tooling (bundlers, some libraries) and carries meanings the application does not control; a separate `APP_ENV` is the alternative and its cost is a second thing to set. Whichever wins, it is validated as an enum against a fixed list, and an unknown value fails at startup rather than falling through to a default. **Task 1.6.2 deliberately did not build a `readEnum`** — it built `readString` and `readInt`, because those are the two the existing variables need and an unused reader is scaffolding ahead of the task that wants it. This is that task: `readEnum(env, key, allowed)` belongs in `config.ts` beside the other two, its message follows the same `KEY must be one of a, b, c, received "x"` shape, and its variable joins `CONFIG_VARIABLES`. Task 1.6.1 closed the validation decision as **no schema library**, so "the schema" throughout this story means that declared set of readers
- **Decide the `.env` loader, and check Node 24 first.** `node --env-file=.env` is built in and needs no dependency; `dotenv` is the reflex and would be a new package. The built-in has real limits worth measuring rather than assuming — behaviour on a missing file, quoting, multiline values, and whether it overrides an already-set variable. Whatever is chosen has to work in three places that are not the same: `pnpm --filter @marketpulse/backend dev` (which is `scripts/dev.sh`, the one file `pnpm verify` does not check), `start` on built output, and the future container in Story 1.11 where there is no file at all and everything comes from the environment
- **Test `KEY=` with an empty value against the loader, not just a missing key.** Task 1.6.1 measured this as the finding that decided the validation approach: `Number("")` is `0`, so a blank `PORT` that is not treated as absent binds a random free port silently. A `.env` file is exactly where blank entries come from — a commented-out value, a placeholder someone did not fill in, a line copied from `.env.example`. Confirm the loader sets an empty string rather than leaving the key unset (they are different things to `process.env`), and confirm Task 1.6.2's readers fall back to the default for it. This is one line of evidence and it is the interaction between this task and the previous one
- **Note what Task 1.6.2 removed from this decision: there is no import-order race to lose.** Validation happens when `index.ts` calls `loadConfig()`, not when `config.ts` is imported, so a loader only has to run before that call rather than before a module graph settles. That is the trap a `dotenv`-style loader classically sets — an import hoisted above the one that reads the values, failing only for whoever adds the third import — and it does not exist here. It is a reason to weigh the two loaders on their own merits rather than on ordering safety, and a reason not to undo the on-call decision for convenience
- **State the precedence rule and prove it.** A real environment variable beating a `.env` file is the conventional order and the one a container depends on. Test it both ways round rather than reading the documentation
- **Do not commit a `.env`.** The file is gitignored already; the documented example is Task 1.6.6's, and splitting the two apart is deliberate so the example describes a finished set rather than being edited five times
- **Say what test configuration means when there are no tests.** Story 1.9 picks the runner and does not exist yet, so this task can name the environment and leave the values to it — but the mechanism must not assume a `.env.test` file that nothing loads. Write down what Story 1.9 inherits, in its STORY.md as well as here

## Done when

- The three environments are distinguishable, or the reason they deliberately are not yet is recorded with what would change that
- A `.env` file in the backend package is loaded by both `dev` and `start`, and the loader is the same in both — a difference here is a bug that only appears in production
- Precedence between a real environment variable and a file entry is measured and stated
- Running with no `.env` file at all still starts on defaults, because that is what a fresh clone does and Story 1.8 depends on it
- `pnpm verify` exits 0

## Notes

`scripts/dev.sh` is the second consumer of whatever is decided here, and it is unchecked by every tool in `verify` — ESLint sees only JS and TS, Prettier has no shell parser, tsc has no view of it. A loader change that touches that file is exactly the change nothing catches, so run the dev loop by hand before calling this done.
