# The backend's runtime image.
#
# Built from the repository root, because pnpm needs the workspace manifest and
# the lockfile and neither is in this directory:
#
#   docker build -f apps/backend/Dockerfile --platform linux/amd64 \
#     --build-arg NODE_VERSION="$(cat .nvmrc)" -t marketpulse-backend:<sha> .
#
# `pnpm image` in the root package.json is that command with every argument
# filled in; run it rather than this comment.

# The Node version is not written here and must not be. It comes from .nvmrc
# through --build-arg, so there is exactly one place the runtime major is
# stated, the same way the toolchain has exactly one .nvmrc and one
# `packageManager` field.
#
# Deliberately no default value. An `ARG NODE_VERSION=24.20.0` here would be a
# second copy that silently wins whenever the caller forgets the flag, which is
# precisely the drift this arrangement exists to prevent. Without it the build
# fails immediately on `FROM node:-alpine`, which is loud.
#
# Declared before the first FROM so both stages can use it, and re-declared
# inside each stage because a global ARG is not in scope within a stage.
ARG NODE_VERSION

# ---------------------------------------------------------------------------
# Builder: installs, builds and produces the deployable package directory.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS builder

# pnpm comes from the `packageManager` field through Corepack, with no version
# literal here and no pnpm install step — the same mechanism the CI workflow
# uses, and for the same reason. Corepack fetches the pinned tarball on first
# use.
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /repo

# The workspace's own files first, then only the two packages the backend needs.
# apps/frontend is excluded here as well as in .dockerignore: the backend image
# has no use for Vite, Storybook or React, and installing them would be the
# larger half of the install.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/backend apps/backend

# `--filter @marketpulse/backend...` installs the backend and everything it
# depends on and nothing else. `--frozen-lockfile` is explicit rather than left
# to a default, exactly as it is in the workflow.
#
# This is also the second half of the .nvmrc tie, and it is the loud half:
# `engineStrict` is on, so a NODE_VERSION outside the `engines` range in the
# root package.json fails here with ERR_PNPM_UNSUPPORTED_ENGINE rather than
# producing an image that runs on the wrong major.
RUN pnpm install --frozen-lockfile --filter "@marketpulse/backend..."

# `tsc -b` in apps/backend, which follows the project reference into
# packages/shared and builds both in order. Not the root build script: that one
# also runs Vite and Storybook, and neither exists in this image.
RUN pnpm --filter @marketpulse/backend build

# The package directory, which is the shape Story 1.2 measured as the one that
# actually runs: dist/ alone dies on `fastify` at import time, and then — once
# node_modules is reachable — on the health route's read of ../../package.json.
# The first error hides the second, so a dist/-only image looks like one
# problem and is two. Re-confirmed in Task 1.11.2 rather than inherited.
#
# `--legacy` is required: pnpm 10 and later refuse a non-injected workspace
# deploy without it. The alternative is `injectWorkspacePackages: true` in
# pnpm-workspace.yaml, which changes every developer's install — @marketpulse/
# shared would become a hard-linked copy rather than a symlink, so a `tsc -b
# --watch` rebuild of shared would stop reaching the backend until the next
# install, breaking `pnpm dev`. A deployment concern is not worth that.
RUN pnpm deploy --filter @marketpulse/backend --prod --legacy /artefact

# ---------------------------------------------------------------------------
# Runtime: the artefact and a Node to run it, and nothing else.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime

# No Corepack and no pnpm. `pnpm start` would work — Task 1.2.5 measured `pnpm
# run` forwarding SIGTERM, waiting for the child and propagating its exit code,
# so the wrapper is signal-transparent — but it puts a package manager and a
# script-resolution step in a runtime image to gain nothing once the artefact
# is built, and it puts a process between the orchestrator's SIGTERM and the
# server for no reason. `node dist/index.js` is what `pnpm start` runs anyway.

# NODE_ENV is deliberately not set. Task 1.6.3 decided this application has no
# environment variable naming its environment and nothing branches on one; what
# differs between environments is where the *values* come from. Setting it here
# would reverse that decision as a side effect of packaging.

# The `node` user ships with this image and owns nothing under /app, so the
# server cannot rewrite its own code. It also cannot bind a port below 1024,
# which PORT's own range check does not prevent — worth knowing before someone
# sets PORT=80.
WORKDIR /app
COPY --from=builder --chown=node:node /artefact ./
USER node

# Documentation only — this publishes nothing and binds nothing. The real port
# is PORT, read by src/config.ts, and 3000 is that module's default.
EXPOSE 3000

# Exec form, and the reason is not the one the obvious argument gives.
#
# The received wisdom is that the shell form — `CMD node dist/index.js` — makes
# /bin/sh PID 1, so SIGTERM never reaches node. That was built and signalled in
# Task 1.11.2 and it is **false on this image**: busybox sh `exec`s a lone
# command, and the base image's own docker-entrypoint.sh ends in `exec "$@"`,
# so the whole chain collapses and node is PID 1 either way. `sh -c 'node
# dist/index.js'` drains and exits 0.
#
# What actually swallows the signal is a shell that still has work to do after
# the server, which defeats that optimisation. Measured, three forms, same
# image, `docker stop -t 15`:
#
#   sh -c 'node dist/index.js'            PID 1 = node   exit 0    drained
#   sh -c 'node dist/index.js; echo bye'  PID 1 = sh     exit 137  15s, no drain
#   sh -c 'exec node dist/index.js'       PID 1 = node   exit 0    drained
#
# The middle row is the failure this line prevents: the stop takes the whole
# grace period and ends in SIGKILL (137 = 128 + 9), with no `signal received`
# and no `shutdown complete` — a pause and a killed container rather than an
# error. On Azure Container Apps the grace is 30 seconds, so that is 30 seconds
# added to every revision change, per replica, looking like slowness.
#
# So the shell form is not wrong here, it is *accidentally* right, and it stops
# being right the moment anyone appends a second command or wraps the start in
# a script that does not `exec`. The exec form is right by construction, which
# is the property worth having.
CMD ["node", "dist/index.js"]
