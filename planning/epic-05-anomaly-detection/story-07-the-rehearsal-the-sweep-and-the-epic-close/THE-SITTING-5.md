# The sitting — Epic 5, the protocol for one evening

**Written 2026-10-29 by [Task 5.7.1](TASK-01-the-sittings-protocol-and-the-drawable-pairs.md).**
Epic 4's [`THE-SITTING.md`](../../epic-04-market-overview/THE-SITTING.md) is the
template and it worked; this is Epic 5's, and it is **not** a copy — the order
is different because what expires is different.

**This is the file to open at 21:25.** It is ordered by **what expires soonest
and what is cheapest**, not by story number. Six rows are owed —
`LIVE-REHEARSAL.md` 5.1 through 5.6, every date cell reading `—` — plus Epic 4's
**waived** 390 row, whose `Owner:` is this epic.

**One thing to know before reading any of it.** Epic 5's figures have never been
watched by anybody, on any machine, against a real feed. Five of the six rows
are _unwatched_; row 5.5's figure is _unwatchable tonight_ by arithmetic rather
than by effort. So the honest expectation for this evening is **five rows
cleared, one split, and a handful of questions answered that no machine can
answer** — not a clean sweep.

---

## Step 0 — FREEZE MERGES

**Every merge to `main` deploys, and a deploy takes about 553 s.** It restarts
the backend, which empties the trailing window and the market-state map, so the
5-minute return disappears for five minutes and the aggregate goes thin for the
45.8–46.5 s before the new replica's feed authenticates. **That destroys the
evidence for rows 5.2, 5.4 and 5.6 at once.**

So: everything lands **before** 21:30, and nothing merges between the bell and
the end of the sitting. Tasks 5.7.2–5.7.6 are written to that constraint. The
session cannot be repeated; a merge always can.

## Check the pair before you start — about ten seconds

```sh
E2E_DEPLOYED_BACKEND_ORIGIN=https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io \
E2E_DEPLOYED_BASE_URL=https://red-smoke-029583a0f.5.azurestaticapps.net \
  node scripts/check-deployed.mjs
```

`status=live` with `observedAt=null` is **correct** before the open. If
`observedAt` is still `null` fifteen minutes after the bell, that is the
sitting's first finding rather than a reason to stop.

## Before the bell — prove the instrument, with the market shut

```sh
node scripts/sitting-frames.mjs all --minutes 1 --drain 15000
```

**Rehearsed 2026-10-29 at 22:49 EDT against the deployed pair, and it proves
MORE than Epic 4's note allows for.** That note says a shut-market run certifies
the wiring and not the loop, because with no frames arriving one drain and all
drains look identical — which is how a rehearsal was once recorded clean against
an instrument whose every drain after the first returned nothing. **This run
certifies the loop as well**, because three successive drains each returned a
non-zero count before the fourth returned zero, which an instrument with the
rebinding defect cannot produce:

```
  population: 518 securities — 4 index proxies, 11 sector benchmarks, 503 equities
  drain 1 at 22:50:52 EDT: 33 rows, 6 frames, wrapper true
  drain 2 at 22:51:07 EDT: 4 rows, 1 frames, wrapper true
  drain 3 at 22:51:22 EDT: 4 rows, 1 frames, wrapper true
  drain 4 at 22:51:37 EDT: 0 rows, 0 frames, wrapper true
  nothing: no bars frame carried a sentAt, so no minute was formed
```

Read `wrapper true` on **every** drain and exactly **one** socket with
`"ours": true` — both held. `"bars": 0` is correct with the market shut and is
the rehearsal rather than the reading.

**Two more pre-bell readings worth having in front of you**, both taken on the
same run. The feed frame, verbatim, at 120 bytes and **1.6 a minute** — against
a median of 332 a minute before the 2026-10-11 repair, so this is the keepalive
and genuine view changes and nothing else:

```
{"type":"feed","version":1,"sentAt":"2026-10-29T02:49:27.612Z","feed":{"status":"live","feed":"iex","marketOpen":false}}
```

And the source note's tape, which is **one** (`sip`, 390 bars, retrieved
00:32 EDT) because the backfill has run. **The two-feed state is a mid-session
state and is not visible now** — if you want to see `All US exchanges` over
`IEX`, re-read this arm after the bell. It is the one thing in this file that is
invisible before the open and invisible again after that night's backfill.

---

# 1. The OPEN BURST — expires within ten minutes of the bell, and nothing else in this file does

