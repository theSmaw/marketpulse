/**
 * **Fitting the layout's abstract units into a box, and the zoom rule** — pure
 * arithmetic, no canvas, no WebGL, no DOM (Task 6.1.2).
 *
 * `packages/shared`'s layout is in units of which the node footprint is 16, and
 * nothing in it knows a viewport exists — *a pixel is a fact about a viewport*.
 * This is the one place that fact is introduced, and it is a module of its own
 * rather than a method on either candidate for two reasons. It is **the only
 * part of the renderer a unit test can reach** (jsdom applies no stylesheet,
 * computes no layout and has no WebGL), and it is **shared by both candidates**
 * so neither is measured against a different picture.
 *
 * ## The affine transform, spelled once
 *
 * `screen = (world − centre) · scale · zoom + viewportCentre + pan`
 *
 * One scale, one zoom, one translate. Candidate B applies it as a single
 * `setTransform`; Candidate A hands `scale` to its camera. Getting it wrong in
 * two places is a mirrored or quarter-turned market that looks entirely
 * plausible, which is the reason `fromTwelve` is spelled once upstream too.
 */

import type { TopologyLayout } from "@marketpulse/shared";

import {
  TOPOLOGY_NODE_SCALE_CEILING,
  TOPOLOGY_NODE_SCALE_FLOOR,
} from "./renderer.js";

/**
 * How much clear ground the fit leaves, in **layout units**.
 *
 * `TopologyLayout.bounds` is node **centres**, not footprints, so a fit with no
 * margin clips half of every outermost node. 40 is the node footprint (16) plus
 * the label room the design work reserves above a cluster (24 = an 8-unit gap
 * and a 16-unit line box) — so the longest sector label, `CONSUMER
 * DISCRETIONARY`, has somewhere to go rather than painting across the frame,
 * which is invisible to every test below `pnpm e2e`.
 */
export const TOPOLOGY_FIT_MARGIN = 40;

/** How far in and out the camera may go. */
export const TOPOLOGY_MIN_ZOOM = 0.5;

/** See {@link TOPOLOGY_MIN_ZOOM}. */
export const TOPOLOGY_MAX_ZOOM = 8;

/** A box in CSS pixels. */
export interface TopologyViewport {
  readonly width: number;
  readonly height: number;
}

/** The affine transform, as four numbers and a centre. */
export interface TopologyView {
  /** Layout units → CSS pixels at zoom 1. Derived from the box; never set. */
  readonly scale: number;
  /** The reader's zoom, clamped to [{@link TOPOLOGY_MIN_ZOOM}, {@link TOPOLOGY_MAX_ZOOM}]. */
  readonly zoom: number;
  /** The reader's pan, in CSS pixels. */
  readonly panX: number;
  /** See {@link panX}. */
  readonly panY: number;
  /** The layout's own centre, in layout units. The fit's fixed point. */
  readonly centreX: number;
  /** See {@link centreX}. */
  readonly centreY: number;
  /** The box this view was fitted to. */
  readonly viewport: TopologyViewport;
}

/** `Math.min(ceiling, Math.max(floor, value))`, spelled once. */
function clamp(value: number, floor: number, ceiling: number): number {
  return Math.min(ceiling, Math.max(floor, value));
}

/**
 * The zoom a reader asked for, as the zoom they get.
 *
 * Separate from {@link clampNodeScale} and that is the whole of the canvas's
 * zoom rule: **position scales without limit and node size does not**.
 */
export function clampZoom(zoom: number): number {
  return clamp(zoom, TOPOLOGY_MIN_ZOOM, TOPOLOGY_MAX_ZOOM);
}

/**
 * The multiplier applied to {@link TOPOLOGY_NODE_INK} at a given zoom.
 *
 * Clamped to [0.5, 1.5] so the 8 : 10 : 12 ladder holds at every zoom — a
 * diamond at zoom 8 would otherwise be 96 px and the class read would be
 * carried by nothing. Edge width, halo and label type take **no** multiplier at
 * all; they are constant by decision, because a scaling edge at zoom 3 is a
 * 3 px rope and 501 of them are a web.
 */
