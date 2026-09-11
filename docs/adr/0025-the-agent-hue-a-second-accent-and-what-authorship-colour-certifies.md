# 0025 — The agent hue: a second accent, and what an authorship colour certifies

**Status:** Accepted
**Date:** 2026-09-11
**Supersedes, in part:** [0022](0022-the-design-refresh-three-typefaces-an-identity-accent-and-what-a-token-change-certifies.md) — specifically its "one accent hue" rule, which this narrows rather than removes

## Context

`PRODUCT_SPEC.md` §35 carries a requirement the token layer has never answered:

> Every generated conclusion should be distinguishable from an observed fact.

Nothing shipped distinguishes them, because nothing shipped is AI-authored — Epic 10 is
the first thing that generates a conclusion. So the requirement has sat unmet without
being visibly unmet, which is the condition under which a requirement quietly becomes a
preference.

The `Component library for MarketPulse` design canvas, read on 2026-09-11, proposes an
answer: a token it calls `--mp-agent`, `#3a57c9`, labelled **"AI-authored only"**, used
on finding cards, step lists, evidence rows and the human-in-the-loop bar.

That collides head-on with ADR 0022 and `VISUAL-LANGUAGE.md`:

> **No second accent hue.** One crimson, four positions, chrome only. A colour proposed
> for anything that is neither market data nor one of those four positions is answered
> with grey.

The rule exists for a real reason and has held for good ones: the identity accent is
scarce because scarcity is what makes it mean anything, and a product that grows accents
one feature at a time ends up with a palette nobody can read. The canvas is nonetheless
proposing exactly the thing the rule forbids.

## Decision

**Adopt the agent hue, and narrow the rule rather than delete it.**

The rule becomes: **the identity accent is one crimson in four chrome positions, and
colour with domain meaning lives in its own scope.** `market.css` already establishes
that second scope for price, anomaly, feed, service and provenance meaning. Authorship is
a third: not identity, not market data, but "who produced this claim".

Four constraints, which are the decision rather than the detail:

1. **It is never the sole encoding.** `market.css`'s rule applies unchanged and is the
   reason this ADR is not simply "add a blue". AI-authored content carries a mark, a word
   or a border treatment as well as the hue — under `grayscale(1)` a reader must still be
   able to tell a generated conclusion from an observed fact. This is the constraint most
   likely to be dropped, because the hue alone looks sufficient on a colour screen.

2. **It marks authorship, never confidence.** `CONFIRMED` / `SUPPORTED` / `POSSIBLE` /
   `UNKNOWN` is a separate axis with its own vocabulary, and a blue that drifted into
   meaning "trustworthy" would invert the product's whole argument — the AI's output is
   the thing a person is meant to check, not the thing they are meant to trust.

3. **It never touches a datum.** The same prohibition the identity accent carries. A
   number is a number whoever asked for it; the agent hue marks the _claim_, the step or
   the card around it.

4. **It is not the identity accent's replacement anywhere.** A primary button inside an
   investigation is still crimson. Two accents competing for "the action here" is the
   failure this rule was written to prevent, and adopting a second hue does not license
   spending it on emphasis.

**The token does not land yet.** The decision is recorded here; the custom property
arrives in its own file — a third colour scope beside `brand.css` and `market.css` —
**with its first consumer in Epic 10**.

> **Amended 2026-09-11, later the same day: the token landed early, and the deferral
> above was overridden rather than satisfied.** The design canvas became the source of
> truth for the whole language, and it declares `--mp-agent` and `--mp-agent-tint`. A
> token layer meant to be that canvas expressed in CSS cannot omit two of its values and
> still be it. `apps/frontend/src/styles/agent.css` now exists with `--agent-fill`,
> `--agent-ink` and `--agent-wash`, measured at 6.20:1 and 7.05:1 against their grounds.
>
> The decision this ADR records is unchanged, and so are its four constraints. What the
> deferral was protecting is still owed by Epic 10 and is **not** discharged by the
> token existing: the non-colour encoding that has to travel with the hue, and a
> measurement taken in place rather than in the abstract. A file of three values is not
> a design for a finding card. This follows the repository's standing rule that a
> thing designed against no consumer is designed against a guess, which dropped the
> `Locked` field state on the same day this was decided. It also means the two checks that
> matter cannot be faked in advance: the contrast measurement and the greyscale check both
> need something real on a screen.

## Alternatives

**Keep one accent; distinguish authorship structurally.** A marker, a border, a label —
no second hue. Rejected as insufficient on its own rather than wrong: the product's
central claim is that a person can tell the model's reasoning from the system's
measurements at a glance, across a workspace that Epic 11 lets the model rearrange. A
distinction carried only by a small mark is one an eye skips. The structural half is kept
anyway, by constraint 1.

**Defer entirely to Epic 10.** Tempting, and it is what the repository would normally do.
Rejected because the decision is cross-cutting rather than local: Epics 7 through 11 each
add a surface that mixes generated and observed content, and the first of them would
otherwise take this decision alone, at the bottom of a component, without an argument.
Recording it now and landing the token later takes the deferral where it is cheap and not
where it is expensive.

**Use the amber already in `market.css`.** Rejected: amber means _elevated or unusual_
across anomaly, feed, service and provenance. Overloading it with authorship would make
"the agent said this" and "this is unusual" the same colour on the one screen that shows
both.

## Consequences

- `VISUAL-LANGUAGE.md`'s "No second accent hue" becomes "no second **identity** accent",
  and the file gains authorship as a third colour scope. Amended 2026-09-11.
- ADR 0022's one-accent rule is narrowed, not overturned. It keeps its dated amendment
  rather than a rewrite.
- **Epic 10 owes the token, the file it lives in, the contrast measurement against both
  grounds, and the non-colour encoding that travels with it.** Four things, and the
  fourth is the one that will be skipped.
- Nothing in `pnpm verify` can check any of this. No stylesheet is applied in the test
  environment, so `getTokens()` throws there and colour assertions are structurally
  impossible; the greyscale check is a browser-level reading a person takes.

## What this ADR does not certify

That the value `#3a57c9` is the one that ships. It is the canvas's value, recorded as the
intent. It has **not** been measured against `--surface-page` or `--surface-raised`, and
the repository's own history says that matters — the crimson is two crimsons precisely
because contrast forced it, `--palette-crimson` at 8.28:1 for text and
`--palette-crimson-bright` for fills. Expect the agent hue to need the same split, and
re-measure rather than citing this line.
