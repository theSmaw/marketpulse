import type {
  Security,
  SecurityCoverage,
  SecurityLastClose,
} from "@marketpulse/shared";
import { SECTOR_LABELS } from "@marketpulse/shared";
import type { KeyboardEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cx } from "../../cx.js";
import {
  SEARCH_ANNOUNCEMENT_DELAY_MS,
  SEARCH_ANNOUNCEMENT_MIN_GAP_MS,
  matchSecurities,
  searchAnnouncement,
} from "../../market/index.js";
import type {
  MatchEmphasis,
  SearchCorpus,
  SecurityMatch,
} from "../../market/index.js";
import type { SecuritiesView } from "../../use-securities.js";
import { Badge } from "../Badge/Badge.js";
import { Marker } from "../Marker/Marker.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import { TextField } from "../TextField/TextField.js";
import {
  changePercent,
  commonSession,
  directionOf,
  formatChangePercent,
  formatPrice,
} from "../UniverseTable/last-close.js";
import a11y from "../../styles/a11y.module.css";
import styles from "./SecuritySearch.module.css";

// The product's first interactive control (Task 2.11.4): type a symbol or a
// name, open a security. **In every state it can be in** (Task 2.11.6).
//
// Everything shipped before this is a page that loads, states something true
// and sits still. So this file is also the precedent for every control after
// it — Story 2.13's window control, Epic 8's comparison picker, Epic 11's
// symbol switcher — and the parts worth copying are the ones that are not
// obvious.
//
// ## It is a combobox built to the pattern, not to a resemblance of one
//
// `role="combobox"` on the input, a `listbox` of `option`s, `aria-expanded`,
// `aria-controls`, and **active descendant rather than moving DOM focus into
// the list**. That last one is the whole pattern: focus stays in the input the
// entire time, so typing never has to be interrupted to look at a result, and
// the "active" row is a pointer (`aria-activedescendant`) rather than a
// focused element. It is also why the active row is drawn with a tone *and* an
// inset bar — a person using a mouse and the keyboard at once has a hover row
// and an active row on screen simultaneously, and they must not be the same
// drawing.
//
// ## It takes the page's state, not a universe, and that changed here
//
// Until Task 2.11.6 this component took `universe` and `lastCloses` and the
// route rendered it **only once the fetch had succeeded**. That is not a
// designed state, it is the absence of one: while the universe was loading, or
// unreachable, or answered badly, the field simply was not on the page — the
// least honest of the available answers, and a thing a person cannot tell from
// a product that has no search.
//
// So it takes `SecuritiesView` whole, for `UniverseTable`'s reason: the union
// exists so the impossible combinations cannot be built, and handing a renderer
// the pieces gives back the eight-way boolean space it removed. What this
// component still cannot do is fetch anything, which is what keeps every state
// below reviewable in the workshop with no backend running.
//
// ## What it does not own
//
// **Navigation.** It reports `onOpen(symbol)` and the route turns that into
// `securityPath(symbol)`. The route pattern exists once in `ROUTE_PATTERNS`,
// `securityPath()` is the only thing that builds a destination from it, and a
// component that called `useNavigate` itself would be a third spelling of that
// path — as well as a component that cannot be rendered in a story without a
// router around it.
//
// **The retry.** There is exactly one control on this screen that re-asks for
// the universe and it belongs to the universe (`UniverseTable`). Search and the
// table read the *same* fetch, so a failure already puts two explanations on
// one screen; giving each of them its own *Try again* teaches a reader that
// neither is the real one. This states the fact and defers the control — which
// is why there is no `onRetry` in the props below.
//
// **The page's layout.** Task 2.11.7 owns the Security Explorer's shell. This
// sits where `SEARCH-AND-SELECTION.md` §1 put it and rearranges nothing.
//
// ## The rate, which is the thing most likely to be built backwards
//
// The visible list updates on **every keystroke**; only the spoken sentence
// waits, and it waits 400 ms. See `search-announcement.ts` — the argument
// lives with the constant.

/** How a `kind` reads to a person, which is not how the column reads. */
const KIND_WORDS: Readonly<Record<Security["kind"], string>> = {
  equity: "Equity",
  // Three kinds map onto two words on purpose. `sector_etf` and `index_etf`
  // are a real distinction in the schema and not the distinction a person
  // searching needs — rendering them verbatim puts `SECTOR ETF` beside
  // `INDEX ETF` as though *that* difference were why SPY behaves unlike NVDA.
  sector_etf: "ETF",
  index_etf: "ETF",
};

