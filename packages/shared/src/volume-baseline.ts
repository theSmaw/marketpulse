/**
 * **The vocabulary of the volume factor** — the words both halves of this
 * product have to agree about (Task 5.5.4).
 *
 * The baseline itself is computed in `apps/backend/src/volume-baseline.ts`,
 * stored by `0015_volume_baselines.sql` and held in memory by
 * `volume-baseline-cache.ts`. What is here is the part that must not be
 * spelled twice: the words a refusal can carry, because the producer picks one
 * and the browser prints a sentence for it.
 *
 * ## Why it moved here from the backend, and when
 *
 * Task 5.5.3 declared this list in `apps/backend/src/volume-baseline.ts` and
 * said in as many words where it would go: *the vocabulary goes to
 * `packages/shared` when the **wire** carries it, which is 5.5.4. Putting it
 * there now would be scaffolding ahead of the step.* This is that step —
 * `ReturnBaselineRefusal`'s own arrangement, one table over.
 *
 * ## It is NOT split into a stored list and a read list, and `return-baseline.ts`
 * ## is
 *
 * That file carries two vocabularies, `RETURN_BASELINE_REFUSALS` and the wider
 * {@link PERCENTILE_REFUSALS}, because the reader is told one thing the pass
 * never wrote. Here the split is **three** ways rather than two — one member
 * the pass stores, two it decides when the row is read, and two produced by a
 * numerator the pass never sees — so a second list in this file would carry a
 * third of the answer and invite the next reader to think it carried all of
 * it. The stored subset stays beside the migration that backs it
 * (`VOLUME_BASELINE_STORED_REFUSALS`), with a type-level assertion that it is a
 * subset of this one, which is the mechanism `PercentileRefusalIsASuperset`
 * already uses.
 */

/**
 * **Why there is no volume multiple — six members, and no two of them are one
 * sentence** (Task 5.5.3's vocabulary, carried to the wire by 5.5.4).
 *
 * A refusal is a first-class outcome rather than an error (invariant 5, ADR
 * 0029), and the list is closed so that a surface cannot collapse two of them
 * into one sentence without a compile error.
 *
 * - `split-discontinuity` — the history crosses a price break we cannot adjust.
 *   **Read** from the price pass's verdict for the same
 *   `(security_id, observed_at)` rather than re-derived: a split multiplies the
 *   share count by exactly the factor the price divides by, so an unadjusted
 *   10:1 split is a **+900%** volume figure.
 * - `too-few-sessions` — this time of day's median cannot be printed to one
 *   decimal. Measured on the **better** tape at full depth, this refuses
 *   **38,448 of 40,248 buckets** (Task 5.5.3).
 * - `no-same-tape-baseline` — we have no IEX history for this security at all.
 *   **Every laptop and every CI run is in this state permanently**, because
 *   `live-bar-writer.ts` only runs where a provider is configured.
 * - `zero-volume-baseline` — the typical minute of this time of day printed no
 *   shares, so the denominator is `0`. A refusal, never an `Infinity`.
 * - `no-bar-in-bucket` — the **numerator** has no bar in the five minutes being
 *   scored. **Absent, never `0`**: on IEX an absent bar is ordinary rather than
 *   a claim that nothing traded, and `Number(null)` is `0`.
 * - `bucket-partially-observed` — the numerator's span holds `k` of its minutes
 *   and the rest were not printed, so its volume is smaller for a **coverage**
 *   reason. Scaling by `5/k` is an imputation and dividing by `k` is its
 *   mirror: both read the minutes IEX did print as representative of the ones
 *   it did not.
 */
export const VOLUME_REFUSALS = [
  "split-discontinuity",
  "too-few-sessions",
  "no-same-tape-baseline",
  "zero-volume-baseline",
  "no-bar-in-bucket",
  "bucket-partially-observed",
] as const;

/** One of {@link VOLUME_REFUSALS}. */
export type VolumeRefusal = (typeof VOLUME_REFUSALS)[number];
