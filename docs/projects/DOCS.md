# Projects — Docs Hygiene

This directory holds time-bound, project-scoped docs (milestones, issue specs, reviews, status, etc.).

## Always record deferrals + follow-ups

When you discover work that is **real** but **intentionally not done now**, record it immediately in the project’s:

- `deferrals.md` for **intentional deferrals / temporary compatibility tradeoffs**
  - Use this for “we’re living with X until Y happens” items.
  - Include a **trigger** for when to revisit.
- `triage.md` for **unsequenced follow-ups**
  - Use **Triage** when a decision/research is needed.
  - Use **Backlog** when the work is definite but not yet scheduled.

Avoid leaving these only in:
- PR review threads
- milestone review docs
- issue docs
- chat logs

Those are useful context, but `deferrals.md` + `triage.md` are the durable “don’t lose it” sinks.

## Where to put things (quick rule)

- If it’s a **temporary compromise** with an explicit revisit condition → `deferrals.md`
- If it’s **work we should do later** but not scheduled → `triage.md`

## Cross-linking

When adding an entry:
- Link back to the source issue/review/milestone doc that surfaced it.
- If a triage item is derived from a deferral, reference the deferral ID.

