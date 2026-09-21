import { useState } from "react";

import type { Bar, Security, SecurityLastClose } from "@marketpulse/shared";
import {
  EXTENDED_HOURS_WORDS,
  SECTOR_LABELS,
  extendedHoursAt,
} from "@marketpulse/shared";

import { cx } from "../../cx.js";
import type { SecuritiesView } from "../../use-securities.js";
import { Badge } from "../Badge/Badge.js";
import { Marker } from "../Marker/Marker.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import { changeFromClose, changePercent } from "../UniverseTable/last-close.js";
import {
  directionOf,
  formatBarInstant,
  formatChangePercent,
  formatPrice,
  observationIdentity,
} from "../../market/index.js";
import styles from "./SecurityIdentity.module.css";

// Whose page this is (Task 2.11.7).
//
// The Security Explorer answers PRODUCT_SPEC.md §8.3 — *"what is happening with
// this security?"* — and until this component it never said **which** security
// above the fold: the route's `h1` is the screen's name, and the symbol
// appeared only as the bar panel's own subject heading, three surfaces down. A
// person arriving from a link had the name of a screen and no company on it.
//
// ## It is the one display-size surface on the page, and that is deliberate
//
// `VISUAL-LANGUAGE.md`'s display size exists for exactly one job per screen.
// Spending it here — on the symbol and on the last close — is what makes a page
// of seven panels read as *an instrument pointed at NVDA* rather than as a
// dashboard that happens to be filtered. Everything below is 13px.
//
// ## The symbol comes from the address, the rest comes from a fetch
//
// That asymmetry is the whole state machine. `useSecuritySymbol` reads the path
// segment synchronously, so the symbol can be printed at full size on the first
// frame; the name, the sector, the exchange and the close all live in the
// tracked universe, which is in flight for a few hundred milliseconds and may
// never arrive at all.
//
// So the loading state is **not a skeleton**. A grey bar where a company name
// will be is a promise that something is coming, and this component cannot make
// that promise — the universe may fail. It prints what it knows and says what
// it is waiting for, which is the same answer `SecuritySearch` gives for the
// same fetch in its own words.
//
// ## What it deliberately does not do
//
// **It does not announce.** `FRONTEND-STATE.md` §7's rule is one live region
// per subject, and `SEARCH-AND-SELECTION.md` §4 already spent this page's third
// region on search — on an argument (it speaks only 400ms after a keystroke)
// that a fourth surface cannot borrow, because this one fills at exactly the
// moment the other two do. It is therefore a surface that fills asynchronously
// and **has no `role="status"`**: the universe's own region already speaks for
// this fetch, and a second sentence about it in the same moment is the queueing
// defect §7 exists to prevent. Recorded as a decision in
// `SEARCH-AND-SELECTION.md` rather than left as a consequence of a layout.
//
// **It does not repeat the panel's sentences.** `BarSeriesPanel` says
// *"MarketPulse no longer tracks this security. These bars are what was stored
// while it did"* and *"Showing a default security"*. Both are qualifications on
// **the bars**. This block carries the untracked *chip* — a fact about the
// security, read before the figures rather than after them — and neither
// sentence. Two surfaces opening with the same clause read as one paragraph
// printed twice, which Task 2.11.6 met three times in one afternoon.
//
// **It is a `<div>` and not a `<header>`**, which cost a test run to discover
// and is the same trap `PageHeader` records. HTML maps `<header>` to the
// **banner** landmark unless it is scoped inside `article`, `aside`, `main`,
// `nav` or `section` — and this one *is* inside `<main>` — but the mapping used
// by the component tests does not implement that scoping. `App.test.tsx` asks
// for `getByRole("banner")` to find the chrome and got two, on every route at
// once. A real browser and axe scope it correctly, so the disagreement is the
// point: this would have been an application that passes its browser suite and
// fails its component tests, with neither result wrong.
//
// **It does not fetch.** It takes `SecuritiesView` whole, for `UniverseTable`'s
// reason: the union exists so the impossible combinations cannot be built, and
// handing a renderer the pieces gives back the boolean space it removed.

export interface SecurityIdentityProps {
  /** The security this page is about, from the address. Always known. */
  readonly symbol: string;

  /** The tracked universe, in whatever state it is in. */
  readonly view: SecuritiesView;