**Why first, ahead even of the score:** this is the only item tonight that is
**gone if you miss it**, and it is a **stated reversal condition** rather than an
impression. Story 5.1 decision 3 pooled the percentile across all times of day
with its known cost written down: the first few minutes of a session are the
fattest-tailed bucket, so a pooled percentile may rank ordinary opening
behaviour as extreme and `Unusual activity` may be **the 09:30 burst and nothing
else** every single day.

At **21:30–21:40 your time**, on the deployed `/`:

1. Watch `Unusual activity` across the first ten minutes. **Write down whether
   the ten rows are the same ten at 21:32 and at 21:40**, and whether the scores
   fall as the session settles.
2. Read the region's head. Does it say `Top 10 · all extreme`?
3. Then look again **an hour later** and write down how much of the list
   survived.

**If the list is the opening burst and then empties, decision 3's reversal
condition has fired** and the answer is a per-bucket distribution — which needs
more than 60 days of history, so it is a condition to record rather than a
change to make tonight. Either way this is a finding, and nothing mechanical can
produce it.

---

# 2. Row 5.6 — the COMPOSITE SCORE, the epic's headline

**Why second:** it is the sentence this whole epic exists for, and it is the
**only row a sitting can clear on an ordinary laptop** — the excess factor needs
only stored daily closes. It is also the first row in this ledger for a
**0–100 figure**.

On the deployed `/securities/:symbol`, for a security the list in step 1 offered:

1. Read the score band at the top of `Abnormal-move indicators`: the figure, the
   chip, `N of 3 factors contributing · max 75`.
2. Read the **ledger** beneath it — `How this score was reached`, one row per
   factor with its weight and its contribution. **Add the contributions up by
   eye.** They are supposed to equal the figure above them.
3. Then the three questions, and they are the row's real content:
   - Does `61 / 100` beside a ledger read as **an instrument showing its
     working**, or as a **debug panel** somebody left on?
   - Does `TOP 10 · ALL EXTREME` on `/` read as **today was wild**, or as
     **something is broken**?
   - Open a security with no score — four refusal rows and no figure, which is
     CI's permanent state and every cold laptop's. Does that read as a product
     being **careful** or a product being **empty**?

**And the one about the number rather than the layout:** `extreme` fires on
about **7.74 of 484** securities at a median instant, and on `/`'s top ten all
ten rows share one band in **35 of 77** measured instants. **Does `extreme`
still mean anything to you after an hour of looking at it?** If not, the band
floors are the lever — and that is a condition to carry out of this epic, not a
change to make tonight, because moving three measured quantiles on one evening's
impression replaces a derivation with a guess.

---

# 3. Row 5.3 — the PERCENTILE, and the only genuinely external check this epic has

**Why here:** it needs the market open and your own attention, and it is the
**only** figure in Epic 5 checkable against something outside this product. Its
inputs are 60 sessions of a table no browser reads, so there will never be an
in-product check. Budget ten minutes and a calculator rather than discovering
that in the chair.

1. On a security with a drawn percentile, read it and the sample beside it:
   `99th percentile · of 4,620 5-minute returns · all times of day pooled`.
2. Open a **public five-minute chart** for the same security.
3. **Is the move the product calls 99th-percentile visibly unusual on that
   chart?** Not the exact ordinal — whether the claim is the right order of
   magnitude.
4. Record whether `>99th` ever appears, and whether `100th` never does.

A disagreement here is the most valuable single finding available tonight.

---

# 4. Rows 5.2, 5.1 and 5.4 — three rows on two pages

**Why here:** cheap, and all three are _states_ rather than moments, so they
survive being taken late.

**Row 5.2 — the 5-minute return.** `Abnormal-move indicators`' first band: the
return, the two instants, `observed k of 5 minutes`, and `Measured on IEX`. This
has **never held one entry on any machine not serving a real market** — the
window is process memory with no store-backed fill, so it is empty on every
gated run and for the first five minutes of every deployment. Does `observed 3
of 5 minutes` read as **honest** or as **broken**? And does `Measured on IEX`
sitting a few centimetres from the chart's `All US exchanges` read as two honest
claims or as one contradiction?

**Row 5.1 — `Relative performance`.** Three moves on one track anchored at zero,
the subject a bar and the two references ticks on the same track, with
`behind by 2.20 pts` / `ahead by 3.78 pts` above them. **Is the gap the thing you
read, or do you find yourself subtracting two lengths by eye?** And does
`behind` on a security that **rose** — ahead while falling, or behind while
rising — read correctly without a tint?