/**
 * What the field matches against when there is nothing to match against.
 *
 * Module constants rather than literals in the render, so the memo below keys
 * on a stable identity in every non-loaded state and the matcher is not re-run
 * on every keystroke against a new empty array.
 */
const NO_SECURITIES: readonly Security[] = [];
const NO_CLOSES: ReadonlyMap<string, SecurityLastClose> = new Map();
const NO_COVERAGE: ReadonlyMap<string, SecurityCoverage> = new Map();

export interface SecuritySearchProps {
  /**
   * What this page knows about the universe, **whole**.
   *
   * Matching is client-side over the list the page has already fetched
   * (`SEARCH-AND-SELECTION.md` §2), so this component issues no request of its
   * own — and it renders the four states of that fetch rather than being
   * rendered only in one of them.
   */
  readonly view: SecuritiesView;

  /** Called with the symbol when a result is chosen. */
  readonly onOpen: (symbol: string) => void;
}

export function SecuritySearch({ view, onOpen }: SecuritySearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const id = useId();
  const listboxId = `${id}-results`;
  const optionId = (index: number) => `${id}-option-${String(index)}`;

  const loaded = view.state === "loaded";
  const universe = loaded ? view.securities : NO_SECURITIES;
  const lastCloses = loaded ? view.lastCloses : NO_CLOSES;
  const coverage = loaded ? view.coverage : NO_COVERAGE;

  // Matching is a synchronous scan and is deliberately not debounced. `useMemo`
  // is here because the render also builds rows, not because the scan is slow.
  const result = useMemo(
    () => matchSecurities(universe, query),
    [universe, query],
  );
  const { matches, total } = result;

  // The session the surface names once, in its footer. `null` when the stored
  // closes do not all share one — in which case the surface says nothing about
  // a session and every row carries its own.
  const surfaceSession = useMemo(() => commonSession(lastCloses), [lastCloses]);

  // What the field can do at all, which is a property of the fetch rather than
  // of the query. `empty` and `failed` are both *there is nothing to search*
  // and differ only in the sentence that says why.
  const unavailable = view.state === "empty" || view.state === "failed";
  const loading = view.state === "loading";

  // **Two open-nesses, and conflating them is the likely defect.** `showing` is
  // whether a surface is drawn — which includes the two states whose surface is
  // a sentence rather than a list. `expanded` is the ARIA claim, and it is only
  // true when the thing `aria-controls` points at exists and holds options: a
  // combobox that says it is expanded over a listbox that is not in the
  // document is a defect axe catches and a screen reader announces as a lie.
  //
  // What a listener gets in the sentence states is the live region below, which
  // says the same thing and names its subject while doing it.
  const showing = open && !unavailable && query.trim() !== "";
  const expanded = showing && matches.length > 0;
  const activeIndex =
    matches.length === 0 ? -1 : Math.min(active, matches.length - 1);

  const hint = hintFor(view);

  const corpus: SearchCorpus = loading
    ? { state: "loading" }
    : { state: "ready", result };
  const spoken = useAnnouncement(query, corpus);

  function choose(index: number) {
    const match = matches[index];
    // Enter with zero matches does nothing. Guessing a destination from a query
    // that matched nothing turns a dead end into a wrong answer.
    if (match === undefined) return;
    setOpen(false);
    onOpen(match.security.symbol);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (matches.length === 0) return;
        event.preventDefault();
        setOpen(true);
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActive(
          (current) =>
            (Math.min(current, matches.length - 1) + step + matches.length) %
            matches.length,
        );
        return;
      }
      case "Enter": {
        if (!expanded) return;
        event.preventDefault();
        choose(activeIndex);
        return;
      }
      case "Escape": {
        // The first Escape closes the list and **keeps** the query — the person
        // has not finished typing. Calling `preventDefault` is what stops
        // `TextField`'s own Escape-to-clear from firing, so a second press
        // falls through to it and clears. Two behaviours, one key, and the
        // order is the one a person expects.
        if (showing) {
          event.preventDefault();
          setOpen(false);
        }
        return;
      }
      default:
        return;
    }
  }

  return (
    <div className={cx(styles.search)}>
      <div className={cx(styles.anchor)}>
        <TextField
          label="Find a security"
          value={query}
          onValueChange={(next) => {
            setQuery(next);
            setOpen(true);
            setActive(0);
          }}
          onClear={() => {
            setQuery("");
            setOpen(false);
            setActive(0);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setOpen(false);
          }}
          onFocus={() => {
            setOpen(true);
          }}
          icon="magnifier"
          placeholder={placeholderFor(view)}
          // Spread rather than passed, because `exactOptionalPropertyTypes` is
          // on and *absent* and *present as `undefined`* are different types.
          // The loaded state has no hint at all, which is not the same as a
          // hint whose value is nothing.
          {...(hint === undefined ? {} : { hint })}
          // **Disabled only where the control genuinely cannot answer**, and
          // deliberately **not** while the universe is loading. A field that
          // removes itself while its data loads is what shipped before this
          // task; one that goes grey under a cursor mid-word is the same
          // mistake with better manners. Loading accepts input and holds it.
          disabled={unavailable}
          busy={loading}
          surfaceOpen={showing}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listboxId}
          aria-autocomplete="list"
          {...(expanded && activeIndex >= 0
            ? { "aria-activedescendant": optionId(activeIndex) }
            : {})}
        />

        {showing ? (
          <div className={cx(styles.surface)}>
            <SurfaceBody
              query={query}
              loading={loading}
              matches={matches}
              total={total}
              universeSize={universe.length}
              lastCloses={lastCloses}
              coverage={coverage}
              surfaceSession={surfaceSession}
              activeIndex={activeIndex}
              listboxId={listboxId}
              optionId={optionId}
              onChoose={choose}
              onPoint={setActive}
            />
          </div>
        ) : undefined}
      </div>

      {/* Persistent, and outside the surface above on purpose: §7's first
          mechanical clause is that the region is rendered in every state and
          never unmounted. The surface is torn down on every close, and a region
          a screen reader has not been watching announces nothing when it
          appears. Empty until there is something to say, because arriving here
          with an empty field must be silent. */}
      <p role="status" className={cx(a11y.visuallyHidden)}>
        {spoken}
      </p>
    </div>
  );
}

