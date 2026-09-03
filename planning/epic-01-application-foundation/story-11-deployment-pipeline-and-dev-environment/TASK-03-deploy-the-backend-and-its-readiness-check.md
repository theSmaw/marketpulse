# Task 1.11.3 — Deploy the backend, configure it from the platform, and make `/health` the readiness check

**Status:** Not started
**Story:** [1.11 Deployment Pipeline & Development Environment](STORY.md)
**Depends on:** Task 1.11.2

## Objective

Get the backend running on the chosen host at a documented URL, with every value coming from the platform rather than from a committed file, and a readiness check that cannot hang.

## Work

- **Deploy it by hand first.** Automation is Task 1.11.6; a deploy that has never been done manually is a deploy whose first failure is also an automation failure. Record the steps as they are performed, because they become that task's input
- **Set the environment from the platform's own variable mechanism, and set `CORS_ORIGIN` explicitly.** The default is `http://localhost:5173` and it is **not safe by omission** — a deployment that never sets it lets somebody's local dev server call it. Small (`credentials` is off, there is no cookie to ride along) and real. Until Task 1.11.4 exists there is no frontend origin to name, so set it to a stated placeholder and record that closing it is 1.11.5's job, or sequence the two deploys so the real origin is available. **`LOG_FORMAT` must be `json`** — `pretty` starts a worker thread and exists for a terminal — and `LOG_LEVEL` should be chosen with the silence trap below in mind
- **Add no configuration variable without going through `config.ts`.** `pnpm env:check` compares `CONFIG_VARIABLES` against both `.env.example` files, defaults included, so a value invented in a platform panel and read with `process.env` somewhere new breaks the one rule that keeps the documented variable set honest — and `apps/backend/src/config.ts` is still the only file in the workspace that reads `process.env`
- **Readiness is a poll of the port or of `GET /health`, and never a log line.** At `LOG_LEVEL=warn` and above a healthy server writes **zero** lines, `Server listening at …` included, so a probe that greps for it **hangs rather than fails** — the worse failure. `scripts/check-ready.mjs` is the shape to copy and it encodes three more traps that apply to a container probe unchanged: Fastify rewrites `0.0.0.0` to `127.0.0.1` in that line so it is not evidence of the bound interface; **a socket that accepts and never answers hangs `fetch` forever**, so each attempt needs its own timeout rather than one overall deadline; and Node's `fetch` tries both address families while `curl` does not, which decides how a probe should be written depending on what it is written in
- **Configure the platform's health check against `/health` and record what it does on failure** — how many failures before it acts, whether it restarts or removes the instance, and how long it waits at startup before the first check. That startup grace has to be longer than a cold start, or a healthy deploy loops
- **Say what happens to the logs.** Records are JSON on **stdout**, and Task 1.7.5's whole point was that Node's default put a crash on stderr while every other record went to stdout, so a deployment collecting only one stream loses exactly the record it most needs. The crash handlers moved that into the log stream; collect both anyway, or write down why not. Confirm a record from the deployed instance is actually retrievable — a log nobody can read is not logging
- **Verify `/health` over the public URL**: a 200, the schema-stripped body, and an `x-request-id` header on the response. Then verify a 404 on a made-up path carries the `ApiError` shape and its own id, because the not-found path is the one with no route and no response schema behind it
- **Write down the third failure experience before somebody meets it.** A crash detached from the request that caused it answers **200 with a valid `x-request-id`** and then dies, so the id a user quotes points at a record correctly saying their request succeeded, and the level-60 record beside it carries no id at all. A crash with a request in flight is `curl: (52) Empty reply from server` — no body, no headers, not even an id to quote. "Quote the id and find the entry" is a rule with a stated exception
- **Decide what `version` should report.** `/health` returns whatever the deployed manifest carries, which is free version reporting if the release process sets it and a permanently `0.0.0` endpoint if it does not

## Done when

- The backend answers `/health` with a 200 over HTTPS at a URL written down in the repository
- Every value it reads comes from the platform; nothing new was committed, and `pnpm env:check` still passes
- `CORS_ORIGIN` is set explicitly, with its value stated and its final form owned by Task 1.11.5
- The readiness probe polls, has a per-attempt timeout, and was checked against a deliberately unresponsive case rather than only against a healthy one
- The platform's restart-on-failure behaviour and its startup grace are recorded
- A log record written by the deployed instance was retrieved
- `x-request-id` is present on a 200 and on a 404, from the public URL

## Notes

Two of this task's traps — the silence above `info` and the rewritten listening address — have now been recorded three times in three stories without ever having cost anybody anything, because nothing has yet waited on that line. A container probe is the first thing that will.
