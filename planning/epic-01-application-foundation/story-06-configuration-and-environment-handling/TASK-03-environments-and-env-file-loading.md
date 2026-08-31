# Task 1.6.3 — Environments, and how a `.env` file is loaded

**Status:** Complete — 2026-08-31
**Story:** [1.6 Configuration & Environment Handling](STORY.md)
**Depends on:** Task 1.6.2

## Objective

Answer "distinct configuration for development, test and production" on the backend, and decide how a `.env` file reaches the process — both from nothing, because neither exists today.

## Work

- **Start from the measured fact that `NODE_ENV` is read nowhere.** Task 1.2.5 ran the built server with `NODE_ENV=production` and nothing about its behaviour or its logs differed. So this is a decision, not an alignment, and the first question is whether the application needs an environment concept at all yet or only a way to load different values. Recording "one variable, three files, no branching" as the answer is a legitimate outcome; inventing an `isProduction` flag that nothing branches on is not
- **If there is an environment concept, name the variable deliberately.** `NODE_ENV` is understood by tooling (bundlers, some libraries) and carries meanings the application does not control; a separate `APP_ENV` is the alternative and its cost is a second thing to set. Whichever wins, it is validated as an enum against a fixed list, and an unknown value fails at startup rather than falling through to a default. **Task 1.6.2 deliberately did not build a `readEnum`** — it built `readString` and `readInt`, because those are the two the existing variables need and an unused reader is scaffolding ahead of the task that wants it. This is that task: `readEnum(env, key, allowed)` belongs in `config.ts` beside the other two, its message follows the same `KEY must be one of a, b, c, received "x"` shape, and its variable joins `CONFIG_VARIABLES`. Task 1.6.1 closed the validation decision as **no schema library**, so "the schema" throughout this story means that declared set of readers
- **Decide the `.env` loader, and check Node 24 first.** `node --env-file=.env` is built in and needs no dependency; `dotenv` is the reflex and would be a new package. The built-in has real limits worth measuring rather than assuming — behaviour on a missing file, quoting, multiline values, and whether it overrides an already-set variable. Whatever is chosen has to work in three places that are not the same: `pnpm --filter @marketpulse/backend dev` (which is `scripts/dev.sh`, the one file `pnpm verify` does not check), `start` on built output, and the future container in Story 1.11 where there is no file at all and everything comes from the environment
- **Test `KEY=` with an empty value against the loader, not just a missing key.** Task 1.6.1 measured this as the finding that decided the validation approach: `Number("")` is `0`, so a blank `PORT` that is not treated as absent binds a random free port silently. A `.env` file is exactly where blank entries come from — a commented-out value, a placeholder someone did not fill in, a line copied from `.env.example`. Confirm the loader sets an empty string rather than leaving the key unset (they are different things to `process.env`), and confirm Task 1.6.2's readers fall back to the default for it. This is one line of evidence and it is the interaction between this task and the previous one
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

## Outcome

**Done on 2026-08-31.** One function — `loadEnvFile()` in `apps/backend/src/config.ts` — and one call in `index.ts`. No dependency, no new variable, no change to `scripts/dev.sh`, and no `.env` committed. Everything else this task produced is measurement.

### The environment concept: there is not one, deliberately

`NODE_ENV` is still read nowhere and no `APP_ENV` was invented. The reason is the one this task's own Work section named as a legitimate outcome: **nothing branches.** A variable naming the environment would have had no reader, and the `isProduction` flag it leads to is the thing that outlives the guess.

What the three environments actually differ in is where the **values** come from, and that needs no code path to know about it:

| Environment | Where values come from                   | Mechanism                  |
| ----------- | ---------------------------------------- | -------------------------- |
| development | `apps/backend/.env`, gitignored          | `loadEnvFile()`            |
| test        | the runner's own process (Story 1.9)     | real environment variables |
| production  | the container's environment (Story 1.11) | real environment variables |

One precedence rule spans all three, and it is measured below rather than read from the documentation. The reversal trigger is the first thing that has to **behave** differently rather than be **configured** differently — Story 1.7's log format is the likeliest candidate, and it is written into that story's STORY.md along with `readEnum`, which stays unbuilt for the same reason Task 1.6.2 left it unbuilt: `readString` and `readInt` have callers and a third reader does not.

### The loader: `process.loadEnvFile()`, not `--env-file`

Node 24.20.0 offers three routes and two of them were rejected on measurements:

| Route                        | Missing file                                          | In `NODE_OPTIONS` | Call sites   |
| ---------------------------- | ----------------------------------------------------- | ----------------- | ------------ |
| `node --env-file=.env`       | `node: .env: not found`, **exit 9**, no app code runs | rejected outright | 2            |
| `node --env-file-if-exists=` | warns on stderr every start, continues                | rejected outright | 2            |
| `process.loadEnvFile(path)`  | throws `ENOENT`, which the caller can decide about    | n/a               | **1**        |
| `dotenv`                     | —                                                     | —                 | a dependency |