  /**
   * Whether {@link SecurityIdentityProps.live} was delivered by a **snapshot**
   * rather than by a bar arriving (Task 3.5.4).
   *
   * **A snapshot is not an arrival.** Story 3.4's mark means *a bar arrived for
   * this security*; a snapshot is *what we already held when you connected*.
   * Defaults to `false`, which is the pre-3.5.4 behaviour and the right answer
   * for every caller that has no snapshot to speak of.
   */
  readonly liveFromSnapshot?: boolean;

  /**
   * The latest observation for this security, when the live feed has sent one
   * (Task 3.4.2).
   *
   * **`undefined` is the ordinary answer, not a failure.** A deployment with no
   * provider never has one; a connected one fills unevenly, because §7.6
   * measured IEX covering **65.1% of minutes for a median symbol and 2.1% for
   * `ERIE`**, and §7.2 measured a quiet minute producing **no frame at all**.
   * A surface that rendered absence as an error would render it constantly.
   */
  readonly live?: Bar;
}

/**
 * Which arrival, if any, this render should mark — Task 3.4.5.
 *
 * **The mark fires when a bar ARRIVES, not when the price CHANGES**, and this
 * function is the whole of that decision. A renderer that compared `close` to
 * the previous `close` would implement *mark on change*: it is the natural
 * thing to write, it looks correct, and **a test that ticks a different price
 * passes against it**, because the two only disagree on the quiet minute.
 *
 * So the trigger is the observation's own **instant**. §10.3 already requires
 * every entry to carry its own `startsAt`, and a bar for a new minute carries a
 * new one — *something arrived* is therefore readable without looking at a
 * price at all.
 *
 * ## Why the mounted instant is remembered
 *
 * A mark on the first paint would claim a bar arrived when the page merely
 * loaded. The instant this component first saw is held in state and never
 * advanced, so **any instant that is not that one is an arrival** — which is
 * correct whether the first bar was in the connect-time snapshot (§11.1) or
 * turned up a minute later.
 *
 * **Reset on a change of symbol**, because the route does not re-mount this
 * component — Task 2.11.5 measured that — so without this, navigating to a
 * security whose price we already hold would mark an arrival that happened
 * while somebody was looking at a different company.
 */
function useArrival(
  symbol: string,
  observation: string | undefined,
  fromSnapshot: boolean,
): string | undefined {
  const [mounted, setMounted] = useState({ symbol, observation });

  if (mounted.symbol !== symbol) {
    // Adjusting state during render rather than in an effect: React's own
    // pattern for state derived from props, and the only one that does not
    // paint a frame of the wrong answer first.
    setMounted({ symbol, observation });
    return undefined;
  }

  // **A snapshot sets the baseline; a bar changes it** (Task 3.5.4).
  //
  // This block mounts BEFORE the socket delivers anything, so it mounts
  // holding nothing. Once the snapshot carries prices, the figure changes from
  // *absent* to *a price* — which is indistinguishable here from a bar
  // arriving. Without this branch the mark would fire on **every page load**,
  // announcing as news the thing the reader has just asked to see, and a mark
  // that fires every visit means nothing.
  //
  // **Delivery decides rather than content**, which is why the flag comes down
  // from the store rather than being inferred: *ignore whichever observation
  // arrives first* would also suppress a genuine first bar for a thin security
  // the server had never observed — §7.6 measured 2.1% minute coverage for
  // `ERIE`, so that case is ordinary rather than hypothetical.
  if (fromSnapshot) {
    if (observation !== mounted.observation)
      setMounted({ symbol, observation });
    return undefined;
  }

  if (observation === undefined || observation === mounted.observation) {
    return undefined;
  }
  return observation;
}

/*
 * `observationIdentity` moved to `market/arrival.ts` on 2026-09-21, when Task
 * 3.6.2 gave the arrival mark a second consumer. Two implementations of *what
 * counts as an arrival* is the shape Task 3.5.2 removed from the subscription:
 * two policies that agree today, disagree invisibly, and nothing saying which
 * is authoritative. The rule and its whole argument are in that file.
 */

/**
 * Three schema kinds, two words. The `sector_etf`/`index_etf` split is real and
 * is not the distinction a reader needs — it is `SecuritySearch`'s judgement,
 * reached independently there, and the two must agree or SPY reads as a
 * different kind of thing on two surfaces of one screen.
 */
const KIND_WORDS: Readonly<Record<Security["kind"], string>> = {
  equity: "Equity",
  sector_etf: "ETF",
  index_etf: "ETF",
};

