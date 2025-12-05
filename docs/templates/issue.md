# Issue Template

Use this template for every Linear-backed issue doc. **Draft locally with the placeholder ID `LOCAL-TBD`, then create the Linear issue and rename/update the file once the real ID exists.** The YAML front matter stays metadata-only and must include `id`, `parent`, `children`, `blocked_by`, `blocked`, and `related_to`. Everything after the first `---` is the canonical issue body that syncs to Linear, and the very first element must always be the TL;DR. Never restate the title/issue key as a top-level heading—the Linear UI already surfaces those fields.

### Body / Implementation Rules
- Drop `<!-- SECTION SCOPE [SYNC] -->` immediately before the TL;DR heading so parsers can anchor the Linear-facing body.
- Use the exact H2 order shown below: TL;DR → Deliverables → Acceptance Criteria → Testing / Verification → Dependencies / Notes.
- Keep the Quick Navigation list inside the Implementation Details block only; it should link back to the H2 anchors above.
- Insert a Markdown separator (`---`) followed by `<!-- SECTION IMPLEMENTATION [NOSYNC] -->` and `## Implementation Details (Local Only)` for deep specifics that never sync to Linear.
- Any additional subsections (logs, tables, TOCs) belong under Implementation Details.

```
id: <TEAM-123>
title: <Issue Title>
state: planned | in_progress | done
priority: 0 | 1 | 2 | 3 | 4
estimate: 0 | 1 | 2 | 3 | 4 | 8 | 16
project: <project-slug>
milestone: <milestone-id>
assignees: [codex]
labels: [optional]
parent: <PARENT-ID or null>
children: [<CHILD-IDS>]
blocked_by: [<ID>]
blocked: [<ID>]
related_to: [<ID>]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- One-sentence summary that matches the opening line in Linear.

## Deliverables
- Tangible outputs scoped to this issue.

## Acceptance Criteria
- Verifiable checks that prove the work is complete.

## Testing / Verification
- Commands, scripts, or manual steps required for validation.

## Dependencies / Notes
- Human-readable list of blocking/blocked/related issues with Markdown links (mirrors the front-matter metadata for reviewers) plus any context that must live in Linear.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Scratch space for exploration notes or prompts. Do not sync this section to Linear.
- Include a Quick Navigation table so humans can jump back to the public sections.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
```
