# Task 1.8.2 — Make the pair legible in one terminal

**Status:** Complete
**Story:** [1.8 Local Development Environment](STORY.md)
**Depends on:** Task 1.8.1

## Objective

Close the story's one genuinely open presentation problem: three loops and eight processes write to one stream, and the interesting lines are outnumbered. Decide what a developer should see, and change as little as possible to get it.

## Work

- **Start from the friction list, and be willing to change nothing.** "The current output is already fine" is a real outcome and should be recorded as one, with the evidence from Task 1.8.1 beside it. What is not acceptable is leaving it undecided — this criterion has been "making the pair legible together" since Story 1.3 closed the wiring half, and it has never been looked at directly
- **The lever Task 1.8.1's numbers actually indict is the request record's _rendering_, not its severity.** One `GET /health` costs **12 lines** because `pretty` puts each record's message, `reqId` and expanded `req` or `res` object on separate lines — six per record, two records. That is a `pino-pretty` option (`singleLine`, `ignore`, `messageFormat`, `translateTime`), configured where the transport already is, and it collapses a request to a line or two **without touching the severity floor at all**. Try that before reaching for the level, because it does not cost the silence trap below
- **The knob that exists is `LOG_LEVEL`, and turning it down has a trap in it.** At `warn` and above a healthy server is **completely silent**, its `Server listening at …` line included, because nothing in a normal run emits above `info` (ADR 0007 §2). So a quieter dev loop looks exactly like a failed start. If the answer here is a lower default level for development, that trap has to be answered in the same breath — either by something else printing a ready line, or by not taking that option
- **`scripts/dev.sh` is where a development-only value goes, and it already holds one.** `export LOG_FORMAT="${LOG_FORMAT:-pretty}"` is the whole of how "development" exists in this repository: ADR 0007 §1 records that `NODE_ENV` is read nowhere and nothing branches on which environment it is in — the development entrypoint simply passes a value. Extend that file the same way if another value is needed. **Do not introduce a name for the environment**; doing so reverses a recorded decision and has to be written as one
- **Note what that file costs before adding to it.** `pnpm verify` reads `scripts/dev.sh` with nothing — ESLint sees only JS and TS, Prettier has no shell parser and skips it silently, `tsc` has no view of it — and it already carries the only configuration value `pnpm env:check` structurally cannot see. A typo there is not an error; it is a silent fallback to JSON in the one loop that wanted `pretty`. Known and dated 2026-09-01, and Story 1.10 carries the same note. Every value added here makes that gap wider, so a second value needs a better reason than the first one did
- **Two smaller legibility findings from Task 1.8.1, both about the frame rather than the content.** pnpm's prefixes are three different widths — `packages/shared dev: ` at 21 characters, `apps/frontend dev: ` at 19, `apps/backend dev: ` at 18 — so the left edge is ragged and `pretty`'s own indentation starts 18 columns in. And there are **three clocks in one stream**: `tsc` and Vite print 12-hour times without milliseconds (`8:57:35 PM`), pino prints 24-hour with them (`[20:57:36.471]`), and pnpm prints none. `translateTime` answers the second on the pino side; pnpm's reporter is the only lever on the first, and "leave both" is a legitimate answer if the request record shrinks
- **Decide against the terminal Story 1.12 will produce, not the one in front of you.** A browser page load costs **zero** lines today only because the frontend makes no request. Task 1.8.3 establishes that it can, and Story 1.12 makes it actually do so — at which point 12 lines per page load is the floor, and a decision taken against a silent frontend will be wrong within two stories
- **The Ctrl-C misattribution is on the friction list and may not be fixable here.** `pnpm -r` reports the **first** interrupted watcher as `Failed` and names `packages/shared`, then adds `[WARN] Local package.json exists, but node_modules missing`; Vite says nothing at all on the way out. Neither claim is true. If pnpm's reporter cannot be made to say something truthful, say so and hand it to Task 1.8.5 as a documentation problem explicitly — do not leave it looking unexamined
- **`--preserveWatchOutput` is load-bearing and must survive whatever this task does.** Without it a `tsc --watch` clears the terminal on every rebuild and takes the other two packages' output — including the server's log — with it. If the answer involves a supervisor or a different runner, check this specifically rather than assuming the flag still applies
- **A process manager is the obvious big answer and it has an obvious cost.** If one is proposed, it is a dependency at the workspace root, a second place the dev loop is described beside `scripts/dev.sh`, and it has to keep four properties Tasks 1.2.6 and 1.3.5 measured: Ctrl-C leaving zero survivors, both ports released, the child's exit code propagating, and the backend's ~1.1s edit-to-listener. Measure all four against it rather than arguing about them. The bar is high because pnpm's own fan-out already delivers them
- **Storybook stays out of `pnpm dev`, and this task is where that is confirmed or reversed.** It is a fourth server on 6006, run by `pnpm --filter @marketpulse/frontend storybook` — an extra like `start` and `preview`, with no root fan-out. Task 1.4.5 kept it out because the loop is already three loops and eight processes in one terminal. If this task makes the terminal legible, adding the workshop is the first thing anyone will ask for, so answer it here with a reason rather than leaving it as an omission
- **Re-measure whatever changed, against Task 1.8.1's numbers and not against older ones.** Startup to both-ready (0.73 s warm, 1.37 s cold), the per-action line counts (0 / 12 / 1 / 8), both edit timings, and the Ctrl-C survivor count. **A frontend timing is only comparable if `document.visibilityState` was `visible` at the moment the DOM changed** — a hidden tab costs 4–6×, which is what made Task 1.4.6's figures upper bounds. Record the visibility with the number. A legibility change that costs 300 ms of startup is a trade to state, not a free win

