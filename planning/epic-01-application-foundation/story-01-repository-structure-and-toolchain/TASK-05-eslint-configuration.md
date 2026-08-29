# Task 1.1.5 — ESLint configuration

**Status:** Not started
**Story:** [1.1 Repository Structure & TypeScript Toolchain](STORY.md)
**Depends on:** Task 1.1.4

## Objective

One lint configuration for the whole workspace, with the minimum necessary per-package variation.

## Work

* Install ESLint with TypeScript support and configure it using flat config
* Define a shared root configuration covering all packages
* Enable type-aware linting, wired to the project references from Task 1.1.4
* Add only the per-package variation genuinely required — browser globals and React rules for the frontend, Node globals for the backend
* Add a `lint` script to each package
* Add an ignore configuration covering build output and generated files

## Done when

* Lint runs across every package and passes on the current tree
* Type-aware rules work (verified by a deliberate violation that gets caught, then removed)
* A rule set is chosen deliberately, not copied wholesale without review
* Lint is fast enough to run before every commit without being irritating

## Notes

Type-aware linting is slower but catches the class of mistake this project cares about — floating promises in the streaming and agent code, and unsafe `any` propagation across the tool boundary. Worth enabling now while the tree is small enough to tune.
