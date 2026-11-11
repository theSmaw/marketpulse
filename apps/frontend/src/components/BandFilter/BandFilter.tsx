import { Link } from "react-router";

import { ANOMALY_BANDS } from "@marketpulse/shared";

import { topologyBandPath, topologyBandWords } from "../../topology/index.js";
import type { TopologyFilter } from "../../topology/index.js";
import {
  FilterDisclosure,
  filterDisclosureOption,
} from "../FilterDisclosure/FilterDisclosure.js";

// **The control that narrows the market topology to one or more bands** (Task
// 6.8.2) — `SectorFilter`'s sibling, sharing its disclosure and nothing else.
//
// ## Five `<Link>`s, and four of them are TOGGLES
//
// This is the one respect in which it differs from the sector control, and it
// is the criterion's own shape rather than a design choice: a sector is one of
// twelve, and a band cut is a **set**. A reader who has `high` and wants
// `extreme` as well must be able to say so in one press, so each of the four
// band destinations is *this band, in or out of what the address already says*
// (`topologyBandPath`), with `All bands` the fifth and the way out.
//
// `aria-current="true"` therefore appears on **more than one** link at a time,
// which is correct for this control and would be a defect in the other: it
// marks every value that is currently in force, and there can be four.
//
// ## `unscored` is not one of the five, deliberately
//
// `TopologyAnomalyTreatment` has five members and `ANOMALY_BANDS` has four.
// The fifth, `"unscored"`, is **the absence of a score rather than a reading of
// one** — that type's own docblock — so it is not a band a reader can narrow
// to, and offering it would make *we have no answer for this security* look
// like a fifth kind of answer. What this product says about that state is
// `TOPOLOGY_BAND_REFUSAL`, which is a sentence over the graph rather than a
// value in a list.

export interface BandFilterProps {
  /**
   * The criterion the address names — `useTopologyFilter()`.
   *
   * Carried whole for {@link SectorFilter}'s own reason, and here it is
   * load-bearing twice over: each destination is a toggle **against the bands
   * the address already names**, so this control cannot be written from a bare
   * value at all.
   */
  readonly filter: TopologyFilter;
}

export function BandFilter({ filter }: BandFilterProps) {
  return (
    <FilterDisclosure subject="Band" value={bandFilterValue(filter.bands)}>
      {(close) =>
        [null, ...ANOMALY_BANDS].map((band) => {
          const current = band !== null && filter.bands.includes(band);

          return (
            <Link
              aria-current={current ? "true" : undefined}
              className={filterDisclosureOption(
                band === null ? filter.bands.length === 0 : current,
              )}
              key={band ?? "all"}
              onClick={close}
              to={topologyBandPath(filter.search, band)}
            >
              {band ?? ALL_BANDS}
            </Link>
          );
        })
      }
    </FilterDisclosure>
  );
}

/**
 * **What the trigger says the picture is narrowed to — and it stops spelling
 * the bands out at three** (Task 6.8.2).
 *
 * `topologyBandWords` is the one home for the vocabulary and it is used
 * verbatim up to two bands. At three and four it is not: `normal, elevated,
 * high or extreme` is 34 characters of `--font-data` under `white-space:
 * nowrap`, in a control sharing a 308 px region header at 390 with the sector
 * trigger and `Reset view` — and `MARKET-OVERVIEW.md` §1.4's displacement
 * trigger has fired on this region three times already. `3 bands` is the same
 * fact at a fifth of the width, and the note over the graph spells the
 * criterion out in full for anybody who wants it.
 *
 * **Three rather than two is where the line falls because two is the common
 * case**: `high or extreme` is the question this feature exists for, and a
 * reader who asked it should see it rather than `2 bands`.
 */
export function bandFilterValue(bands: readonly string[]): string {
  if (bands.length === 0) return ALL_BANDS;
  if (bands.length >= 3) return `${String(bands.length)} bands`;

  return topologyBandWords(
    bands.filter((band): band is (typeof ANOMALY_BANDS)[number] =>
      (ANOMALY_BANDS as readonly string[]).includes(band),
    ),
  );
}

/**
 * The fifth value — **every band**.
 *
 * `All bands` rather than `Any band`, for `SectorFilter`'s own `All sectors`
 * reason and one of this control's own: *any* reads as a predicate a security
 * has to satisfy, and this value applies no predicate at all. It is also not
 * the same claim as *all four bands named*: an unscored market draws under
 * this value and matches none of the four.
 */
const ALL_BANDS = "All bands";