## Done when

- The legibility decision is closed, including if the decision is to change nothing, with Task 1.8.1's output as the evidence
- The `warn`-and-above silence trap is answered explicitly if the level was touched, and not answered at all if it was not
- `NODE_ENV` is still read nowhere, or its introduction is written up as a reversal of ADR 0007 §1
- `--preserveWatchOutput` still holds: a rebuild in one package does not clear another's output, checked rather than assumed
- The Storybook question is answered in writing, either way
- The request record's rendering was tried as an option in its own right, before or instead of the severity floor
- The Ctrl-C misattribution is either fixed or handed to Task 1.8.5 in writing
- Startup, per-request line count, both edit timings and the shutdown survivor count are re-taken after the change, each frontend timing carrying the `visibilityState` it was taken at
- `pnpm verify` exits 0

## Notes

The pattern to match rather than redesign is the backend's loop: it restarts in about a second, drains in-flight requests, prints its own shutdown lines, and leaves no orphaned process or held port. This task's job is the pair, not either half.

## Outcome

Two `pino-pretty` options in `apps/backend/src/server.ts` and nothing else. No
dependency, no process manager, no new file, no change to `scripts/dev.sh`, and
the severity floor untouched.

```ts
transport: {
  target: "pino-pretty",
  options: { singleLine: true, translateTime: "SYS:h:MM:ss.l TT" },
},
```

### What it did to the terminal

Re-measured against one running `pnpm dev`, counting the shared terminal's
lines before and after each action rather than estimating:

| Action, in rendered lines              | Before | Now |
| -------------------------------------- | -----: | --: |
| One browser page load of `/`           |      0 |   0 |
| One `GET /health`                      |     12 |   2 |
| One `GET` to a route that is not there |     14 |   3 |
| One frontend HMR update                |      1 |   1 |
| One backend source edit (a restart)    |      8 |   7 |
| Startup to both servers ready          |     13 |  13 |

Every "before" figure is Task 1.8.1's except the 404, which nobody had taken —
that row was measured here by stashing the change and running the shipping
server both ways.

A request is **12 lines to 2**, which is the whole finding. Task 1.8.1's
controlled session — one page load, three requests, three frontend edits and
one backend edit — was 47 lines, of which 36 were the three requests; the same
sequence is now **16 lines, of which 6 are the requests**. The two halves of
the pair are no longer three orders of magnitude apart in how much they say.

The restart lost a line for a reason worth knowing: `signal received, shutting
down` carried its `signal: "SIGTERM"` on a second line and now carries it
inline. That is the same mechanism as the request record, applied to a record
nobody was complaining about.

