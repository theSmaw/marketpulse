/**
 * The bands the composite anomaly score is presented in.
 *
 * PRODUCT_SPEC.md §11 normalises the score to `0–100` and requires that every
 * score carries its explanation. Bands are the presentation of that score, and
 * they live here rather than in `apps/frontend` for one reason: the backend
 * that computes the score and the interface that renders it must not end up
 * with two vocabularies for the same four states. **The name is domain; the
 * colour is not** — the colours are `--anomaly-*` in
 * `apps/frontend/src/styles/market.css` and have no business in this package,
 * which is consumed by a Fastify server that will never render anything.
 *
 * The band measures **how unusual current observed behaviour is** — not risk,
 * not opportunity, and not direction. `extreme` says the behaviour is far from
 * this security's own history; it says nothing about whether that is good.
 *
 * Deliberately **not** here: the score-to-band boundaries. Where `elevated`
 * ends and `high` begins is detection policy, it belongs to Epic 5 with the
 * rest of the scoring model, and inventing thresholds now would be a number
 * that outlives the guess that produced it.
 *
 * **The third band was `unusual` until 2026-10-13 (Story 5.1, decision 6).**
 * Two reasons, and the second is the one that forced it. `Unusual activity` is
 * this product's name for the **region** that lists these scores —
 * `PRODUCT_SPEC.md` §8.1 and §9, the shipped route on `/`,
 * `landing-route.spec.ts`'s region list — so one band of four called `unusual`
 * inside a region claiming all four *are* unusual activity is a collision in
 * the one vocabulary both sides of the wire share. And the ladder did not read
 * monotonically: `normal → elevated → unusual → extreme` steps sideways in the
 * middle, because `unusual` names the dimension rather than a point on it.
 * `high` is a point on it.
 *
 * **The alternative was renaming the region**, which was refused on cost: the
 * region's name is in the spec twice, in a browser spec's region list, in
 * `CLAUDE.md` and on a screen a person has already watched, while this band was
 * **consumed by nothing shipped** — four stories, four story args and a CSS
 * class. **The reversal trigger is a condition**: the first surface that needs
 * to say *high* about something other than an anomaly score on the same screen,
 * at which point the collision has moved rather than gone.
 */
export const ANOMALY_BANDS = ["normal", "elevated", "high", "extreme"] as const;

/** One of {@link ANOMALY_BANDS}, in ascending order of unusualness. */
export type AnomalyBand = (typeof ANOMALY_BANDS)[number];