export function SecurityIdentity({
  symbol,
  view,
  live,
  liveFromSnapshot = false,
}: SecurityIdentityProps) {
  const found =
    view.state === "loaded"
      ? view.securities.find((security) => security.symbol === symbol)
      : undefined;

  if (found === undefined) {
    return (
      <div className={cx(styles.identity)}>
        {/* Both in the `profile` column, so the sentence sits **under** the
            symbol rather than opposite it. The populated block's two children
            are pushed apart by `space-between`, which is right for a name and a
            figure and wrong for a name and the sentence explaining it — that
            arrangement floats a paragraph against the right edge of a 1440px
            screen with nothing under it. Found by looking at the page. */}
        <div className={cx(styles.profile)}>
          <div className={cx(styles.subject)}>
            <h2 className={cx(styles.symbol, styles.unresolved)}>{symbol}</h2>
            <Marker shape={SHAPE_FOR_ABSENCE[absenceOf(view)]} />
          </div>
          <p className={cx(styles.absence)}>{ABSENCE_COPY[absenceOf(view)]}</p>
        </div>
      </div>
    );
  }

  const lastClose =
    view.state === "loaded" ? view.lastCloses.get(symbol) : undefined;

  return (
    <div className={cx(styles.identity)}>
      <div className={cx(styles.profile)}>
        <div className={cx(styles.subject)}>
          <h2 className={cx(styles.symbol)}>{found.symbol}</h2>
          <Badge>{KIND_WORDS[found.kind]}</Badge>
          {/* A chip and not a sentence — see the note above the component. */}
          {found.status === "active" ? undefined : (
            <Badge tone="selected">Untracked</Badge>
          )}
        </div>
        <p className={cx(styles.name)}>{found.name}</p>
        <p className={cx(styles.classification)}>
          {classificationOf(found).join(" · ")}
        </p>
      </div>
      <Close
        symbol={symbol}
        lastClose={lastClose}
        live={live}
        liveFromSnapshot={liveFromSnapshot}
      />
    </div>
  );
}

/**
 * The right-hand figure, and the qualifier that stops it being a lie.
 *
 * **A close is the last session we hold a bar for, not today.** The store is
 * caught up nightly and the free plan refuses the most recent fifteen minutes,
 * so during a live session this figure is behind the calendar — which is why
 * the session date travels with it rather than being implied by the fact that
 * it is large. `SEARCH-AND-SELECTION.md` §5 narrowed the result row the same
 * way and for the same reason; this is that decision applied to the one place
 * the figure is 28px.
 *
 * The label says **close**, never "price". Nothing in this product is labelled
 * a price while the live feed does not exist.
 *
 * ## What the qualifier line says, and what it stopped saying on 2026-09-15
 *
 * It reads `2026-09-11 · change from the previous close`. Until this change it
 * read `· from a stored daily bar`, and both halves of that swap were prompted
 * by a person looking at the deployed page and not understanding it.
 *
 * **"from a stored daily bar" was our vocabulary, not a reader's.** It was
 * carrying the *grain*: this figure comes from a stored **`1d`** bar —
 * `GET /securities` reads `readLastCloses("1d")`, the session's official
 * closing price, closing auction included — while the panel directly below
 * renders the last **minute** bar of the window it was asked for. They differ
 * by pennies (`218.29` against `218.19` on 2026-09-11; `230.36` against
 * `230.34` on 2026-09-04) and both are correct. That distinction is real and
 * still has to be drawn — it is drawn **on the panel** now, where the unusual
 * figure is, by the `CLOSE` metric that names its window. Qualifying the
 * ordinary number was making a reader decode a sentence to understand why the
 * *other* one was different.
 *
 * **What the line says instead is the baseline of the percentage beside it**,
 * which nothing on this page stated and which is the thing that actually
 * confused somebody. This block's change is `close` against the **previous
 * session's** close (`UniverseTable/last-close.ts`) — the standard quote
 * convention, and it includes the overnight gap on purpose. The panel's is
 * open-to-close **across the window on screen**, and it excludes the gap on
 * purpose. On 2026-09-11 that is −0.03% here and −1.38% there, from the same
 * session: NVDA gapped up 1.3% at the open and gave all of it back. Two
 * unlabelled percentages 1.35 points apart read as one number contradicting
 * itself; each is right once it says what it is measured from.
 *
 * The clause is **omitted when there is no previous close**, rather than
 * printed as a claim about a comparison that was not made. The figure says
 * `No previous session` in that case and a qualifier repeating it is furniture.
 *
 * **The bar count that used to be on this line is gone** for the reason the
 * grain note has now followed: a minute-bar depth beside a daily close invited
 * exactly the reading that a daily close is what those minute bars add up to.
 * How much history we hold is the price region's answer and the universe
 * table's column, and neither of them is pretending to be identity.
 */