### Why the rendering and not the level

`LOG_LEVEL` was not touched, so **the `warn`-and-above silence trap is not
answered here and did not need to be**. It is the reason the level was not the
lever: above `info` a healthy server is completely silent, its `Server
listening at …` line included (ADR 0007 §2), so a quieter dev loop and a failed
start are the same terminal. `singleLine` buys a 6× reduction while every
record that was emitted before is still emitted, with every field it had.

`NODE_ENV` is still read nowhere. `scripts/dev.sh` is unchanged, so the one
configuration value `pnpm env:check` structurally cannot see is still exactly
one, and the gap this task was warned about widening did not widen.

### The two options that were tried and rejected, and the one word that matters

**`messageFormat` was tried first**, because interpolating `{req.method}
{req.url}` into the message is the obvious way to make a request read as a
sentence. It renders well on the two records that have a `req` and badly on
every record that does not — a template applies to all of them and there is no
per-record form, so `Server listening at …` comes out with a leading run of
spaces where the method and url would have been:

```
[5:55:56 AM] INFO:   Server listening at http://127.0.0.1:3015
[5:55:57 AM] INFO: GET /health incoming request
[5:55:57 AM] INFO:   request completed 200
```

**`ignore` was tried and nothing is ignored.** Dropping `reqId` and `pid` takes
the widest request line from 172 columns to 117, which is the difference
between wrapping and not wrapping on a normal terminal — a real gain, and it
was still rejected. `reqId` is the field that exists precisely to survive
interleaving, and Story 1.12 is what introduces interleaving: the moment the
page calls the API, `incoming A / incoming B / completed A / completed B` is
the ordinary case and adjacency stops being correlation. The brief says to
decide against the terminal Story 1.12 will produce, and this is that decision.
`pid` stays for a smaller reason: it changes on every restart, which is what
distinguishes a restart from a reload in a stream where both look alike.

**`SYS:` is load-bearing in `translateTime` and its absence is silent.**
`translateTime: "h:MM:ss TT"` formats in **UTC** — a clock that disagrees with
the two beside it by a whole timezone while looking entirely plausible. With
`SYS:` the three clocks in one stream become two conventions instead of three:
tsc and Vite print `8:57:35 PM`, pino now prints `8:57:35.144 PM`. The
milliseconds stay because every restart and drain figure in this repository is
read off them.

### A stack is still a stack

`singleLine` flattens objects and **leaves an error's `stack` multi-line** —
pino-pretty's own behaviour, verified on the shipping server with a temporary
throwing route rather than inferred from the option's name. A 500 is a flat
`incoming request`, a flat `request completed`, and between them the `err`
object with its indented stack. The one thing worth reading down the page still
reads down the page, and an `EADDRINUSE` at startup renders the same way.

### Timings, re-taken

**Startup is unchanged**: 13 lines, both servers ready in **0.83 s** warm
against 1.8.1's 0.73 s, with Vite ready at 0.74 s and the backend at 0.83 s.
The difference is Vite's own `ready in` figure moving 114 → 173 ms between runs,
not the transport. So the legibility change costs no startup time and there is
no trade to state.

**Backend, edit to new listener**: 1212 / 1248 / 1016 / 961 / 972 ms, median
**1016 ms** against 1.8.1's median 963 ms — the same number, and still
dominated by tsc's incremental compile rather than by anything logging does.

**Frontend, edit to updated DOM**: 549 / 519 / 486 / 374 / 313 ms, median
**486 ms**, every sample taken with `document.visibilityState === "hidden"`.
That compares against 1.8.1's **hidden** band of 483–666 ms (median 571), not
its foreground one — an automated tab cannot be foregrounded, and 1.8.1
established that a hidden tab costs 4–6×, so mixing the two bands would invent
a regression or hide one. Same band, no change, which is what a backend-only
option should produce. Every sample was HMR: `performance.timeOrigin` stayed at
`1788329194487.7` and `performance.getEntriesByType("navigation").length`
stayed at `1` throughout.

