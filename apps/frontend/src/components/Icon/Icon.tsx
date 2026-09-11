import { cx } from "../../cx.js";
import styles from "./Icon.module.css";

// The icon set — six drawings, inline, and a closed union.
//
// ## Why not an icon font, and why not a package
//
// The reference design this refresh is built from pulls Material Symbols from
// Google Fonts, which is two things this repository has already decided against
// in other forms: a second origin in the critical path (see `fonts.css`), and a
// dependency whose surface is thousands of glyphs for an application that needs
// five. An icon *package* — lucide, phosphor — removes the network hop and
// keeps the surface: it ships a component per glyph and a tree-shaking promise,
// and the first person to import a sixth glyph does it without a decision.
//
// **A closed union is the point.** Adding an icon here is an edit to this file
// and therefore a moment where somebody asks whether the interface needs
// another symbol. An interface that grows icons without that moment ends up
// with three arrows that mean different things.
//
// That moment has happened exactly once. The set was closed at **five** from
// the 2026 refresh until 2026-09-11, when Task 2.11.1 argued for a sixth —
// `magnifier`, for the product's first input field — on the ground that a
// search affordance has to be recognisable at a glance on a dense screen, and
// that the micro-label above a field reads as a section heading rather than as
// "you can type here". `SEARCH-AND-SELECTION.md` §5 carries the argument. **The
// set is now six, and the seventh needs its own argument in its own task rather
// than citing that one.**
//
// ## Every icon is decorative, and that is not configurable
//
// `aria-hidden` is unconditional, exactly as `Marker`'s is and for the same
// reason: each of these appears **beside a word**, and a symbol read aloud is
// noise at best ("the action is: arrow"). Making it a prop would invite an icon
// to become the accessible name of a control, which is the single most common
// way an icon set damages a screen-reader experience.
//
// The consequence for consumers: an icon-only button needs its own visually
// hidden label. `a11y.module.css` has the class; `Button` does it for you.
//
// ## Size comes from the type, not from a prop
//
// The svg is `1em` square and inherits `currentColor`, so an icon in a 13px
// data cell and one in a 20px metric are automatically in proportion with the
// text they sit beside, and a consumer that changes a font size does not have to
// remember to change an icon size to match. There is deliberately no `size`
// prop: a size that disagrees with its type is the defect, and the only way to
// get it is to be allowed to state one.
//
// Optical alignment is the one thing this cannot get right by itself — a 1em
// box sits on the baseline rather than on the text's optical centre — so the
// stylesheet nudges it, once, here.

/**
 * The set. Named for **what the symbol is**, not for what a particular consumer
 * uses it for: `arrowRight` rather than `explore`, because the day a second
 * screen uses it for something else the name would be a lie.
 *
 * The exception is `pulse`, which is not a symbol for anything — it is the
 * product's mark, and it appears exactly once, in the chrome.
 */
export const ICON_NAMES = [
  "pulse",
  "chevronRight",
  "arrowRight",
  "refresh",
  "alert",
  "magnifier",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export interface IconProps {
  /** Which drawing. Required; there is no default icon. */
  readonly name: IconName;
}

/**
 * The drawings, as path data on a 24×24 grid with a 2px stroke — the geometry
 * every mainstream icon set uses, so a sixth icon copied from one will sit
 * beside these without being redrawn.
 *
 * `pulse` is the odd one and is meant to be: three segments of a heartbeat
 * trace, which is the product's name drawn rather than written.
 */
const PATHS: Readonly<Record<IconName, string>> = {
  pulse: "M2 12h5l3-7 4 14 3-7h5",
  chevronRight: "M9 5l7 7-7 7",
  arrowRight: "M4 12h15m0 0l-6-6m6 6l-6 6",
  refresh: "M20 11a8 8 0 10-2.3 5.7M20 5v6h-6",
  alert: "M12 8v5m0 3.5v.5M12 3L2 20h20L12 3z",
  magnifier: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
};

export function Icon({ name }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={cx(styles.icon)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