function Close({
  symbol,
  lastClose,
  live,
  liveFromSnapshot,
}: {
  readonly symbol: string;
  readonly lastClose: SecurityLastClose | undefined;
  readonly live: Bar | undefined;
  readonly liveFromSnapshot: boolean;
}) {
  // **A live price changes the SUBJECT of this block, and all three lines move
  // together** (Task 3.4.2). That is what makes it a stated substitution rather
  // than a silent one: a live price is not a newer version of a session close,
  // it is a different number measured from a different thing and true at a
  // different time.
  const arrival = useArrival(
    symbol,
    observationIdentity(live),
    liveFromSnapshot,
  );

  if (live !== undefined) {
    const { percent, basis } = changeFromClose(live, lastClose);
    const extendedHours = extendedHoursAt(live.startsAt);

    return (
      <div className={cx(styles.close)}>
        {/*
          **Not `LIVE`.** §11.2: a security gets no status word — the gap
          between one security's bars has a p50 of one minute and a maximum of
          **187**, so no threshold separates a quiet security from a broken one,
          and this product has already refused to make that claim per security.
          **Not `Last trade`** either: this is a minute bar's close, and the last
          trade is a different thing we do not have.
        */}
        <p className={cx(styles.closeLabel)}>Latest price</p>
        {/*
          **Task 3.4.4's two `data-` hooks were removed here rather than kept.**
          They existed so an instrument outside this module could position a
          candidate against a CSS Module's generated class name; the instrument
          is gone and the chosen mark lives inside the module, so `styles.price`
          is the anchor and the attributes had no reader left. A hook nobody
          reads is the exact shape Story 3.2 and Task 3.4.3 each spent a task
          finding — this story is not adding a third.
        */}
        <p className={cx(styles.figure)}>
          <span className={cx(styles.price)}>
            {/*
              **The arrival mark.** `key` is the mechanism and not a detail: a
              CSS animation does not restart when the same animation is
              re-applied to the same element, so React replacing the node is
              what makes it run again. That is also the answer to *two changes
              inside one animation* — **restart, never queue or overlap** —
              because there is only ever one node. §7.8 measured 14 revisions in
              one session, three of which changed a close, so a corrected minute
              arriving seconds after the first is a real second change rather
              than a hypothetical one.

              **Not a `key` on the block**, which is the obvious version and is
              wrong: `.identity` animates its own arrival, so remounting replays
              *the block arriving* on every price change — a fading, sliding
              panel, which is the one thing `VISUAL-LANGUAGE.md`'s motion rule
              forbids outright.

              `aria-hidden`, because what a listener is handed is the DOM text
              and the standing rule is **do not announce a price change by
              default**. Task 3.4.7 takes the live-region decision.
            */}
            {arrival === undefined ? undefined : (
              <span
                key={arrival}
                className={cx(styles.arrival)}
                aria-hidden="true"
                data-arrival={arrival}
              />
            )}
            {formatPrice(live.close)}
          </span>
          {percent === null ? undefined : (
            <PriceChange
              change={formatChangePercent(percent)}
              direction={directionOf(percent)}
            />
          )}
        </p>
        {/*
          **The instant takes the first slot**, which is §10.3's rule applied:
          every entry carries its own instant and no reader may render a price
          without reading it. A live price is at most about a minute old for a
          liquid security and **may legitimately be hours old** for a thin one —
          both are the feed working, and the instant is the only thing that
          tells them apart.

          **And the displaced close is NAMED rather than deleted.** The change
          was always *from the previous close*; it is now from a close with a
          date on it, which is the difference between replacing a claim and
          superseding one.
        */}
        <p className={cx(styles.qualifier)}>
          {[
            formatBarInstant(live.startsAt, "1m"),
            // **The extended-hours mark, and it sits beside the instant
            // because it IS the instant interpreted** (Task 3.4.6). Nothing on
            // the wire distinguishes a pre-market bar — §7.7 — so this is
            // derived from the bar's own instant against Story 2.5's calendar,
            // and §7.11 settles that such bars are rendered and MARKED rather
            // than filtered. Absent for a regular-session price: silence means
            // the ordinary case, which is the same call the chrome makes for
            // `LIVE` carrying no timestamp.
            extendedHours === undefined
              ? undefined
              : EXTENDED_HOURS_WORDS[extendedHours],
            // **The session the change was measured FROM, which is not
            // always this row's `session`** (Task 3.6.1). Once the nightly
            // backfill has written today, the stored close and the live bar
            // share a session and the basis becomes `previousClose` — a price
            // with no date beside it on the wire. `basis` says which happened,
            // so this clause never names a session the figure was not measured
            // against.
            percent === null
              ? undefined
              : basis === null
                ? "change from the previous close"
                : `change from ${basis}'s close`,
          ]
            .filter((clause) => clause !== undefined)
            .join(" · ")}
        </p>
      </div>
    );
  }

  if (lastClose === undefined) {
    return (
      <div className={cx(styles.close)}>
        <p className={cx(styles.closeLabel)}>Last session close</p>
        <p className={cx(styles.noClose)}>None stored</p>
        <p className={cx(styles.qualifier)}>no daily close stored</p>
      </div>
    );
  }

  const percent = changePercent(lastClose);

  return (
    <div className={cx(styles.close)}>
      <p className={cx(styles.closeLabel)}>Last session close</p>
      <p className={cx(styles.figure)}>
        <span className={cx(styles.price)}>{formatPrice(lastClose.close)}</span>
        {percent === null ? (
          <span className={cx(styles.noChange)}>No previous session</span>
        ) : (
          <PriceChange
            change={formatChangePercent(percent)}
            direction={directionOf(percent)}
          />
        )}
      </p>
      <p className={cx(styles.qualifier)}>
        {percent === null
          ? lastClose.session
          : `${lastClose.session} · change from the previous close`}
      </p>
    </div>
  );
}

