#!/bin/sh
# The backend development loop: two watchers, no dependencies.
#
# Run through `pnpm --filter @marketpulse/backend dev`, or via the root
# `pnpm dev` fan-out. It lives in a file rather than in package.json because
# every line below needs a reason, and a one-line shell composition wedged into
# a JSON string cannot carry one.
#
# Why not `node --watch src/index.ts`? Node 24 strips types natively, so that
# would be one process and no build step — but this repository's relative
# imports carry the *emitted* extension (`./server.js`), which `nodenext`
# requires, and Node's type stripping does not remap `.js` to `.ts`. Verified in
# Task 1.2.2: it fails with ERR_MODULE_NOT_FOUND on `src/server.js`. Writing
# `./server.ts` instead does resolve, but that means a second import convention
# in the workspace, so the loop below compiles instead.
#
# Consequence worth knowing: unlike type stripping, this loop *does* typecheck.
# `tsc -b --watch` reports errors on every edit. It still emits when it finds
# them — `noEmitOnError` is not set — so the server restarts with erroring code
# and the error is above it in the log. That is deliberate: a type error should
# not silently stop the server you are looking at.

# `-u` only. Not `-e`: the one command below that can fail is the initial build,
# and it is deliberately non-fatal — see the next comment.
set -u

# Build once before anything watches. Without this, a loop started on an empty
# `dist/` (which is what `pnpm clean` leaves behind) opens with a
# MODULE_NOT_FOUND stack trace and recovers a second later when the first emit
# lands — correct, but it reads like a broken setup. Incremental, so this is
# close to free on a warm tree.
#
# A type error here must not stop the loop starting, or the dev server would be
# unavailable in exactly the situation you want it running. tsc emits anyway,
# the error is printed, and the watch below reports it again on the next edit.
tsc -b || true

# Watcher 1: sources to `dist/`. `--preserveWatchOutput` stops tsc clearing the
# screen on every rebuild, which otherwise wipes the server's own log output —
# the thing you started the loop to read.
tsc -b --watch --preserveWatchOutput &
tsc_pid=$!

# Watcher 2 is the foreground process, so this shell only reaches its EXIT trap
# when `node --watch` is gone; the trap then reaps tsc rather than leaving it
# orphaned. A real Ctrl-C signals the whole foreground process group and kills
# all three directly — verified — so the trap is for the other case, where node
# exits on its own.
trap 'kill "$tsc_pid" 2>/dev/null' EXIT INT TERM

# `node --watch` restarts on any file the process actually loaded, which is
# `dist/`, not `src/` — so the trigger is tsc's emit, one step behind the edit.
# It watches through the pnpm symlink into `packages/shared/dist` too, once
# there is an import to make it load anything from there.
node --watch dist/index.js
