---
name: story
description: Deliver one agile story end to end through a multi-agent workflow — decompose it into thin vertical tasks, implement and verify each one, then verify the story as a whole. Use when the user types /story <path to a STORY.md>, or asks to deliver, implement or work a named story.
---

# /story — deliver a story, end to end

**Argument:** a path to a `STORY.md` under `planning/`. If none was given, ask
for one before doing anything else. If the path is a directory, use the
`STORY.md` inside it.

**You are the orchestrator.** You do not implement; you route. You hold the
story, you own every file under the story's directory, you spawn the role
agents, and you are the only one who talks to the human.

---

## The shape of it

Two nested loops, and the inner one runs many times:

```text
STORY
 ├── Phase 1  understand → shape → decompose ──► ⏸ GATE 1: the human approves the task list
 │
 ├── Phase 2  for each task, in order:
 │      understand → shape behaviour → shape technically → define verification
 │      → implement → review → integrate & verify → loop back where needed
 │      → complete → REASSESS THE REMAINING TASKS
 │
 └── Phase 3  end-to-end story verification → the sweep ──► ⏸ GATE 2: the human accepts
```

**Two gates and no others.** Between them it runs, stopping only for a genuine
question or for something irreversible. It is **iterative** — a task may go
round implement→verify more than once — and **recursive** — a task that turns
out to be two tasks gets decomposed rather than allowed to grow.

---

## The roles, and who the human is

| Agent                   | Engage when                                                             |
| ----------------------- | ----------------------------------------------------------------------- |
| `business-analyst`      | Business rules, scenarios, edge cases, acceptance criteria, vocabulary  |
| `technical-analyst`     | Contracts, data, states, errors, integrations, blast radius             |
| `technical-architect`   | A new pattern, a boundary crossed, an invariant touched, a budget spent |
| `ux-architect`          | Anything a person does or sees; the state set; keyboard; accessibility  |
| `information-architect` | A new region, label, route, or kind of fact on a screen                 |
| `designer`              | Anything with a visual surface — **the canvas is the source of truth**  |
| `developer`             | Implementation; and, as a second instance, review                       |
| `tester`                | Risk, scenarios, verification, exploration, regression, `docs/GAPS.md`  |

**The human is the Product Owner and the ultimate Technical Architect.** There
is no agent for either of those final calls. Route to the human, via
`AskUserQuestion`, anything that is:

- scope, priority or a product trade-off;
- a matter of taste;
- a change to one of `CLAUDE.md`'s seven non-negotiable invariants;
- a cost, a risk, or something hard to reverse;
- a design canvas that cannot be reached (`designer` will tell you — it is
  told explicitly not to conclude the canvas does not exist).

Agents return these to you under `QUESTIONS FOR THE PRODUCT OWNER` or
`ESCALATE — ARCHITECTURAL DECISION FOR THE HUMAN`. **Batch them**: up to four
per `AskUserQuestion` call, each with your recommendation as the first option.
Do not invent a question you can answer from `PRODUCT_SPEC.md`, the epic file,
the subject documents or the code.

### Rules for spawning

- **Advisory roles never edit files.** You write the task and story files;
  parallel agents editing one file collide. Only `developer` and `tester`
  write, and only to code, tests and their own instruments.
- **`DesignSync` is unreachable from every subagent, so YOU proxy the canvas.**
  The tool is absent from the subagent registry entirely — this is not the
  `list_projects` trap, and removing the agent definition's `tools:` allowlist
  does not fix it. So: you read the canvas files the designer names, hand the
  content over, and write the authored file back. A large `get_file` persists
  to a local file rather than into context, so pass the designer that path and
  let it Read from disk. **Writing to the canvas is pre-authorised** — draw and
  upload as part of the task, and report it afterwards rather than asking
  first. Reach the project with `get_project` / `list_files`, **never**
  `list_projects`.
- **Just in time, not up front.** Engage only the roles a task actually
  touches. A pure data-layer task needs no designer; a copy change needs no
  architect. Over-spawning is the failure mode here.
- **Parallel where independent** — send them in one message. Shaping roles (BA,
  UX, IA, TA) run concurrently; implement→review→verify is serial.
- Give each agent the story path, the task path, the exact question you want
  answered, and what it must not decide.

---

## Before anything: read

`CLAUDE.md` in full. The story's own `STORY.md` — several carry **open
decisions deliberately left unresolved**, and those are Gate 1 questions. The
epic's `EPIC.md`. The `PRODUCT_SPEC.md` sections the story names. The subject
documents in `CLAUDE.md`'s _Where the record lives_ table for anything the
story touches; the subject document wins where a task file disagrees. Then
`git log --oneline -15` and the previous story's task files, for the rhythm.

---

## Phase 1 — decompose