/**
 * The line under the company name: what kind of thing this is, in the
 * vocabulary a person uses rather than the schema's.
 *
 * Absent members are **omitted rather than filled with an em dash**. An index
 * proxy belongs to no sector — that is what `sector: null` means — and printing
 * "No sector" for SPY states an absence where the honest reading is that the
 * question does not apply. `industry` is nullable for the same class of reason.
 */
function classificationOf(security: Security): readonly string[] {
  const sector =
    security.sector === null ? "Market proxy" : SECTOR_LABELS[security.sector];

  return [sector, security.industry, security.exchange].filter(
    (part): part is string => part !== null,
  );
}

/**
 * Why there is no profile. Four reasons, and they are genuinely different
 * things to be told — which is why this is a union rather than one "unavailable"
 * sentence with a boolean in it.
 */
type Absence = "loading" | "unlisted" | "unreadable" | "empty";

function absenceOf(view: SecuritiesView): Absence {
  switch (view.state) {
    case "loading":
      return "loading";
    case "loaded":
      // Loaded, and the symbol is not in it. Reachable by typing an address,
      // which is a thing people do with a URL that has a symbol in it.
      return "unlisted";
    case "empty":
      return "empty";
    case "failed":
      return "unreadable";
  }
}

/**
 * Each sentence opens on its own clause. Nothing else on this screen begins
 * "Reading", "MarketPulse does not track" or "No profile" — search's hints open
 * "Nothing to search", the table's states open "The tracked universe", and the
 * bar panel's open with the window it asked for. The cheap check is a locator:
 * if `getByText` finds two nodes, two surfaces are saying one thing.
 */
const ABSENCE_COPY: Readonly<Record<Absence, string>> = {
  loading:
    "Reading this security’s profile from the tracked universe. Its bars below do not wait for it.",
  unlisted:
    "MarketPulse does not track this security, so there is no company name or sector to show. Search above for one it does.",
  unreadable:
    "No profile for this symbol: the tracked universe is what carries a company name and a sector, and it could not be read. The bars below are unaffected.",
  empty:
    "No profile for this symbol: this service answered correctly and holds no securities at all.",
};

/**
 * The silhouette, and it carries the distinction on its own because colour
 * never may: the dashed ring is this language's *not yet*, the hollow ring is
 * *an answer with nothing in it*, and the square is the one that means somebody
 * has to go and look at something.
 */
const SHAPE_FOR_ABSENCE = {
  loading: "dashed",
  unlisted: "ring",
  unreadable: "square",
  empty: "ring",
} as const;
