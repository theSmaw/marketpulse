# Task 2.4.6 — Deploy it, verify it in a browser, and hand forward what was pre-empted

**Status:** Not started
**Story:** [2.4 The Tracked Universe On Screen](STORY.md)
**Depends on:** Tasks 2.4.1 to 2.4.5

## Objective

Get the page in front of a person on the deployed environment, verify it there rather than
locally, and write down precisely what this story took from Stories 2.9, 2.10 and 2.11 so
none of them re-decides it or assumes it is still theirs.

## What the user can see when this lands

**The finished thing, live, at the deployed URL** — and this is the task after which a
stakeholder can be sent a link rather than a screenshot.

It is also the task that produces the artefact worth putting in front of them: a short
written summary of what the page shows, what it deliberately does not, and which story
brings each missing piece. "No prices until Story 2.8, no search until 2.11, no chart until
2.12" is a better answer to "when do we see more?" than a roadmap, because it is attached
to something they are looking at.

## Work

- **Verify against the deployed pair, not only locally.** Story 1.12's criterion was "not
  only locally" and it earned that wording: Story 1.12.7 found `unreadable-body` reachable
  deployed and unreachable locally because the two hosts disagree about the one request an
  API client actually sends. This is the first deployed page that makes a data request, so
  it is the first one where that class of difference can bite
- **Follow one request from the browser to the log.** The `x-request-id` the browser reads
  should be the `reqId` in the backend's Log Analytics record for that request — the
  arrangement Story 1.11 built and that has been re-taken every story since, here for the
  first time on a request that returns data rather than health
- **Read the deployed page's numbers back against the database.** The count on screen, the
  eleven sectors, and a spot check of three securities against what `pnpm universe` loaded.
  Identical is the check rather than a coincidence
- **Decide whether anything goes into `e2e/specs-deployed/`**, and expect the answer to be
  **yes** for the first time in this project. That suite exists to catch what only a browser
  against the live environment can see, and its two existing journeys are about the two
  halves talking. A page that renders data from an API is a third thing that can be broken
  deployed and correct locally — a wrong `VITE_API_BASE_URL` gives a page that loads and
  shows nothing, which is exactly the failure that suite was built for. Note the cost stated
  in Task 1.13.5: a green run costs the deployed backend a handful of requests, and the
  suite gates nothing because it runs after a merge
- **Write down what this story pre-empted, in the three stories it took from**, and amend
  each of their files rather than only recording it here. `STORY.md`'s table is the source:
  2.9 keeps the series contract and loses the universe endpoints and the temporal seam; 2.10
  keeps the store decision and the `market` module and loses the first fetch and the state
  types; 2.11 keeps search, the combobox, the per-security route and the Explorer shell and
  loses the list. **A story whose scope moved and whose file did not say so is how work gets
  done twice**, and this repository has the convention of amending the file rather than
  remembering
- **Record the temporal seam decision where Epic 13 will find it.** Task 2.4.1 establishes
  the arrangement; this is where it is stated as a property of the tree rather than of a
  task — including the honest half, which is that `securities` is not a temporal table, so
  the seam is established and **not yet exercised by anything**
- **Update `CLAUDE.md` and `README.md`**: the routes paragraph, which currently describes
  `/securities` as a placeholder, and the list of things a correct first run shows that read
  as faults
- **Re-take the artefact figures**, because this story ships real frontend source for the
  first time since Story 1.13 and the four-file bundle will move

## Done when

- The page is live and verified in a browser against the deployed pair
- One correlation id followed from the browser to a deployed log record
- The deployed page's count and sectors match the database
- Stories 2.9, 2.10 and 2.11 each carry an amendment saying what moved
- `CLAUDE.md` and `README.md` describe the route as it now is
- All six acceptance criteria re-run, with the figures re-taken rather than cited

## Notes

There is deliberately **no ADR** for this story. It takes no architectural decision of its
own — the read path, the contract idiom and the state-as-types pattern are all applications
of decisions ADRs 0002, 0007, 0012 and 0015 already record — and the two genuinely new
decisions it makes, the temporal seam's shape and the store deferral, belong to Story 2.9's
and Story 2.10's ADRs respectively. Recording that refusal here is the point: an ADR per
story is a convention nobody chose, and this repository's rule is one ADR per decision worth
arguing about.