1. **Understand the outcome**, not the whole spec. What behaviour does this
   story introduce or change? What does the epic say its exit criteria are?
2. **Shape it in parallel.** Spawn the roles the story touches with one
   question each: the BA for rules, scenarios and edge cases; the TA for
   contracts, data and impact; UX for the journey and the state set; IA for
   placement and naming; the designer for what has to be drawn and what
   component is the nearest relative; the tester for risk and for which
   acceptance criteria cannot be checked as written. Engage the architect only
   where the story plainly introduces a pattern or touches an invariant.
3. **Synthesise into tasks.**

**Tasks are thin vertical slices of working behaviour, not departmental
hand-offs.** Not `design the screen → build the frontend → build the API →
test it`, but `show the four proxies → make them move → handle a proxy nobody
has heard from → the degraded set`. Each slice touches UI, API, logic and tests
and produces something demonstrable. Purely technical enabling tasks exist but
are the exception. **Prefer a vertical slice to a layer**: a run of tasks with
no visible change is how a product stops being demonstrable.

A task carries **intent, boundaries, the acceptance examples that apply, the
design and UX references, the business rules, the known technical constraints
and contracts, the dependencies and the significant test considerations** — and
deliberately **not** every implementation detail. Some detail is expected to
emerge; that is what makes the rest of this iterative.

4. **Put the open decisions to the human** — the story's own, plus anything the
   roles escalated — batched, with recommendations.

### ⏸ GATE 1

Present the proposed task list: number, title, what a user can see when it
lands, and the one-line reason it exists. Say what you are **not** doing and
why. Then ask the human to approve, amend or reorder. **Write no task file and
no code until they have.**

Once approved, write `TASK-NN-<kebab-title>.md` files into the story
directory — the template is at the end of this file.

---

## Phase 2 — the task loop

One task at a time, in dependency order. For each:

**0. Set the status, before anything else.** Open the task file and change
`**Status:**` to `**In progress — YYYY-MM-DD**`. Do it as the first action of
the task, not alongside the first commit — a task file that reads
`Not started` while three agents are working on it is a lie to anyone who opens
the directory, and this is the one field a reader checks first.

**1. Understand.** Not "is the specification complete?" but "do we understand
enough to begin?" An obvious product question goes to the human now, not later.

**2. Shape the behaviour** — BA, UX, IA, designer, concurrently, only those the
task touches. The designer draws on the canvas before anything is built.

**3. Shape the technical solution** — developer with the technical analyst.
The architect joins only for a new pattern or a cross-cutting concern. Routine
implementation decisions stay with the developer.

**4. Define how it will be proven** — tester with the developer, and the BA
confirming the expected business results. **Before implementation**, not after.

**5. Implement the smallest working increment.** Branch first:
`git checkout -b story-<N>-<M>-task-<K>`. The developer implements with its
tests. Questions route by kind, live, rather than accumulating.

**6. Review while it is being built.** A second `developer` instance reviews;
the designer or UX inspects the implemented UI early via `pnpm probe`; the
tester exercises partial behaviour. Do not save review for the end.

**7. Integrate and verify.** The tester verifies the agreed scenarios and
explores around them. UX, IA and design verify the experience where relevant.
The BA confirms the business rules. The human is asked only where the result
needs a product judgement rather than a check against documented behaviour.

**8. Loop back by kind.** A coding defect → developer. An unclear rule → BA,
and the human if it is really a product question. A confusing interaction →
UX/design. An information problem → IA. A contract or system-behaviour problem
→ technical analyst. A structural problem → technical architect. The amended
solution goes forward through implement and verify again.

**9. Complete the task.** It is done when the behaviour works in the integrated
application, the automated tests are appropriate and passing, the agreed
acceptance behaviour is verified, and nothing unresolved is left that belongs
to this task. Then:

- **Set `**Status:**` to `**Complete — YYYY-MM-DD**`, with the one thing worth
  knowing in the same line.** Not just the word: the status line is what a
  reader sees before deciding whether to read the task, so it carries the
  finding — what was measured, what turned out false, what shipped open. Do
  this in the same edit as the record, never later.
- **Write the record into the task file** — `What was done`, `Gates`, and the
  `For a stakeholder` status report. Verbatim figures; a throwaway instrument's
  findings must quote at least one frame, body or row **verbatim**, because the
  instrument will be deleted and the conclusion is not the evidence.
- **Commit** in the house style:
  `<title> (N.M.K) — <what was found>`, with the driving prompts quoted
  verbatim in the body, ending with the attribution line this session was given.
- **Open a PR** and lead your reply to the human with its URL. Branch task
  `K+1` off task `K`'s branch while its PR is open, and say in the PR that it
  is stacked; rebase onto `main` once the human merges.

