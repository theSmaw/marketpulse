import type { Security, SecurityLastClose } from "@marketpulse/shared";
import { SECTOR_LABELS } from "@marketpulse/shared";
import type { KeyboardEvent } from "react";
import { useEffect, useId, useMemo, useState } from "react";

import { cx } from "../../cx.js";
import {
  SEARCH_ANNOUNCEMENT_DELAY_MS,
  matchSecurities,
  searchAnnouncement,
} from "../../market/index.js";
import type { MatchEmphasis, SecurityMatch } from "../../market/index.js";
import { Badge } from "../Badge/Badge.js";
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
// name, open a security.
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
// ## What this component does not own
//
// **Navigation.** It reports `onOpen(symbol)` and the route turns that into
// `securityPath(symbol)`. The route pattern exists once in `ROUTE_PATTERNS`,
// `securityPath()` is the only thing that builds a destination from it, and a
// component that called `useNavigate` itself would be a third spelling of that
// path — as well as a component that cannot be rendered in a story without a
// router around it.
//
// **Failure and empty states.** Task 2.11.6 owns every way the universe fetch
// can fail and what search says while it is in flight. This component takes a
// universe and renders the control working; it is deliberately not the place
// that decides what "unavailable" looks like.
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

export interface SecuritySearchProps {
  /**
   * The universe to match against — the one the page has already fetched.
   * Matching is client-side (`SEARCH-AND-SELECTION.md` §2), so this component
   * issues no request of its own.
   */
  readonly universe: readonly Security[];
  /**
   * Last closes, keyed by symbol. A **separate** array in the wire format, so a
   * result row is a join rather than a field read — and a symbol with no entry
   * is a case this renders rather than assumes away.
   */
  readonly lastCloses: ReadonlyMap<string, SecurityLastClose>;
  /** Called with the symbol when a result is chosen. */
  readonly onOpen: (symbol: string) => void;
}

export function SecuritySearch({
  universe,
  lastCloses,
  onOpen,
}: SecuritySearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const id = useId();
  const listboxId = `${id}-results`;
  const optionId = (index: number) => `${id}-option-${String(index)}`;

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

  const expanded = open && query.trim() !== "";
  const activeIndex =
    matches.length === 0 ? -1 : Math.min(active, matches.length - 1);

  const spoken = useAnnouncement(query, result);

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
        if (expanded) {
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
          placeholder="Search securities (e.g. AAPL)"
          surfaceOpen={expanded}
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

        {expanded ? (
          <div className={cx(styles.surface)}>
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
                  surfaceSession={surfaceSession}
                  active={index === activeIndex}
                  onChoose={() => {
                    choose(index);
                  }}
                  onPoint={() => {
                    setActive(index);
                  }}
                />
              ))}
            </ul>
            <Footer
              shown={matches.length}
              total={total}
              session={surfaceSession}
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
 * The live region, and the only thing on this screen that waits.
 *
 * Four mechanical clauses inherited whole from `FRONTEND-STATE.md` §7 rather
 * than re-derived: the region is **persistent** (rendered in every state, never
 * unmounted — a region mounted at the moment it has something to say is a
 * region a screen reader has not been watching), it is `role="status"` and
 * never `alert`, every sentence **names its subject**, and it is **silent on
 * arrival**.
 */
function useAnnouncement(
  query: string,
  result: ReturnType<typeof matchSecurities>,
) {
  // The sentence is derived every render; only *saying* it is deferred.
  const sentence = searchAnnouncement(query, result);
  const [spoken, setSpoken] = useState("");

  // `sentence` is a string, so this effect re-runs on exactly the keystrokes
  // that change the answer and each run cancels the one before it. A burst of
  // typing therefore announces the state at the end of the burst rather than
  // the state 400 ms ago.
  //
  // An earlier draft held the pending sentence in a ref written during render,
  // and another cleared the region with a `setState` in the effect body. The
  // React Compiler rules rejected both, correctly: the first was a value that
  // never needed to survive a render, and the second is the cascading render
  // below avoids by deriving.
  useEffect(() => {
    if (sentence === null) return;
    const timer = setTimeout(() => {
      setSpoken(sentence);
    }, SEARCH_ANNOUNCEMENT_DELAY_MS);
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
  readonly surfaceSession: string | null;
  readonly active: boolean;
  readonly onChoose: () => void;
  readonly onPoint: () => void;
}

function ResultRow({
  id,
  match,
  lastClose,
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
