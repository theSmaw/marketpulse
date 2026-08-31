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
 * ends and `unusual` begins is detection policy, it belongs to Epic 5 with the
 * rest of the scoring model, and inventing thresholds now would be a number
 * that outlives the guess that produced it.
 */
export const ANOMALY_BANDS = [
  "normal",
  "elevated",
  "unusual",
  "extreme",
] as const;

/** One of {@link ANOMALY_BANDS}, in ascending order of unusualness. */
export type AnomalyBand = (typeof ANOMALY_BANDS)[number];
