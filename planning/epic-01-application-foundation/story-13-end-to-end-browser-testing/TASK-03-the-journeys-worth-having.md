# Task 1.13.3 — Write the journeys worth having, and state the ones deliberately not written

**Status:** Not started
**Story:** [1.13 End-to-End Browser Testing](STORY.md)
**Depends on:** Task 1.13.2

## Objective

Encode the small number of behaviours that only a browser can assert, and write down what this suite deliberately does not cover — because a suite whose limits are unstated will be read as covering everything.

## Work

- **Deep-linking and the not-found route, against a host that behaves like production.** All four routes loaded cold as **200 with `index.html` and not a redirect**, a made-up path rendering `NotFound`, and `/assets/nope.js` a **404**. These are Story 1.5's two acceptance criteria, they were closed by hand in a browser in Task 1.11.4, and they are currently checked by a person or not at all. The trap that makes them worth encoding: **the not-found route rests on the same host property as the others** — `NotFound` only renders if the host served `index.html` for the address that matched nothing, so on a dumb host the user gets the host's own 404 and React never boots
- **The two halves talking, which is the journey this story exists for.** The page loads, calls the deployed contract, and the status is what the backend actually said. Then break it: with a wrong allowlist the browser reports `TypeError: Failed to fetch` while `curl` with the same `Origin` gets a **200 with a full body** and the log records `statusCode: 200`. **Make that failure happen and watch this suite go red on it** — that is the acceptance criterion, and it is the one measurement that justifies the whole story
- **Story 1.12's three states and its recovery criterion.** Healthy, then the backend stopped, then the backend back — with **no page reload**. Two things about writing it: the recovery cannot be observed faster than the next poll, so read the interval Task 1.12.3 chose rather than hardcoding a wait; and prove the absence of a reload with `performance.timeOrigin` unchanged and exactly one `navigation` entry, which is the check this repository already uses for HMR, rather than by asserting that something did not happen
- **The rest of the interface remaining usable while the backend is down** — navigate every route, and confirm nothing collapses to a global error screen. This is PRODUCT_SPEC.md §36's core principle and it is the criterion most likely to stop being true without anything failing
- **Decide whether a render failure is worth a journey, knowing this application contains no way to produce one.** Task 1.7.6 exercised every boundary placement with a temporary throwing probe and removed it; the process suite faced the same problem and answered it by injecting a crash through a wrapper rather than shipping a route. If the answer here is a test-only injection, keep it out of the shipping bundle and say how
- **Write the must-not list into the suite itself, not just into this file.** Not colour — no global stylesheet reaches the component tests and `getTokens()` throws there, but a **browser has the real stylesheet**, so this is the first level where a colour assertion would actually work, and it must still not be written: greyscale separates this palette's red and green by **1.05:1**, so a colour assertion tests the thing that carries no meaning. Not a single element's text where a component splits it across a visually-hidden `<span>` and a sibling text node. Not a `useId()` value or a DOM snapshot of a route, because both move when anything above them moves. **And not latency** — CI's runner-to-runner spread on identical work is 13.6 s, and the process suite asserts no timing for that reason
- **Decide the axe question and record it.** A browser makes an automated accessibility pass cheap, and this repository has run one by hand four times. It is also true that axe returns `color-contrast` **inconclusive** on exactly the non-text elements this product encodes with, that Story 1.9 rejected an axe pass as coverage, and that Epic 15 owns the accessibility review. A diagnostic that reports is a different thing from a gate that fails; if it goes in, say which it is
- **Say what a green run does not certify**, in the same shape ADR 0010 says it for the tick. It does not certify the states the suite cannot produce, anything about a browser it does not run, or anything about the deployed environment — that is Task 1.13.5's

## Done when

- The journeys above are written, passing, and each has been seen to fail for its own reason
- The cross-origin failure has been produced deliberately and this suite caught it, with the server-side evidence recorded beside it to show what it looked like from the other side
- The must-not-assert list is stated where the next person writing a spec will meet it
- The axe decision is recorded with its reason
- `pnpm verify` passes and `pnpm test` is still the fast suite

## Approach note

The temptation here is coverage, and it is the wrong instinct twice over. There is very little application to cover — one indicator, five routes and four empty regions — and the levels below already cover what they can reach. Every journey in this task is here because **no cheaper level can see it**: a host's fallback behaviour, two origins, a sequence over time, and a failure that every server-side instrument reports as success.