/**
 * What the field says it is for, which is not the same sentence in every state.
 *
 * The placeholder is the one string a person reads before they read anything
 * else, so a field that cannot answer must not invite a question. It is never
 * the label — `TextField` refuses to let a placeholder stand in for one.
 */
function placeholderFor(view: SecuritiesView): string {
  switch (view.state) {
    case "loading":
    case "loaded":
      return "Search securities (e.g. AAPL)";
    case "empty":
      return "Nothing to search";
    case "failed":
      return "Search unavailable";
  }
}

/**
 * The line under the field: why this control is in the state it is in.
 *
 * `undefined` in the state where nothing needs saying, which is the loaded one
 * — a working control explaining that it works is noise. Everything else here
 * is one or two sentences and is associated with the input through
 * `aria-describedby`, so it is read as part of the control rather than sitting
 * near it.
 *
 * **The retryable distinction is carried by the words and not by a button**
 * (see the header). `FRONTEND-STATE.md` §4's rule is that a retryable failure
 * says waiting may help and a permanent one says it will not, in both
 * directions and always — a failure that offers nothing and explains nothing
 * leaves a reader waiting for a page that will never come good.
 *
 * **None of these repeats the table's own words**, and that is a constraint
 * rather than a style note: both surfaces describe one failure, on one screen,
 * at the same moment, so a sentence that opened with the table's opening clause
 * would read as the same paragraph printed twice — and it is caught by nothing
 * except a browser assertion tripping over two copies of a string, which is how
 * this was found. Each of these leads with *what search can do about it*, which
 * is the only thing search is entitled to say.
 *
 * **Nothing here offers the table as another way in.** The table's rows became
 * links in Task 2.11.5, so "search is unavailable" is normally a degraded state
 * with a working alternative on the same screen — but not from *this* cause:
 * one fetch feeds both, so the state where search cannot answer is the state
 * where there are no rows to click either. A sentence pointing at them would be
 * pointing at an empty table.
 */