The flag would not survive a fresh clone: a clone has no `.env`, so `--env-file` is exit 9 before anything runs. `--env-file-if-exists` fixes that and prints `.env not found. Continuing without it.` to stderr on every ordinary start instead.

But the deciding argument is the **call-site count**, and it is the one this task was warned about: a flag has to be repeated at every invocation, and there are two here — `start` in `package.json`, and `node --watch dist/index.js` inside `scripts/dev.sh`, which is the one file `pnpm verify` checks with nothing. Two copies of a loader is exactly the "works in dev, differs in production" bug the Done-when bullet is guarding against, and `NODE_OPTIONS` cannot hold the difference down either:

```
$ NODE_OPTIONS="--env-file=.env" node -e 'console.log(1)'
node: --env-file= is not allowed in NODE_OPTIONS
```

In-process there is one call site, and the two entrypoints cannot disagree because there is nothing for them to disagree about. `scripts/dev.sh` was not touched, which is the best available outcome for a file nothing checks.

`dotenv` was not spiked, because the built-in is the same parser Node's own flag uses and reaches parity without a dependency — verified for quoting, single quotes, multi-line double-quoted values, trailing `#` comments, whitespace around `=`, and a leading `export`.

### Where the file lives, and why it is not the cwd

`import.meta.dirname` + `..`, so `apps/backend/.env` — beside `package.json`, not in the current working directory. That is a deliberate divergence from Node's own default and from dotenv's.

Both entrypoints already run with the package as their cwd, so the two agree today by **coincidence**; resolving from the module makes them agree by **construction**, and it survives the case the coincidence does not:

```
$ node apps/backend/dist/index.js      # from the repository ROOT, which has no .env
Server listening at http://127.0.0.1:4030
$ pnpm --filter @marketpulse/backend start
Server listening at http://127.0.0.1:4030
```

It also stays correct under `pnpm deploy --filter` (Story 1.11), which copies `dist/` and `package.json` into one directory together.

### Precedence, measured both ways round

A real environment variable beats a file entry. Tested rather than read:

| `.env`      | shell       | Listening on |
| ----------- | ----------- | ------------ |
| `PORT=4010` | —           | 4010         |
| `PORT=4010` | `PORT=4020` | **4020**     |

That is the conventional order and the one a container depends on. It is also why nothing in this task special-cases production: the container simply has no file, and would win anyway if it did.

### `KEY=` in a file, which is the interaction with Task 1.6.2

The loader sets an empty string; it does not leave the key unset. Those are different things to `process.env`, and the difference is what Task 1.6.1's whole validation decision turned on.

```
$ node -e 'process.loadEnvFile(".env"); console.log(JSON.stringify(process.env.PORT))'
""
```

With `PORT=` and `HOST=` in the file, the server starts on `http://127.0.0.1:3000` — the defaults. Task 1.6.2's `present()` treats blank as absent, and this is the case it was written for: a placeholder nobody filled in, a line copied out of the `.env.example` Task 1.6.6 is about to write. Without it, `Number("")` is `0` and the server binds a random free port in silence.

A bad value in a file still fails the same way a bad value in the environment does, naming both the key and what it was given:

```
$ printf 'PORT=nonsense\n' > apps/backend/.env && node apps/backend/dist/index.js
PORT must be an integer between 1 and 65535, received "nonsense"
$ echo $?
1
```

### No `.env` file at all still starts on defaults

```
$ ls apps/backend/.env
ls: .env: No such file or directory
$ node apps/backend/dist/index.js
Server listening at http://127.0.0.1:3000
```

Silently — the `ENOENT` is swallowed because a missing file is the ordinary case in two of the three environments above, not an error. That is Story 1.8's criterion and it is why `--env-file-if-exists`'s stderr line was not good enough either.

`.gitignore` was verified rather than assumed, at the new location:

```
$ git check-ignore -v apps/backend/.env
.gitignore:15:.env	apps/backend/.env
$ git check-ignore -v apps/backend/.env.example    # exit 1 — the negation works
```

### The dev loop, run by hand

Required by this task's Notes, because `scripts/dev.sh` is unchecked by every tool in `verify`. With `PORT=4040` in `apps/backend/.env`, `sh scripts/dev.sh` reports `Server listening at http://127.0.0.1:4040`, an edit rebuilds and restarts as before, and Ctrl-C leaves no surviving `node` or `tsc` process. The file itself was not modified, which is the point.

### Startup cost: below the noise floor

Twenty runs per cell, two interleaved rounds, process start to the `Server listening` line:

| Round | No `.env`            | `.env` with two keys |
| ----- | -------------------- | -------------------- |
| 1     | 74 / **76** / 82 ms  | 76 / **87** / 203 ms |
| 2     | 78 / **84** / 114 ms | 78 / **83** / 100 ms |

The ordering reverses between rounds and the minimum is 74–78 ms in all four cells, so reading and parsing a two-line file does not show above run-to-run variance. Task 1.6.2's baseline was a 76 ms median and it is unchanged.

### `pnpm verify`

Exit 0. No dependency added, so no lockfile change and `allowBuilds` did not come into it.