**Ctrl-C**: eight processes in the group before, **zero survivors** after, and
both ports released — checked with `pgrep -g` and `lsof` rather than taken from
the supervisor. One caution for anyone repeating it: `lsof -ti tcp:5173`
briefly counts the _browser's_ client socket, so check for a LISTEN state
rather than for any holder.

### `--preserveWatchOutput` still holds, with a positive control

Checked rather than assumed, and the obvious check does not work: a redirected
log cannot show a screen clear, because tsc only clears on a TTY. Run under a
real pseudo-terminal, `tsc -b --watch` emits `ESC[2J ESC[H` **twice** over a
start and one rebuild, and `tsc -b --watch --preserveWatchOutput` emits it
**zero** times. The control is what makes the negative result mean anything.

Note the sequence: it is `ESC[2J` followed by `ESC[H`, and **not** the
`ESC[1;1H ESC[0J` that `CLAUDE.md` records — that one is Vite's `clearScreen`.
Two different tools clear the screen two different ways, and a grep written for
one reports zero for the other, which reads as a pass.

### Ctrl-C: not fixable here, handed to Task 1.8.5

Every pnpm-level lever was tried against the real loop and each one costs more
than the message does:

| Attempt                               | What it fixes                                                            | What it costs                                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--no-bail`                           | removes the `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` block and `[ELIFECYCLE]` | prints **two** `Failed` lines instead of one, keeps the false `node_modules missing` warning, and stops a genuinely broken dev script from aborting the run |
| `--loglevel error`                    | removes the false warning                                                | suppresses **every** child's streamed output — the server's log, Vite's ready line, all of it                                                               |
| `--silent`                            | removes all of it                                                        | prints nothing at all                                                                                                                                       |
| A SIGINT-trapping wrapper per package | would make each script exit 0                                            | two new shell files in the one part of this repository `pnpm verify` reads with nothing, to silence a message on the way out                                |

One new detail that makes the case rather than weakening it: **the
misattribution is not stable.** It named `packages/shared` in Task 1.8.1 and in
two runs here, and `apps/frontend` in a third — `pnpm -r` reports whichever
watcher happens to exit first, so the package it blames is a race. There is
nothing truthful to be said by configuring it. It is a documentation problem
and Task 1.8.5's brief already carries it; this task's contribution is the
evidence that the alternatives were tried.

### Storybook stays out of `pnpm dev`

Confirmed rather than left as an omission, and the deciding reason is not the
one expected. The suspicion was that Storybook's boxed startup banner would be
mangled by pnpm's line prefix; it is not — measured under a real fan-out, the
box survives the prefix intact at **12 lines** against Vite's 3, and after
startup the workshop is as quiet as Vite is.

What decides it is the port. **Storybook does not strict-port**: with 6006
busy it bound **6007** and said so in a line nobody reads, which is precisely
the behaviour `strictPort: true` was chosen to prevent for 5173 and 4173,
because a silently moved port fails later as a browser error naming neither the
port nor the cause. Putting it in `pnpm dev` puts that behaviour inside the
loop. Beside it: the workshop and the application are different activities —
you develop a component in isolation or you integrate it — so running both
always means one bundler idling, and this task spent its effort getting the
shared terminal down to where a 12-line banner is a visible cost rather than a
rounding error. It stays an extra, like `start` and `preview`.

The reversal trigger is a story being edited routinely in the same sitting as
the application, at which point the port question has to be answered first.

### The two findings that were not acted on

**Prefix widths.** `packages/shared dev: ` is 21 characters, `apps/frontend
dev: ` 19, `apps/backend dev: ` 18, so the left edge is ragged and pino's
output starts 18 columns in. pnpm derives the prefix from the workspace
directory and there is no padding option; the levers are renaming packages or
`--reporter-hide-prefix`, which removes the only thing telling three
interleaved streams apart. Left alone, and the request record shrinking is what
makes it tolerable.

**Three clocks becomes two conventions, not one.** `translateTime` moved pino
onto tsc's and Vite's 12-hour convention, which is as far as it goes: pnpm
stamps nothing and cannot be made to, and dropping pino's milliseconds to match
exactly would cost the precision the restart and drain figures are read off.