function hintFor(view: SecuritiesView): string | undefined {
  switch (view.state) {
    case "loaded":
      return undefined;

    case "loading":
      return "Loading securities. Anything typed is kept and will match as soon as they arrive.";

    case "empty":
      return "Nothing to search: this service answered correctly and holds no securities.";

    case "failed":
      if (view.failure === "unreachable") {
        return "Nothing to search yet: the tracked universe did not answer. A service starting up looks exactly like this, and the control that asks again is with the universe itself.";
      }

      return view.retryable
        ? "Nothing to search yet: the tracked universe is temporarily unavailable. This is usually brief, and the control that asks again is with the universe itself."
        : "Nothing to search: the tracked universe could not be read, and asking again would produce the same answer.";
  }
}

interface SurfaceBodyProps {
  readonly query: string;
  readonly loading: boolean;
  readonly matches: readonly SecurityMatch[];
  readonly total: number;
  readonly universeSize: number;
  readonly lastCloses: ReadonlyMap<string, SecurityLastClose>;
  readonly coverage: ReadonlyMap<string, SecurityCoverage>;
  readonly surfaceSession: string | null;
  readonly activeIndex: number;
  readonly listboxId: string;
  readonly optionId: (index: number) => string;
  readonly onChoose: (index: number) => void;
  readonly onPoint: (index: number) => void;
}

/**
 * What is inside the surface: a list, or a sentence.
 *
 * **The two sentence states are the reason this is a function and not a
 * `matches.map`.** Before Task 2.11.6 a query that matched nothing rendered an
 * empty listbox with `0 matches` under it, which is a result surface reporting
 * its own emptiness as a figure — and a universe that had not arrived rendered
 * exactly the same thing, because an empty corpus matches nothing. The second
 * of those is the one that matters: *"no matches for zzz"* is a claim about the
 * market, and making it while the securities are still in flight is a lie about
 * data we have not seen.
 */
function SurfaceBody({
  query,
  loading,
  matches,
  total,
  universeSize,
  lastCloses,
  coverage,
  surfaceSession,
  activeIndex,
  listboxId,
  optionId,
  onChoose,
  onPoint,
}: SurfaceBodyProps) {
  if (loading) {
    return (
      <Note
        // Dashed, which is this language's silhouette for *not yet* rather than
        // for a state — the same one the panel's held answer uses. Not the
        // amber square, which marks the one condition that needs somebody to go
        // and look at something; this one needs nobody.
        shape="dashed"
        headline="Still loading securities."
        detail={`“${query.trim()}” is kept and will match as soon as the tracked universe arrives.`}
      />
    );
  }

  if (matches.length === 0) {
    return (
      <Note
        // A hollow ring: an answer with nothing in it, which is what the bar
        // panel draws for a window it holds no bars in. No red, no alert and no
        // apology — `zzz` is a reasonable thing to type and getting nothing
        // back is a correct answer rather than a failure.
        shape="ring"
        headline={`No security matches “${query.trim()}”.`}
        detail={`Search covers the ${String(universeSize)} securities MarketPulse holds, by symbol and by company name.`}
      />
    );
  }

  return (
    <>
      <ul
        className={cx(styles.list)}
        id={listboxId}
        role="listbox"
        aria-label="Search results"
      >
        {matches.map((match, index) => (
          <ResultRow
            key={match.security.symbol}
            id={optionId(index)}
            match={match}
            lastClose={lastCloses.get(match.security.symbol)}
            hasBars={coverage.has(match.security.symbol)}
            surfaceSession={surfaceSession}
            active={index === activeIndex}
            onChoose={() => {
              onChoose(index);
            }}
            onPoint={() => {
              onPoint(index);
            }}
          />
        ))}
      </ul>
      <Footer shown={matches.length} total={total} session={surfaceSession} />
    </>
  );
}

/**
 * A surface whose content is a sentence.
 *
 * It is deliberately **not** a live region and carries no ARIA role at all: the
 * component already has one region for this subject, and a second element
 * announcing the same fact is how a listener hears one thing twice in an order
 * nobody controls. What is written here is for the eye; the live region says it
 * for the ear.
 */
function Note({
  shape,
  headline,
  detail,
}: {
  readonly shape: "ring" | "dashed";
  readonly headline: string;
  readonly detail: string;
}) {
  return (
    <div className={cx(styles.note)}>
      <p className={cx(styles.noteHeadline)}>
        <Marker shape={shape} />
        <span>{headline}</span>
      </p>
      <p className={cx(styles.noteDetail)}>{detail}</p>
    </div>
  );
}

