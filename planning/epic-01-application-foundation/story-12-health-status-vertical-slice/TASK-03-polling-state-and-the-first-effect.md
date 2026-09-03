# Task 1.12.3 — Poll the backend: the application's first state, first effect and first network loop

**Status:** Not started
**Story:** [1.12 Health & Status Vertical Slice](STORY.md)
**Depends on:** Task 1.12.2

## Objective

Add the polling behaviour behind Task 1.12.1's three states: an interval chosen on evidence, a last-successful-check timestamp, and automatic recovery. This is the first stateful shipped code in the repository and the React Compiler rule set's first real test.

## Work

- One hook, in `apps/frontend/src/`, owning the state and the effect. It returns the derived status, the last successful check time and — if the indicator needs it — the last successful payload. Nothing renders here
- **Delete `apps/frontend/src/health-probe.ts` and the `void probeBackendHealth();` line in `main.tsx` in this task and not before.** Both say in their own comments that they are meant to be deleted by this story; the deletion is the expected shape rather than a regression. It belongs **here**, with the thing that replaces the call — deleting it in Task 1.12.2 would leave a merge window in which the deployed frontend calls the deployed backend nowhere at all, which is Story 1.11's criterion regressing mid-story for no gain
- **Expect the React Compiler rules to have an opinion, for the first time outside a spike.** Fifteen of `eslint-plugin-react-hooks`'s 17 rules are at `error`, `exhaustive-deps` is a `warn`, and `lint` runs with `--max-warnings 0` — so a sloppy dependency array fails `verify` rather than warning. Task 1.5.1 already found `react-hooks/set-state-in-effect` failing at **error** on the obvious shape of syncing state from a URL. Derive rather than mirror; if a rule fires, read what it is objecting to before reaching for a disable, and record any disable with its reason
- **Choose the interval deliberately and write the reason in the code, because there are now three costs and only one of them is log noise.** The dev terminal's floor is **2 rendered lines per request** since Task 1.8.2 (a `GET /health`; a 404 is 3), so a poll every 5 s is 24 lines a minute in the shared `pnpm dev` terminal. The deployed backend writes **16 log records a minute at idle** from the three platform probes against a probe-only baseline of **1–4 requests per 30 s**, and a 5 s poll from a single tab adds 12 requests a minute **from every open tab**. And the Consumption plan's **idle billing rate** — the difference between ~$9.21 and ~$19.04 a month — has among its conditions that the replica receive **less than 1,000 bytes per second**; platform probes are not billable and these polls are. Whether continuous probing breaks that condition could not be answered in Story 1.11 and is not this task's to settle, but the interval must be chosen with it in front of you
- **Decide whether the interval is a literal or a `VITE_` variable, and say why.** The frontend's ports are literals as a stated decision; if this becomes a variable it is the story's **second**, and a variable is declared in three places now — `apps/frontend/.env.example`, `apps/frontend/src/vite-env.d.ts` and `.github/workflows/deploy.yml` — with **nothing checking the pair**. `scripts/check-env-example.mjs` reads the example and has no view of the declarations. Extending it is the obvious move and is owed by whichever task adds the second variable
- **Stop polling when nobody is looking, or state why not.** A background tab polling forever is the cost above multiplied by every tab a user forgot. `document.visibilityState` is the lever; note that an automated tab reports `hidden` and throttles React's scheduler, which is why every component timing in this repository is measured hidden against hidden
- **Recovery is the criterion most likely to be met by accident and least likely to be tested.** The state has to return to healthy on the next successful poll with no reload, and the last-successful-check time has to survive the failure that made it interesting — a failed poll must not clear it
- Abort the in-flight request when the effect tears down, and do not let a resolved-after-unmount response write state
- Tests beside the subject, through the conventions in Story 1.9. `apps/frontend/src/test-render.tsx` is where a provider goes if this hook needs one — it is the **third and last** description of the application's context, and putting one in each test file is what it exists to prevent

## Done when

- The three states are produced by real conditions rather than by a switch: healthy from a successful poll, degraded from the cause Task 1.12.1 defined, unreachable from a transport failure or timeout
- A failed poll leaves the last successful check time intact; a successful poll after a failure returns the state to healthy with no reload
- The interval and the visibility decision each carry their reason in the code
- `health-probe.ts` and its call site are gone
- `pnpm lint` passes at `--max-warnings 0` with no new rule disabled without a written reason, and `pnpm verify` passes

## Approach note

Nothing shipped here has ever had state, so the rules have never fired on real code — that is a property of the tree rather than evidence of compatibility. Treat the first rule that fires as information about the shape being written, not as an obstacle: the whole reason `eslint-plugin-react-hooks` was taken whole in Task 1.3.2, at 17 rules and mostly Rules of React rather than hook ordering, was to have this conversation on the first stateful code rather than the fiftieth.
