# Task 1.6.6 — `.env.example` and the secrets boundary

**Status:** Complete — 2026-08-31
**Story:** [1.6 Configuration & Environment Handling](STORY.md)
**Depends on:** Task 1.6.5

## Objective

Document every variable the application reads, and verify — rather than assume — that a real secret cannot be committed or shipped to a browser.

## Work

- **Write `.env.example` from the configuration module, not from memory.** Every variable, with a description, whether it is required, its default if it has one, and a safe placeholder value. **There is no schema object to reflect over** — Task 1.6.1 closed that decision as no schema library — so whether this file can be generated or checked depended on whether Task 1.6.2 gave the module a declaration list. **It did:** `CONFIG_VARIABLES` in `apps/backend/src/config.ts` is an array of `{ key, required, default, description }`, exported for exactly this. So walk it and make the check real. Note what it deliberately is not — the readers do not loop over it, so it is a table beside them rather than above them, and the check this task writes is the only thing keeping the two in step. What this task must not do is invent a second list here, which is the thing that drifts
- **Decide where it lives, and Task 1.6.3 has narrowed this considerably.** The backend's file is `apps/backend/.env`, resolved from `import.meta.dirname` rather than the cwd — so it is that path and no other, and a `.env` anywhere else is read by nothing. The frontend's is `apps/frontend/.env`, and Task 1.6.4 did **not** move `envDir` — it stated the default as a decision, so the house rule is one file per package beside its `package.json`, symmetric with the backend. Both loaders are therefore package-local and a repository-root `.env` is read by **neither**. One example at the repository root documenting both is still the friendlier read for Story 1.8's clean-clone criterion, but it now carries a specific hazard rather than a general one: `cp .env.example .env` at the root produces a file **no loader reads**, silently, which is exactly the failure this bullet was written to avoid. If the root file wins anyway, the copy instruction it carries has to name the per-package destinations. Pick and say why
- **Verify the gitignore negation actually works rather than trusting the pattern.** `.gitignore` carries `.env`, `.env.*` and `!.env.example`. Create `.env`, `.env.local` and `.env.example` in every location a loader reads and check `git status` and `git check-ignore -v` for each: the first two ignored, the third tracked. The negation after a wildcard is the exact pattern that silently fails when a directory rather than a file is excluded, so measure it in place. Task 1.6.3 already did this for `apps/backend/` and recorded the output — reproduce it if it is cheap, but the location that has never been checked is the frontend's. Task 1.6.4 came closer without closing it: it created `apps/frontend/.env` for its boundary probe and `git status --short` never listed it. That is consistent with the pattern working and is **not** evidence of it, because an untracked file that fails to appear looks identical whether it is ignored or merely overlooked. `git check-ignore -v` names the rule and the line; run that
- **Prove a secret cannot reach the bundle by planting one.** Set a plausible non-prefixed secret in the frontend's `.env`, build, and grep `dist/assets/*.js` for the value — absent. Then plant a `VITE_`-prefixed one and confirm it **is** present, because the whitelist is only a boundary if both sides of it behave. Remove both afterwards. This is the same technique as Task 1.6.4's boundary check and it is worth doing again here against a realistic value, since it is what the acceptance criterion actually claims. Task 1.6.4's result to reproduce rather than rediscover: the prefixed value appears as a string literal and the non-prefixed reference is compiled to **`void 0`** — the read is substituted away, not merely unexposed, which is a stronger claim than "absent from the bundle" and is the one worth quoting in the example file's own header
- **Write the rule down where someone will hit it.** Market-data and LLM credentials are server-side only, without exception — the browser talks to the MarketPulse backend, never to Alpaca or a model provider. That belongs in `.env.example` beside the first credential it will apply to, and in `README.md`, not only in this planning tree
- **Extend `README.md`.** It is the human-facing reference and currently says nothing about configuration. Add the setup step (`cp .env.example .env`, with the destination that is actually read), what happens with no `.env` at all — which Task 1.6.3 measured as "starts on defaults, silently", and that silence is a documentation obligation rather than a gap — and the one sentence about which side secrets live on. Story 1.8 owns getting a clean clone to a running application and inherits whatever is written here

## Done when