/**
 * The live region, and the only thing on this screen that waits.
 *
 * Four mechanical clauses inherited whole from `FRONTEND-STATE.md` §7 rather
 * than re-derived: the region is **persistent** (rendered in every state, never
 * unmounted — a region mounted at the moment it has something to say is a
 * region a screen reader has not been watching), it is `role="status"` and
 * never `alert`, every sentence **names its subject**, and it is **silent on
 * arrival**.
 */
function useAnnouncement(query: string, corpus: SearchCorpus) {
  // The sentence is derived every render; only *saying* it is deferred.
  const sentence = searchAnnouncement(query, corpus);
  const [spoken, setSpoken] = useState("");

  // When the region last changed, so the floor below has something to measure
  // against. A ref rather than state because reading it must not re-render —
  // and written only inside the effect, which is what the React Compiler's
  // `refs` rule rejected an earlier draft for doing during render.
  const lastSpokenAt = useRef(0);

  // `sentence` is a string, so this effect re-runs on exactly the keystrokes
  // that change the answer and each run cancels the one before it. A burst of
  // typing therefore announces the state at the end of the burst rather than
  // the state 400 ms ago.
  //
  // **Two numbers, and they answer two different questions** (Task 2.11.9).
  // The delay answers *have they stopped typing?* and is measured from the last
  // keystroke. It works perfectly above its own threshold and inverts below it:
  // an inter-key gap longer than 400 ms makes every keystroke look like the
  // last one, and typing `nvidia` at two keys a second made this region speak
  // **seven times** — six of them while the person was still typing. So the
  // second number is a floor on how often the region may speak at all, and the
  // wait is whichever of the two is longer.
  //
  // What lands when the wait ends is the sentence as it is **now**: the effect
  // closes over the current `sentence`, and a keystroke during the wait
  // cancels this timer and starts another. A floor therefore delays an
  // announcement; it never queues a stale one.
  //
  // An earlier draft held the pending sentence in a ref written during render,
  // and another cleared the region with a `setState` in the effect body. The
  // React Compiler rules rejected both, correctly: the first was a value that
  // never needed to survive a render, and the second is the cascading render
  // below avoids by deriving.
  useEffect(() => {
    if (sentence === null) return;

    const sinceLast = Date.now() - lastSpokenAt.current;
    const wait = Math.max(
      SEARCH_ANNOUNCEMENT_DELAY_MS,
      SEARCH_ANNOUNCEMENT_MIN_GAP_MS - sinceLast,
    );

    const timer = setTimeout(() => {
      lastSpokenAt.current = Date.now();
      setSpoken(sentence);
    }, wait);
    return () => {
      clearTimeout(timer);
    };
  }, [sentence]);

  // Silence is **derived**, not scheduled. Clearing the field must empty the
  // region in the same render, not 400 ms later — and arriving with an empty
  // field must never have had anything to clear.
  return sentence === null ? "" : spoken;
}

interface ResultRowProps {
  readonly id: string;
  readonly match: SecurityMatch;
  readonly lastClose: SecurityLastClose | undefined;
  readonly hasBars: boolean;
  readonly surfaceSession: string | null;
  readonly active: boolean;
  readonly onChoose: () => void;
  readonly onPoint: () => void;
}

function ResultRow({
  id,
  match,
  lastClose,
  hasBars,
  surfaceSession,
  active,
  onChoose,
  onPoint,
}: ResultRowProps) {
  const { security, emphasis } = match;
  const sector =
    security.sector === null ? "Market proxy" : SECTOR_LABELS[security.sector];
  const untracked = security.status !== "active";
  // A row carries its own session only when it differs from the one the
  // surface already named. That costs nothing in the uniform case and cannot
  // be a lie in the case that ends it.
  const ownSession =
    lastClose !== undefined && lastClose.session !== surfaceSession
      ? lastClose.session
      : null;

  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      className={cx(styles.row, active ? styles.active : undefined)}
      // `mousedown` rather than `click`: the input's blur closes the surface,
      // and blur lands first, so a click handler on a row that is already gone
      // never runs.
      onMouseDown={(event) => {
        event.preventDefault();
        onChoose();
      }}
      onMouseEnter={onPoint}
    >
      <span className={cx(styles.symbol)}>
        <Emphasised text={security.symbol} on="symbol" emphasis={emphasis} />
      </span>

      <span className={cx(styles.identity)}>
        <span className={cx(styles.name)}>
          <Emphasised text={security.name} on="name" emphasis={emphasis} />
        </span>
        <span className={cx(styles.meta)}>
          {sector}
          {ownSession === null ? undefined : ` · close ${ownSession}`}
          {/*
           * **Said before the click rather than discovered after it.** A
           * security with no coverage record holds no bars at all, so opening
           * it renders a panel with nothing in it — which reads as the product
           * being broken unless the row said so first. It is not a failure and
           * not an error: it is a security nobody has backfilled, and the
           * words are the market-data layer's own rather than a second set.
           */}
          {hasBars ? undefined : " · no bars stored"}
        </span>
      </span>

      {untracked ? (
        <span className={cx(styles.tag)}>
          <Badge tone="selected">Untracked</Badge>
        </span>
      ) : (
        <span className={cx(styles.tag)} />
      )}

      <span className={cx(styles.kind)}>{KIND_WORDS[security.kind]}</span>

      <Close lastClose={lastClose} />
    </li>
  );
}

