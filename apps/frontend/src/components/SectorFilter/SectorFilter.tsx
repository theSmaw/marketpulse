import { Link } from "react-router";

import { SECTORS, SECTOR_LABELS } from "@marketpulse/shared";

import { topologySectorPath } from "../../topology/index.js";
import type { TopologyFilter } from "../../topology/index.js";
import {
  FilterDisclosure,
  filterDisclosureOption,
} from "../FilterDisclosure/FilterDisclosure.js";

// **The control that narrows the market topology to one sector** (Task 6.8.1).
//
// ## Twelve `<Link>`s and no imperative navigation anywhere
//
// Every destination is resolved **at render** from the address this filter was
// read out of (`topologySectorPath`), so `one-home-for-imperative-navigation`
// — a check over every shipped source file in three trees, whose clause is
// *the call that moves the address* — has nothing here to find. That is the
// decision `STORY.md`'s Work item asked for rather than a style: the obvious
// control for twelve mutually exclusive values is a `<select>` with an
// `onChange` that calls `setSearchParams`, and that is the one shape this
// product's own invariant exists to refuse, because a destination computed in
// a handler is a destination a frame can land in the middle of.
//
// `TimeWindowControl` is the near-precedent and it is deliberately NOT copied:
// that control takes an `onChange` and the ROUTE navigates, because the route
// in question is `SecurityExplorer`, the one file in this application allowed
// to. `/` is not that file.
//
// ## The disclosure itself moved out at Task 6.8.2
//
// Twelve values do not fit a segmented control: the eleven sector names are
// ~900 px of type and the region's whole header is 308 px at 390, where the
// band legend is already hidden for want of room (`MarketOverview.module.css`
// carries that measurement). So the shipped shape is a disclosure — and when
// `BandFilter` became a second one beside it, the trigger, the panel and the
// four dismissals went to `FilterDisclosure`, which is where that reasoning
// now lives. What is left here is only what is about **sectors**.

export interface SectorFilterProps {
  /**
   * The criterion the address names — `useTopologyFilter()`.
   *
   * Carried whole rather than as a bare `Sector | null`, because this control
   * builds twelve destinations and each of them has to preserve whatever else
   * the query string holds — including the band parameter, which is the other
   * half of this region's own criterion. {@link TopologyFilter.search} is that
   * address.
   */
  readonly filter: TopologyFilter;
}

export function SectorFilter({ filter }: SectorFilterProps) {
  return (
    <FilterDisclosure
      subject="Sector"
      value={
        filter.sector === null ? ALL_SECTORS : SECTOR_LABELS[filter.sector]
      }
    >
      {(close) =>
        [null, ...SECTORS].map((sector) => {
          const current = sector === filter.sector;

          return (
            <Link
              aria-current={current ? "true" : undefined}
              className={filterDisclosureOption(current)}
              key={sector ?? "all"}
              onClick={close}
              to={topologySectorPath(filter.search, sector)}
            >
              {sector === null ? ALL_SECTORS : SECTOR_LABELS[sector]}
            </Link>
          );
        })
      }
    </FilterDisclosure>
  );
}

/**
 * The twelfth value — **every sector**.
 *
 * `All sectors` rather than `All`, which reads as an answer to no question in
 * a control whose own name is already `Sector`; and rather than
 * `Every sector`, because this is the value a reader returns to and the note
 * over the graph says `Show all` for the same act. Two strings for one act is
 * accepted here and is not a second home for a fact: one is a **value in a
 * list of twelve** and the other is a **control that undoes everything**, and
 * `All sectors` as a link over the graph would read as a filter rather than as
 * the way out of one.
 */
const ALL_SECTORS = "All sectors";