- Every variable the application reads appears in the example, and nothing appears there that nothing reads — checked by grep in both directions
- The gitignore behaviour is verified in each location with the command output recorded
- Both halves of the bundle-grep are recorded, with the probe values removed from the tree
- `README.md` covers configuration and points at the example file
- `pnpm verify` exits 0 — and note Prettier owns Markdown, so an unformatted README fails it

## Notes

This task exists separately from 1.6.3 so the example is written once against a finished variable set rather than edited after every preceding task. If it turns out there are only two or three variables to document, that is the correct outcome and the file should say what it is waiting for — Epic 2's Alpaca credentials are the next entries.

## Outcome

**Done on 2026-08-31.** Two example files, one check script, one new step in
`pnpm verify`, and a `## Configuration` section in `README.md`. No source
change to either application, so the artefact is byte-for-byte what Task 1.6.4
left: 265 modules, 342.00 kB of JavaScript, 9.82 kB of CSS, **three files**.

Implemented **before** Task 1.6.5, out of the numbered order, and that is safe
rather than convenient: 1.6.5 wires `basename` from `import.meta.env.BASE_URL`,
which is one of Vite's own built-ins set from `base` rather than a `.env`
variable, so it adds nothing this file documents. The "write the example once
against a finished variable set" argument in the Notes below is unaffected.

### Where the examples live: one per package, no root file

Both loaders are package-local, so both examples are too.

| File                         | Read by                                              | Variables      |
| ---------------------------- | ---------------------------------------------------- | -------------- |
| `apps/backend/.env.example`  | `loadEnvFile()`, resolved from `import.meta.dirname` | `PORT`, `HOST` |
| `apps/frontend/.env.example` | Vite, `envDir: "."`                                  | none yet       |

A single root example documenting both was the friendlier read and was
rejected on the hazard this task's own Work section named: `cp .env.example .env`
at the root produces a file **no loader reads**, silently, and the instruction
that would have to accompany it (`cp .env.example apps/backend/.env`) is a copy
whose source and destination are in different directories — which is exactly
the shape people get wrong. Beside the file it configures, the copy command is
self-evidently right.

The frontend's example documents **no variables at all**, and that is the point
of it. The application reads no configuration yet; the file exists because
`apps/frontend/.env` is where somebody will eventually put an Alpaca key, and
the file that is open in front of them at that moment is the one that has to
say not to.

### Both directions of the gitignore, measured in all three locations

`git check-ignore -v` is the obvious command and **it does not answer the
question**. It exits 0 for a negated path too, reporting the negation rule that
matched:

```
$ git check-ignore -v apps/frontend/.env.example
.gitignore:17:!.env.example	apps/frontend/.env.example
$ echo $?
0
```

Read as an exit code that says "ignored", and it is the exact shape of a check
that passes while the negation is broken. Without `-v` the exit code means what
it looks like — 0 ignored, 1 not ignored — and `git status --porcelain
--ignored=matching` states it outright. Nine files created in the three
locations a `.env` could plausibly be put:

| Path                         | `check-ignore -q` | `git status` |
| ---------------------------- | ----------------- | ------------ |
| `apps/backend/.env`          | exit 0 (ignored)  | `!!`         |
| `apps/backend/.env.local`    | exit 0 (ignored)  | `!!`         |
| `apps/backend/.env.example`  | exit 1 (tracked)  | `??`         |
| `apps/frontend/.env`         | exit 0 (ignored)  | `!!`         |
| `apps/frontend/.env.local`   | exit 0 (ignored)  | `!!`         |
| `apps/frontend/.env.example` | exit 1 (tracked)  | `??`         |
| `.env`                       | exit 0 (ignored)  | `!!`         |
| `.env.local`                 | exit 0 (ignored)  | `!!`         |
| `.env.example`               | exit 1 (tracked)  | `??`         |

The negation works, at every location, including the frontend's — which had
never been checked. Task 1.6.4 came close and this task's Work section was
right to refuse it as evidence: `apps/frontend/.env` not appearing in
`git status --short` is what an ignored file and an overlooked file both look
like. The nine files were removed afterwards.

### The bundle, both halves, with a realistic secret

`apps/frontend/.env`, and both names referenced from `src/main.tsx`:

```
ALPACA_API_SECRET_KEY=Zx9QaLpAcAsEcReT4b2f1e8d0c7a
VITE_API_BASE_URL=https://api.marketpulse.example/v1
```

The emitted call, from `dist/assets/index-*.js`:

```js
console.log(`probe`, void 0, `https://api.marketpulse.example/v1`);
```

| Grepped for                    | In `dist/` |
| ------------------------------ | ---------- |
| `Zx9QaLpAcAsEcReT4b2f1e8d0c7a` | absent     |
| `ALPACA`                       | absent     |
| `api.marketpulse.example`      | present    |

So Task 1.6.4's result reproduces against a realistic value, and the stronger
claim holds: the non-prefixed **read** is substituted away rather than left
undefined at runtime, and not even the variable's name survives into the
artefact.

**One thing this task checked that 1.6.4 did not, and it is a second artefact
nobody had thought about.** `pnpm build` produces `storybook-static/` as well
as `dist/`, and the README says it serves from any dumb static host — so it is
as publishable as the application is. The same probe placed in
`Popover.stories.tsx` emits the identical
``console.log(`probe`, void 0, `https://api.marketpulse.example/v1`)`` into
`storybook-static/assets/Popover.stories-*.js`, with the secret and the name
`ALPACA` both absent. That is by construction — `.storybook/main.ts` reuses
`vite.config.ts` rather than forking it, which is why Task 1.4.5 wrote it that
way — but a construction argument and a measurement are not the same thing, and
now there is a measurement. All probes were reverted.

### `pnpm env:check`, and why it is a sixth step rather than a one-off grep

`scripts/check-env-example.mjs`, beside `check-stories.mjs` and dependency-free
for the same reason. It runs between `stories` and `test`.

Making this a step in `verify` is a change to what the acceptance command means
and was the one real decision here. The Done-when bullet — "checked by grep in
both directions" — is satisfiable by running two greps once and writing the
output down. That was rejected because a grep run once keeps nothing in step,
and "keeping the two in step" is the entire reason Task 1.6.2 exported
`CONFIG_VARIABLES` rather than leaving the defaults inline. A documented
variable set with no check is the same green-tick-that-means-nothing as the
placeholder `test` scripts.

It checks four things, and the third is the one a grep cannot do:

1. every key in `CONFIG_VARIABLES` appears in `apps/backend/.env.example`
2. every key in that example is in `CONFIG_VARIABLES`
3. the **default** each optional variable documents equals the default in
   `config.ts` — the half that rots first, because a changed default leaves a
   plausible wrong number behind rather than a missing line
4. every name in `apps/frontend/.env.example` carries the `VITE_` prefix

The fourth is not a leak check. A non-prefixed name there is a variable that
will silently never arrive — `void 0`, per the measurement above — which is the
more likely mistake and much harder to debug than a secret in the wrong file.

**It has been seen to fail, in all four directions**, because a check that has
never failed has never been tested:

```
✗ PORT is read by apps/backend but is not in apps/backend/.env.example.
✗ LOG_LEVEL is in apps/backend/.env.example but nothing in apps/backend reads it.
✗ PORT defaults to "3000" in config.ts but apps/backend/.env.example says "8080".
✗ API_BASE_URL is in apps/frontend/.env.example without the VITE_ prefix, so it
  would never reach the browser — the read compiles to `void 0`.
```

It reads the backend's **built** `dist/config.js`, since the table is
TypeScript and the script is not. `verify` builds first; run standalone on a
clean tree it says `run \`pnpm build\` first` rather than throwing a resolver
error.

The step is named `env:check` rather than `env` or `config` deliberately. Both
of those are real pnpm 11 built-ins, and a root script shadows a built-in for
the whole repository — which was the right call for `clean`, where the built-in
deletes `node_modules`, and is the wrong call for two commands that are
genuinely useful. The colon form matches `lint:fix`, `format:check` and
`storybook:build`, all of which are already extras rather than verbs.

What it does **not** prove, and the script's own header says so: that the
placeholder values are safe. A plausible placeholder and a real key are the
same shape to a script. What protects the example is that it is a tracked file
and gets reviewed like one.

### `README.md`

A new `## Configuration` section, plus `env:check` in the verify chain, the
command table and the Setup step. It covers the two `cp` commands with the
destinations that are actually read, the fact that **neither file is needed**
because a fresh clone starts on defaults, that the missing file is silent by
design and is documented here precisely because it is silent, precedence,
blank-means-absent, the startup failure message, and the secrets rule. Story
1.8 inherits it.

### `pnpm verify`

Exit 0, with six steps. No dependency added, no lockfile change,
`allowBuilds` untouched.