export function clampNodeScale(zoom: number): number {
  return clamp(zoom, TOPOLOGY_NODE_SCALE_FLOOR, TOPOLOGY_NODE_SCALE_CEILING);
}

/**
 * Fit a layout to a box: the view that draws the whole graph, centred, at
 * zoom 1.
 *
 * **A degenerate box or a degenerate layout returns a scale of 1 rather than
 * `Infinity` or `NaN`.** A zero-width container is the ordinary state of a
 * React component's first frame and of a `display: none` story, and a `NaN`
 * transform draws nothing while reporting no error anywhere — the same class of
 * silence this module's whole docblock is about.
 */
export function fitView(
  layout: TopologyLayout,
  viewport: TopologyViewport,
): TopologyView {
  const spanX =
    layout.bounds.maxX - layout.bounds.minX + TOPOLOGY_FIT_MARGIN * 2;
  const spanY =
    layout.bounds.maxY - layout.bounds.minY + TOPOLOGY_FIT_MARGIN * 2;

  const usable =
    viewport.width > 0 && viewport.height > 0 && spanX > 0 && spanY > 0;

  return {
    scale: usable
      ? Math.min(viewport.width / spanX, viewport.height / spanY)
      : 1,
    zoom: 1,
    panX: 0,
    panY: 0,
    centreX: (layout.bounds.minX + layout.bounds.maxX) / 2,
    centreY: (layout.bounds.minY + layout.bounds.maxY) / 2,
    viewport,
  };
}

/** Layout units → CSS pixels. See the module docblock for the one transform. */
export function worldToScreen(
  view: TopologyView,
  x: number,
  y: number,
): { readonly x: number; readonly y: number } {
  const unit = view.scale * view.zoom;

  return {
    x: (x - view.centreX) * unit + view.viewport.width / 2 + view.panX,
    y: (y - view.centreY) * unit + view.viewport.height / 2 + view.panY,
  };
}

/** CSS pixels → layout units. {@link worldToScreen} rearranged, not re-derived. */
export function screenToWorld(
  view: TopologyView,
  x: number,
  y: number,
): { readonly x: number; readonly y: number } {
  const unit = view.scale * view.zoom;

  return {
    x: (x - view.viewport.width / 2 - view.panX) / unit + view.centreX,
    y: (y - view.viewport.height / 2 - view.panY) / unit + view.centreY,
  };
}

/**
 * Zoom about a point on screen, keeping the world point under it fixed.
 *
 * The property a reader notices when it is missing: a wheel over `NVDA` has to
 * leave `NVDA` under the pointer. It is derived rather than tuned — solve
 * {@link worldToScreen} for the pan that holds one point.
 */
export function zoomAbout(
  view: TopologyView,
  factor: number,
  screenX: number,
  screenY: number,
): TopologyView {
  const zoom = clampZoom(view.zoom * factor);
  const anchor = screenToWorld(view, screenX, screenY);
  const unit = view.scale * zoom;

  return {
    ...view,
    zoom,
    panX: screenX - view.viewport.width / 2 - (anchor.x - view.centreX) * unit,
    panY: screenY - view.viewport.height / 2 - (anchor.y - view.centreY) * unit,
  };
}

/** Move the view by a screen-space delta. */
export function panBy(
  view: TopologyView,
  deltaX: number,
  deltaY: number,
): TopologyView {
  return { ...view, panX: view.panX + deltaX, panY: view.panY + deltaY };
}

/** The same view against a new box, keeping the reader's zoom and pan. */
export function reviewport(
  view: TopologyView,
  layout: TopologyLayout,
  viewport: TopologyViewport,
): TopologyView {
  return {
    ...fitView(layout, viewport),
    zoom: view.zoom,
    panX: view.panX,
    panY: view.panY,
  };
}