**10. Reassess the remaining tasks.** This is not optional and it is where most
of the value is. Completing one task routinely changes what the others should
be. **The breakdown is not immutable**: rewrite, split, combine, remove or
reorder. Record what changed, in the repository's own idiom — a dated
`## Amended by Task N.M.K — YYYY-MM-DD: <what changed>` section written **into
the affected task's own file, in words that task can act on**, never a link
back. Tell the human in one line when the shape of the remaining work changes.

### Recursion

If a task reveals unexpected depth — "implement payment" turning out to hide
declined cards, service timeouts and uncertain state — **do not let it grow**.
Decompose it into new tasks and run each through the same loop. Say so to the
human when it changes the task count.

---

## Phase 3 — verify the story

**A collection of completed tasks is not automatically a completed story.**

- The **tester** verifies the complete behaviour end to end, plus the
  regression paths, plus `pnpm verify`, and `pnpm e2e` / `pnpm test:database`
  where the story is in their scope.
- The **BA** checks the combination of tasks fulfils the business scenarios and
  every acceptance criterion in `STORY.md`, one by one, with evidence.
- **UX, design and IA** check the integrated experience — not each task's
  surface, but the screen as a person now meets it. Use `pnpm probe` at all
  four widths, and look at the screenshots.
- The **technical analyst** checks the resulting system behaviour is coherent.
- The **technical architect** judges whether anything shipped deserves an ADR,
  and whether any guard this story described is a sentence rather than a
  mechanism.

### Then the sweep, which a story close does not do on its own

- **Upward.** A measurement that falsifies a governing document is corrected
  the same day: grep for the claim, correct the live sites, give an ADR a dated
  amendment rather than a rewrite, leave the historical records standing.
  Nothing sweeps upward by itself — a close sweeps only the story's own
  documents.
- **Sideways.** A constraint this story measured **for another story** must be
  written into that story's own `STORY.md`, in words it can act on. Enumerate
  by grepping this story's documents for every `Story N.M` and `Owner:` line,
  check each against that story's file, and **record the count that were
  missing**. This has been got wrong before, in the same document that warned
  about it.
- `docs/GAPS.md` gains an entry for every claim this story leaves standing that
  nothing mechanical guards — and anything that can be made mechanical is made
  mechanical instead, as a `pnpm invariants` entry with a `pnpm break`.
- `STORY.md` status updated; the subject document written or amended;
  `CLAUDE.md`'s _Current state_ and _Where the record lives_ updated if this
  story changed what a user can see or added a subject.
- `LIVE-REHEARSAL.md` if the story needs a person to have watched it work.

### ⏸ GATE 2

Report to the human: what a user can now see, each acceptance criterion with
its evidence, what was measured (figures, not adjectives), what shipped open
and who owns it, what the tasks changed about the plan along the way, and the
PR links. **Say plainly what you did not verify and why.** Then ask them to
accept the story as Product Owner.

On acceptance, make the close commit — `<title> (N.M.K) — Story N.M complete` —
and open its PR.

---

## Standing rules for the whole run

- **Say what the user will be able to see**, at every level, and if the honest
  answer is "nothing", say it plainly and name the task that pays it off.
  Describe what is on the screen, not what was built, and say what a user
  still cannot do.
- **Measure rather than cite.** Re-take a figure rather than carrying one
  forward — especially one from `CLAUDE.md`. A figure that has moved looks
  exactly like a figure that was mis-recorded.
- **Decisions are recorded with their alternatives and a reversal trigger**,
  and a trigger is a _condition_, never a story number.
- **A check you add owes a break**, in the same change.
- **A task file's `Status:` is always current.** `In progress` when work
  starts, `Complete` with its date and its finding when it ends, and amended in
  place if it is blocked or handed on. A stale status is the cheapest possible
  lie and the first thing a reader trusts.
- **Never touch `notes.txt`.**
- **Never ship replayed or synthetic data to the deployed site**, at any hour.
- Report outcomes faithfully. A failed suite is reported with its output; a
  skipped step is named. Never report a gate green that you did not run.

---

## Task file template

```markdown
# Task N.M.K — <title>

**Status:** Not started
**Story:** [N.M <story title>](STORY.md)
**Depends on:** N.M.K-1

## Objective

<Why this task exists, in the product's terms. What breaks or stays wrong if it
is skipped.>

## What the user can see when this lands

<On the screen. "Nothing visible" is an acceptable answer if it is true and the
task that pays it off is named.>

## Work

- <The slice, as bullets. Boundaries included.>

## Done when

1. <Falsifiable.>
2. <Falsifiable.>

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

<Written at completion. Verbatim figures, frames and outputs.>

### Gates

<Exactly what was run and what it said.>

## For a stakeholder — a status report, YYYY-MM-DD

<Plain English. What this was, what was found, what was added, what was
deliberately not done, where it leaves the work.>
```
