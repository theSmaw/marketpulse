import type { Security, SecurityLastClose } from "@marketpulse/shared";
import { SECTOR_LABELS } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import type { SecuritiesView } from "../../use-securities.js";
import { Badge } from "../Badge/Badge.js";
import { Marker } from "../Marker/Marker.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import { changePercent } from "../UniverseTable/last-close.js";
import {
  directionOf,
  formatChangePercent,
  formatPrice,
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
}

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

export function SecurityIdentity({ symbol, view }: SecurityIdentityProps) {
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
      <Close lastClose={lastClose} />
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
 * ## Why the label says *session* and the qualifier says *daily bar*
 *
 * Found by looking at the page rather than by a test. This figure comes from a
 * stored **`1d`** bar — `GET /securities` reads `readLastCloses("1d")`, the
 * session's official closing price. The panel directly below it renders the
 * last **minute** bar of the window it was asked for, and for NVDA on
 * 2026-09-04 the two are `230.36` and `230.34`. Both are correct and they are
 * two different measurements; two inches apart with one word — "close" — on
 * both of them, they read as one number that cannot make its mind up.
 *
 * So the grain is stated rather than implied, in three words that cost nothing.
 * **The bar count that used to be on this line is gone for the same reason**:
 * a minute-bar depth beside a daily close invited exactly the reading that a
 * daily close is what those minute bars add up to. How much history we hold is
 * the price region's answer and the universe table's column, and neither of
 * them is pretending to be identity.
 */
function Close({
  lastClose,
}: {
  readonly lastClose: SecurityLastClose | undefined;
}) {
  if (lastClose === undefined) {
    return (
      <div className={cx(styles.close)}>
        <p className={cx(styles.closeLabel)}>Last session close</p>
        <p className={cx(styles.noClose)}>None stored</p>
        <p className={cx(styles.qualifier)}>no daily bar held</p>
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
        {lastClose.session} · from a stored daily bar
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