/**
 * The close and its change.
 *
 * **Nothing here is labelled "price".** The live feed does not exist, so what
 * this is is the last session we hold a bar for — invariant 6 in the small. The
 * change keeps `PriceChange`'s glyph and sign, because the price palette's two
 * directions differ by 1.04:1 in greyscale and hue is therefore the entire
 * difference.
 */
function Close({
  lastClose,
}: {
  readonly lastClose: SecurityLastClose | undefined;
}) {
  if (lastClose === undefined) {
    return (
      <>
        <span className={cx(styles.close)}>
          <span className={cx(styles.noChange)}>No close</span>
        </span>
        <span className={cx(styles.change)} />
      </>
    );
  }

  const percent = changePercent(lastClose);
  return (
    <>
      <span className={cx(styles.close)}>
        <span className={cx(styles.price)}>{formatPrice(lastClose.close)}</span>
      </span>
      <span className={cx(styles.change)}>
        {percent === null ? (
          <span className={cx(styles.noChange)}>No previous</span>
        ) : (
          <PriceChange
            change={formatChangePercent(percent)}
            direction={directionOf(percent)}
          />
        )}
      </span>
    </>
  );
}

/**
 * The matched characters, emphasised **at the matcher's offset**.
 *
 * The offset is never computed here. `name.indexOf(query)` in this function
 * would be wrong on 67 real rows — see `MatchEmphasis` in `security-match.ts`,
 * which has the measurement and the two worked examples.
 */
function Emphasised({
  text,
  on,
  emphasis,
}: {
  readonly text: string;
  readonly on: MatchEmphasis["field"];
  readonly emphasis: MatchEmphasis;
}) {
  if (emphasis.field !== on) return <>{text}</>;
  const end = emphasis.offset + emphasis.length;
  const rest = on === "symbol" ? styles.symbolRest : undefined;
  return (
    <>
      <span className={cx(rest)}>{text.slice(0, emphasis.offset)}</span>
      <b className={cx(styles.mark)}>{text.slice(emphasis.offset, end)}</b>
      <span className={cx(rest)}>{text.slice(end)}</span>
    </>
  );
}

/**
 * The visible half of the count, which updates on every keystroke.
 *
 * It reads the `total` that travelled with the slice, which is the only thing
 * that stops it lying: the cap is the matcher's constant and this surface does
 * not spell a second one.
 *
 * **It is also the only thing standing between a correct demotion and a
 * defect that looks identical** (Task 2.11.6). An untracked security loses a
 * tie inside its tier, which over a crowded query pushes it off the shown slice
 * while the total still counts it — measured on the real universe: untracked,
 * `AAPL` falls from match 2 of 99 to match 50. On screen that is
 * indistinguishable from the row having been filtered out, which is the one
 * thing `UNIVERSE.md` §12.2 forbids. What makes the difference legible is this
 * line refusing to claim the list is the whole answer.
 */
function Footer({
  shown,
  total,
  session,
}: {
  readonly shown: number;
  readonly total: number;
  readonly session: string | null;
}) {
  return (
    <p className={cx(styles.footer)}>
      {session === null ? undefined : (
        <span className={cx(styles.session)}>Closes as of {session}</span>
      )}
      <span className={cx(styles.count)}>
        {shown === total
          ? `${String(total)} ${total === 1 ? "match" : "matches"}`
          : `showing ${String(shown)} of ${String(total)}`}
      </span>
    </p>
  );
}
