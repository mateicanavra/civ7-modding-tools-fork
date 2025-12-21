# Project: CLI Orchestration v0
**Status:** Active
**Timeline:** 2025-12-21 → TBD
**Teams:** dev

## Scope & Objectives
- Define and deliver a repo-local orchestration loop for milestone → issues → dev/review/fix.
- Establish a stable `dev-auto-*` contract and runner expectations for v0.
- Keep orchestration lightweight, deterministic, and observable via structured logs.

## Deliverables
- [ ] v0 orchestration script (Bun/TS) using a runner abstraction (SDK default).
- [ ] `dev-auto-*` contract and runner cheat sheet finalized for implementation.
- [ ] Project ADR capturing v0 architectural decisions.
- [ ] PRD describing v0 scope and non-goals.

## Milestones
- M1: Spec + contracts locked (ADR + PRD + contracts).
- M2: v0 orchestrator thin slice (sequential issues, dev → review → fix).

## Links & References
- PRD: `docs/projects/cli-orchestration-v0/resources/PRD-cli-orchestration-v0.md`
- ADR: `docs/projects/cli-orchestration-v0/resources/ADR-001-orchestration-v0.md`
- Contract: `docs/projects/cli-orchestration-v0/resources/CONTRACT-dev-auto-and-runner.md`
- Spikes: `docs/projects/cli-orchestration-v0/spikes/`