**Row 5.4 — `Unusual activity`'s rows.** Covered as a list in step 1; here, the
row itself. The tinted `▲`/`▼`, the name, the score. **At 390, is the company
name readable?** The band chip was removed from the row for exactly that reason —
it cost 25% of a 308 px row and squeezed names to `Dominio…`.

---

# 5. Row 5.5 — the VOLUME factor, and this row is a SPLIT verdict

**Decided at Gate 1: the refusals are watched tonight and the FIGURE is waived.**

**The figure.** `4.1× typical` draws on **4 of 39,936** `(security, 5-minute
bucket)` pairs — 0.010% — and the bucket is a **time of day**, so even knowing
the pair you have to be looking inside that five-minute window. Task 5.7.1 made
the nightly pass print the drawable pairs, so **if one of them is reachable
tonight, take it**; if not, the figure is waived with its date-bound condition on
the waiver and nobody should spend the evening hunting it.

**The refusals are the shipped product and they are watchable now.** Know which
one you are looking at:

- **`too-few-sessions`** — `Too little history — 80 IEX minutes at this time of
day` — is what a reader of the **deployment** meets, at **99.990%** of buckets.
- **`no-same-tape-baseline`** — `No IEX volume history for this security` — is
  the permanent state of **CI and every laptop** and reaches **no reader of the
  deployed product**. Two documents called it the common case for a day; do not
  repeat it in the row.

Three questions:

- Does `Too little history — 80 IEX minutes at this time of day` read as
  **careful** or as **broken**?
- Does **`Measured on IEX · baseline on IEX`** sitting directly beneath the
  return's **`Measured on IEX · baseline on All US exchanges`** read as two
  honest claims, or as one contradiction? (Task 5.3.3 left this to a person
  deliberately; a second band has sharpened it.)
- Do **six refusal sentences in one region** read as thoroughness or as noise?

---

# 6. The AMBER question — one frame, and it needs no session

**Why late:** it needs no feed, so it cannot expire, and it is the one design
question Epic 5 routed to a person rather than repaired.

`market.css` resolves `--anomaly-high`, `--feed-stale`, `--service-degraded` and
`--provenance-synthetic` **all to one amber**. Put a `HIGH` chip and the chrome's
`SIMULATED · Generated test data. Not a market feed.` in front of yourself in one
frame. **Does the amber ramp read as a RISK METER?** The score is _how unusual_,
not _how dangerous_, and the region says so in words — but hue argues.

---

# 7. Row 4.7 — the 390 phone, inherited and WAIVED since 2026-10-13

**This epic owns it and `pnpm invariants` will not force it** — a waiver passes,
and Epic 5's arm of the gate only reads `5.x` rows. So the gate's silence will
take this decision if you do not.

If you have a phone and cellular to hand: at 390, the whole difference between
_the market is shut_, _the feed has stopped_ and _the backend is gone_ is **two
cells at opposite corners** of the viewport. **Do you consult both?**

Otherwise: re-waive it with a new dated owner, or record it as inherited and
unmet. Either is a decision; letting it pass unmentioned is not.

**And if you do have the phone out, read one number off it** — added 2026-10-29
by Task 5.7.2, which found the gap while verdicting Story 5.4's AC 1. That
criterion asks for _the shortest supported viewport height_ to be **declared**,
and **no file in this repository declares one, product-wide**. The row count it
also asks for was measured twice and is fine; the declaration was never made.
UX recommended **700** and was explicit that it could not be answered from a
development machine. So:

```
In the phone's address bar, or from a desktop devtools remote inspection:
  window.innerHeight
```

One number, written into row 4.7's account, turns an unanswerable clause into a
measurement — and it is the only instrument anybody has proposed for it.

---

## Writing the rows

**`What was wrong` is the column that earns this file.** A rehearsal with
nothing in it for six stories running is a rehearsal nobody did. "Nothing moved
for four minutes" is an **ordinary** observation on a feed with 65.1% median
per-symbol minute coverage and is worth recording as such.

A row is added by the story it names, not retrospectively — a row written from
memory three weeks later is a row about a memory. **Write them the same evening.**

A **waiver** needs all three or the build fails: `WAIVED YYYY-MM-DD`, the literal
`Owner:`, and at least 120 characters of account. A bare `WAIVED` fails.
