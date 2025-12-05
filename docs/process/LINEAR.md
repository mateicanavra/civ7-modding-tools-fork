# Linear Conventions & Best Practices

This document provides conventions for working with Linear in this workspace. It ensures AI agents and human collaborators maintain consistent issue management, milestone planning, and project organization.

---

## Resources vs. Repo Templates
- Use Linear’s **Resources** panel to attach specs, links, or documents to a project; that interface remains the canonical location for project resources.
- When drafting those artifacts locally, copy the appropriate scaffold from `docs/templates/` (project, service, issue, milestone) before syncing the final content into Linear.
- Do **not** create a `docs/resources/` directory in the repo—active resources either live under the relevant `docs/projects/<slug>/` folder or inside Linear itself.

---

## Milestone Naming

### Core Principle: Name by What, Not by How

Milestone names should describe **architectural layers** or **capabilities delivered**, not the **technologies used** or **artifacts modified**.

**Good:** Layer-based, capability-focused
- ✅ "Stabilize UI Structure"
- ✅ "Stabilize Domain Logic"
- ✅ "Integrate Multi-Service System"

**Bad:** Technology-specific, artifact-focused
- ❌ "React App Stabilization"
- ❌ "Filter State Modularization"
- ❌ "API Integration"

### Why This Matters

**Technology names constrain perceived scope:**
```
"React App Stabilization" suggests:
→ We're working on React-specific concerns
→ Scope is limited to the React application

"Stabilize Domain Logic" reveals:
→ We're extracting framework-agnostic business logic
→ Scope inherently spans multiple surfaces (React, API, Retool, workflows)
```

**The work content already signals scope progression:**
```
M1: Stabilize UI Structure
    ↳ Scope: Presentation layer
    ↳ Surface: Single app

M2: Stabilize Domain Logic
    ↳ Scope: Business logic layer
    ↳ Surface: Multi-surface preparation

M3: Restructure as Monorepo
    ↳ Scope: Project architecture
    ↳ Surface: Multi-app structure

M4: Integrate Multi-Service System
    ↳ Scope: Full distributed system
    ↳ Surface: API + Workflows + Frontend + External
```

### When to Use Technology Names

**Only when the technology IS the scope:**
- ✅ "Migrate from Webpack to Vite" (tool migration is the work)
- ✅ "Add TypeScript Support" (language addition is the deliverable)
- ❌ "React Component Refactor" (should be "Stabilize UI Architecture")

---

## Issue Naming

### Structure: `[Milestone Prefix] Capability Delivered`

**Format:**
```
[M2] Operations Registry & AI Contract Alignment
[M3] Workspace Foundation & Documentation
[M4] API Foundation & Filter Operations Exposure
```

**Milestone Prefixes:**
- `[M1]`, `[M2]`, `[M3]`, etc.
- Enables filtering and grouping before milestone assignment
- Required because Linear API doesn't support programmatic milestone assignment

### Issue Title Guidelines

**Use active, imperative phrasing** per Linear's official guidance ("Write Issues Not User Stories"):

**Pattern:** `[Milestone] Verb Object [& Verb Object]`

**Start with a verb** to make the action immediately clear and scannable:
- ✅ "Extract service layer" (imperative, action-first)
- ✅ "Relocate and validate frontend" (imperative, clear actions)
- ✅ "Scaffold backend and workflows" (imperative, direct)
- ⚠️ Filenames remain descriptive/noun-first for searchability (e.g., `TEAM-48-agentic-workflow-foundation.md`), while the front-matter `title` uses the imperative phrasing. The shared `TEAM-XX` ID is the canonical anchor between the two, so slight differences are acceptable.
- ❌ "Service layer extraction" (passive noun phrase)
- ❌ "Frontend relocation & validation" (passive noun phrase)

**Rationale:** Imperative titles improve scannability in lists/boards and align with Linear's recommendation that titles should "start with a short verb/action" and "directly state what the task is."

**Keep titles concise but specific:**
- ✅ "Implement agentic workflow foundation (Inngest + Agent SDK)"
- ✅ "Deploy to production and integrate externally"
- ❌ "Workflows" (too vague)
- ❌ "Refactor hooks" (vague activity without clear outcome)
- ❌ "Implement Inngest workflow orchestration with OpenAI Agents SDK integration for AI-powered async operations" (too verbose)

---

## Issue Descriptions

### Core Principle: Descriptions Define Work, Not Status

**Issue descriptions should contain only:**
- **Scope** — What needs to be done
- **Objectives** — What this achieves
- **Acceptance Criteria** — How we know it's complete
- **Checklists** — Actionable work items (not status logs)
- **References** — Links to related docs/issues

**Issue descriptions should NOT contain:**
- **Status updates** — Use Linear status field instead
- **Progress notes** — Use comments, not descriptions
- **"Next steps"** or temporal markers — These belong in comments
- **Embedded estimates** — Use Linear estimate field (unless required for context)
- **Date-stamped sections** — Avoid "Status (2025-11-06)" headings

**Status belongs in Linear metadata:**
- Update via Linear status field (Backlog, Todo, In Progress, Done, Canceled)
- Update via Linear MCP tools (`update_issue` with `state` parameter)
- Track progress via Linear comments or activity log
- Status indicators in descriptions become stale immediately after saving

Add these universal description rules to every issue:
- **TL;DR first:** After the YAML front matter, start the synced body with `## TL;DR` (no duplicate title) and keep the text to a single-sentence summary that mirrors Linear’s intro.
- **Body markers + order:** Drop `<!-- SECTION SCOPE [SYNC] -->` immediately before `## TL;DR`, then keep the exact H2 sequence: TL;DR → Deliverables → Acceptance Criteria → Testing / Verification → Dependencies / Notes. Parsers rely on that structure, so do not insert extra H2s in the public body.
- **Implementation separator:** After the public body, add a `---` line followed by `<!-- SECTION IMPLEMENTATION [NOSYNC] -->` and `## Implementation Details (Local Only)` for any deep procedures that should stay out of Linear.
- **Quick Navigation placement:** If you need a TOC, place it under Implementation Details (e.g., `### Quick Navigation`) so the public body stays concise.
- **No status headers:** Avoid "Status", "Next Steps", or date-stamped headings inside descriptions; use comments/status updates instead.

### Anatomy of a Good Issue Description

```markdown
**TL;DR:** Single-sentence summary that mirrors the Linear issue intro.

**Complexity:** Low | Medium | High
**Guidance:** Minimal | Moderate | Heavy
**Dependencies:** [List prerequisite issues]
**Value to Deliver:** [One-sentence outcome]

## Objectives

[What this work achieves and why it matters]

## Work Required

- [ ] Specific deliverable 1
  * Implementation detail
  * Implementation detail
- [ ] Specific deliverable 2
- [ ] Specific deliverable 3

## Acceptance Criteria

- [ ] Criterion 1 (e.g., tests passing)
- [ ] Criterion 2 (e.g., documentation updated)
- [ ] Criterion 3 (e.g., regression suite clean)

## Integration

[How this connects to other work, what becomes possible]

## References

* **Technical Plan:** `docs/plan-name.md`
* **Parent Issue:** TEAM-X
* **Depends On:** TEAM-Y, TEAM-Z
```

### Description Best Practices

**1. Complexity indicates effort, not importance**
- Low = straightforward, established patterns
- Medium = some unknowns, moderate scope
- High = significant unknowns, large scope or high risk

**2. Guidance indicates AI autonomy level**
- Minimal = AI can execute independently
- Moderate = AI needs some direction
- Heavy = Requires significant human guidance

**3. Dependencies are explicit**
- Front matter lists the machine-readable truth (`blocked_by`, `blocked`, `related_to`).
- The body repeats those relationships for humans (e.g., `- Blocked by [TEAM-10](...)`).
- When opening/closing work, consult the front matter first so you know what must complete before/after your task.

**4. Work Required uses checkboxes**
- Each top-level item is a significant deliverable
- Sub-bullets provide implementation details (not status)
- Enables scope tracking, not progress tracking

**5. Acceptance Criteria define "done"**
- Clear, testable conditions
- Not implementation steps
- Guide validation, not execution

**6. Integration section connects the dots**
- How does this enable future work?
- What becomes possible after completion?
- Where does this fit in the larger architecture?

**7. Keep descriptions timeless**
- Avoid date references ("as of 2025-11-06")
- Avoid status markers ("Phase 4 Complete")
- Descriptions should read the same at start and finish

---

## Status Management

### Tracking Progress via Linear Metadata

**Use Linear fields, not issue descriptions:**

**Status Field:**
- Backlog → Todo → In Progress → Done → Canceled
- Update via Linear UI or MCP tools
- Never embed status in descriptions ("Status: Complete")

**Progress Tracking:**
- Use Linear comments for updates
- Use Linear activity log for history
- Use sub-issue completion percentage (auto-calculated)
- Use checklist completion in descriptions (checkboxes)

**Temporal Updates:**
- Post as comments, not description edits
- Use Linear activity for historical record
- Keep descriptions timeless

### Parent Issues Auto-Completion

**Parent issues automatically complete when all sub-issues are done:**
- Don't manually mark parent issues complete
- Linear auto-completes when last sub-issue closes
- Parent status reflects aggregate sub-issue state

**Best practices:**
- Break large work into sub-issues
- Each sub-issue has clear deliverable
- Sub-issues can be closed independently
- Parent completes automatically

**Example workflow:**
```
TEAM-9 (Parent): Extract Service Layer
├─ TEAM-23 (Sub): Baseline Snapshot ✅ Done
├─ TEAM-24 (Sub): Service Design ✅ Done
├─ TEAM-25 (Sub): Build Service → In Progress
├─ TEAM-26 (Sub): Integration → Todo
└─ TEAM-27 (Sub): Validation → Todo

When TEAM-27 closes → TEAM-9 auto-completes
```

**What to track in parent descriptions:**
- List of sub-issues (links)
- Overall scope and objectives
- Integration notes
- References to technical plans

**What NOT to track in parent descriptions:**
- Sub-issue completion status (Linear shows this)
- Progress updates (use comments)
- "X of Y sub-issues complete" (Linear calculates this)

---

## Project Scope & Sizing

### Milestone Sizing Guidelines

**Milestones should be completion-oriented, not time-boxed:**
- ✅ Group by architectural layer or major capability
- ✅ Ensure each milestone leaves system in complete, working state
- ❌ Don't create milestones based on calendar quarters
- ❌ Don't split work arbitrarily to hit artificial deadlines

**Typical milestone scope:**
- 3-6 parent issues per milestone
- Each issue represents 1-3 weeks of focused work (if time-estimating)
- Milestones should complete a conceptual "phase"

**Progressive scope expansion:**
```
M1: Single layer, single surface
M2: Single layer, multi-surface preparation
M3: Infrastructure transformation
M4: Multi-service integration
M5: Cross-cutting capabilities
```

### Issue Sizing Guidelines

**Issues should be "parent issue" level:**
- Not individual tasks (too small)
- Not entire epics (too large)
- Right size: 3-10 distinct work items

**Break large issues into sub-issues when:**
- Work spans multiple sprint cycles
- Different team members own different parts
- Dependencies between sections require phased delivery

**Keep issues atomic when:**
- Work is tightly coupled
- Single developer can complete in 1-2 weeks
- Breaking apart would create artificial handoffs

---

## Estimation Conventions

### Parent-Only Estimation Rule

**Only parent issues carry estimates. Sub-issues remain unestimated.**

**Rule:**
- Set estimates exclusively on parent issues
- Sub-issues should have no estimate value (0 or unset)
- Parent estimate represents total effort for all sub-issues combined

**Rationale:**
1. **Avoids double-counting** — Linear does not auto-calculate parent estimates from sub-issues. If both parent and children have estimates, cycle/project totals will count both, inflating actual scope.
2. **Reduces maintenance burden** — Updating individual sub-issue estimates requires manually recalculating parent totals. Parent-only estimation eliminates this synchronization overhead.
3. **Single source of truth** — Parent estimate is the authoritative effort signal. Sub-issues track work breakdown, not effort accounting.

**Implementation:**
- When creating sub-issues, leave the estimate field unset or explicitly set to 0
- When breaking down work, calculate total points conceptually (sub-issues should represent 1–2 point tasks), then assign that total to the parent
- Update parent estimate if scope changes, not individual sub-issue estimates

**Example:**

TEAM-29 (Parent): Docs Migration — 8 points
├─ TEAM-37: Scaffold Directories — no estimate
├─ TEAM-38: Relocate Evergreen Docs — no estimate
├─ TEAM-39: Move Project Assets — no estimate
├─ TEAM-40: Backfill Milestone Tasks — no estimate
└─ TEAM-41: Split Architecture Content — no estimate

Conceptual breakdown (for planning only):
  - TEAM-37: ~1 point effort
  - TEAM-38: ~1 point effort
  - TEAM-39: ~2 points effort
  - TEAM-40: ~2 points effort
  - TEAM-41: ~1 point effort
  Total: 7 points → assigned to parent only (rounded to 8)

**Note:** Linear uses Fibonacci point values (1, 2, 3, 5, 8, 13...). When calculating totals, round to nearest Fibonacci number (e.g., 7 points rounds to 8).


---

## Sequencing & Dependencies

### Forward-Only Progress

**Each milestone should leave the system in a complete, usable state:**
- ✅ M1 complete → working React app
- ✅ M2 complete → domain logic extracted and testable
- ✅ M3 complete → monorepo operational, all packages build
- ❌ M1 complete → half-built app with TODOs

**Avoid backtracking:**
- Don't mark M1 "complete" if you know M2 will require M1 rework
- If rework is needed, it should be part of M1's definition

### Dependency Clarity

**Explicit over implicit:**
```markdown
**Dependencies:** Operations Registry (Issue 3) complete
```

**Chain dependencies properly:**
- Issue 1 → Issue 2 → Issue 3 (serial)
- Issues 4, 5, 6 can start after Issue 3 (parallel)

**Avoid circular dependencies:**
- If A depends on B and B depends on A, redesign the split

---

## Complexity & Guidance Framework

### Replacing Time Estimates

**For AI-driven development, complexity + guidance is more useful than time estimates:**

**Complexity = Technical challenge**
- Low: Well-understood patterns, minimal unknowns
- Medium: Some research needed, moderate scope
- High: Significant unknowns, large integration surface

**Guidance = Human involvement needed**
- Minimal: AI can execute autonomously
- Moderate: AI needs architectural decisions, pattern selection
- Heavy: Requires human design, multiple feedback cycles

**Example combinations:**

| Complexity | Guidance | Interpretation |
|---|---|---|
| Low | Minimal | Routine work, fully automatable |
| Medium | Minimal | AI-friendly task with moderate scope |
| High | Moderate | Complex but well-scoped, AI needs direction |
| High | Heavy | Requires human expertise, AI assists |

### When to Use Each Rating

**Low Complexity:**
- Established patterns exist in codebase
- Similar work completed previously
- Clear acceptance criteria

**Medium Complexity:**
- Some new patterns or tools
- Integration with existing systems
- Requires design decisions

**High Complexity:**
- New architectural patterns
- Multiple unknowns
- High integration risk
- Experimentation required

**Minimal Guidance:**
- Patterns documented
- Examples exist
- AI can infer requirements

**Moderate Guidance:**
- Needs architectural decisions
- Pattern selection required
- Some ambiguity in requirements

**Heavy Guidance:**
- Novel problem space
- Requires domain expertise
- Multiple stakeholders
- Iterative refinement expected

---

## Issue Linking Conventions

### Linking to Other Issues

**Preferred: Bare Identifiers (Auto-Linked)**

Linear automatically converts bare issue identifiers to full markdown links when you save an issue description.

```markdown
## Sub-Issues

- TEAM-23: Baseline Snapshot ✅ Done
- TEAM-24: Service Design ✅ Done
- TEAM-25: Build Service (2pt) - Not Started
- TEAM-26: Integration (2pt) - Not Started
```

After save, Linear converts these to:
```markdown
- [TEAM-23](https://linear.app/your-workspace/issue/TEAM-23/baseline-snapshot-and-dependency-mapping)
- [TEAM-24](https://linear.app/your-workspace/issue/TEAM-24/service-design)
```

**Fallback: Explicit Markdown Links**

If auto-linking doesn't occur (e.g., in programmatic updates where you can't verify), use standard markdown links:

```markdown
[TEAM-23](https://linear.app/your-workspace/issue/TEAM-23)
```

**Short form (identifier-only URL) works equally well:**
- Full URL: `[TEAM-23](https://linear.app/your-workspace/issue/TEAM-23/baseline-snapshot)`
- Short URL: `[TEAM-23](https://linear.app/your-workspace/issue/TEAM-23)`
- Both route correctly; slug is optional

### Link Stability

**Title changes don't break links:**
- Linear routes by issue ID, not title slug
- Old URLs with outdated slugs still work
- You don't need to update links when renaming issues

### Template: Parent Issue with Sub-Issues

```markdown
## Sub-Issues

This parent issue has been broken down into 5 sub-issues (8 points total):

- TEAM-23: Baseline Snapshot & Dependency Mapping ✅ Done (1pt)
- TEAM-24: Service Boundary & Interface Design ✅ Done (1pt)
- TEAM-25: Build Pure Service Layer (2pt)
- TEAM-26: Adapter Integration & Hook Refactor (2pt)
- TEAM-27: Validation & Documentation Sync (1pt)
```

**Important:** Don't duplicate status information next to links. Update the sub-issue's actual status in Linear and let references reflect it automatically. Status indicators (✅, 🔲) are acceptable for quick visual scanning but should not replace proper Linear status tracking.

### Caveats

**Auto-linking timing:**
- Auto-linking happens server-side when the issue is saved
- You must re-fetch the issue to see converted links
- API responses show stored markdown, not UI-rendered versions

**Related issues:**
- Linear automatically creates "related issue" links when you reference issues in descriptions
- This is intentional; it helps surface dependencies

**When using Linear MCP:**
```typescript
// Auto-linking approach (recommended)
await mcp__linear_anvil__update_issue({
  id: "parent-id",
  description: "Sub-issues: TEAM-23, TEAM-24, TEAM-25"
});

// Explicit link approach (when you need immediate control)
await mcp__linear_anvil__update_issue({
  id: "parent-id",
  description: "Sub-issues: [TEAM-23](https://linear.app/.../TEAM-23)"
});
```

### Documenting Issue Dependencies

**For blocking/blocked relationships created via API:**

When creating issues with dependencies, add a dependency section at the bottom of the issue description. Use explicit markdown links (bare identifiers do not auto-convert via API).

```markdown
## Blocked
- [TEAM-23](https://linear.app/your-workspace/issue/TEAM-23)
- [TEAM-24](https://linear.app/your-workspace/issue/TEAM-24)

## Blocked By
- [TEAM-9](https://linear.app/your-workspace/issue/TEAM-9)
```

**Note:** Bare identifiers do not auto-convert to links via API. Use explicit markdown links as shown above. Slug is optional (short form works). After creating issues with dependency links, manually establish "blocks/blocked by" relationships in Linear UI (markdown links alone do not create relationships, only visual references).

### ID Assignment & Linking Workflow

- **Draft locally first:** Create the markdown doc (using the issue template) before opening the Linear issue. Use the placeholder `LOCAL-TBD` for the filename and `id` while drafting.
- **Create in Linear second:** Once the plan looks good, create the Linear issue. Linear assigns IDs sequentially, so do not guess the final identifier in git.
- **Rename/update immediately:** After the Linear issue exists, rename the local file, update the `id`, and replace any `LOCAL-TBD` references with the actual ID.
- **Link in bulk:** When all related issues are created, add Markdown links pointing to their Linear URLs near the top of each issue doc. Doing this in one pass prevents churn if IDs shift during creation. Linear will auto-convert those links/references in the UI.
- **Existing mismatches:** Some issue docs may carry placeholder IDs because their Linear counterparts were not created yet. Track and reconcile them as the real issues come online.

### Archiving After Milestones

- **Milestone wrap-up:** When a milestone is marked complete in Linear, sweep the corresponding repo docs: move finished issue files into `docs/projects/<project>/issues/archive/` and relocate superseded resources into `resources/archive/` before kicking off the next milestone. This keeps the live folders scoped to in-flight work.
- **Link hygiene:** Immediately after the sweep, run `rg` (or use IDE search) to update references so AGENTS, milestones, and related issues continue to resolve. Note the archive action in the relevant log or milestone summary.
- **Project completion:** When an entire project finishes (all milestones done, no follow-up work planned), move the whole `docs/projects/<project>/` folder under `docs/projects/archive/` so logs/updates travel with it.
- **Pitfalls to avoid:** Don't archive milestones/logs piecemeal—they document the timeline and should remain in the live tree until the full project archives. Keep archive directories limited to the locations above so future agents know exactly where to look.

---

## Issue Organization

### Labels

**Label Strategy: Two-Dimensional Taxonomy**

Linear labels serve two distinct, orthogonal purposes. Use both dimensions to provide rich semantic context for filtering and organization.

#### Dimension 1: Work Type (Intent)

**Pick exactly one per issue:**

- **Feature** — Net new capability that didn't exist before
- **Improvement** — Enhancement to existing capability
- **Bug** — Fixing broken behavior

**These are mutually exclusive.** Work is either building something new (Feature), making something existing better (Improvement), or fixing something broken (Bug).

#### Dimension 2: Work Aspect (Domain)

**Pick any that apply (0-N per issue):**

- **Testing** — Significant test coverage, infrastructure, or validation work
- **Documentation** — Significant documentation work (not incidental updates)
- **Architecture** — Foundational structural or architectural changes
- **Technical Debt** — Internal quality improvements, refactoring, or cleanup

**These can combine freely.** An issue can be both Architecture + Technical Debt, or Feature + Testing + Documentation.

#### Multi-Label Combinations

**Real examples from this project:**

```
[M2] Domain Logic Extraction
→ Technical Debt + Architecture + Testing
→ Paying down React coupling debt via architectural refactoring with test coverage

[M2] Operations Registry & AI Alignment
→ Improvement + Architecture
→ Enhancing existing filter operations with architectural registry pattern

[M4] API Foundation & Filter Operations Exposure
→ Feature + Architecture
→ Net new API capability requiring foundational architectural work

[M5] Agent Harness Standardization
→ Improvement + Architecture
→ Enhancing existing AI capabilities with standardized patterns

Hypothetical: "Add authentication to API"
→ Feature + Architecture + Documentation
→ Net new auth capability with architectural decisions and API docs

Hypothetical: "Backfill filter operation tests"
→ Testing + Technical Debt
→ Test coverage work paying down testing debt
```

#### Semantic Filtering Patterns

**Questions you can answer with label filters:**

**Single dimension:**
- "Show me all net new features" → Filter: `Feature`
- "Show me all enhancements to existing work" → Filter: `Improvement`
- "Show me all bugs" → Filter: `Bug`
- "Show me all architectural changes" → Filter: `Architecture`
- "Show me all technical debt" → Filter: `Technical Debt`
- "Show me all testing-focused work" → Filter: `Testing`
- "Show me all documentation work" → Filter: `Documentation`

**Multi-dimension combinations:**
- "Show me new features with architectural changes" → Filter: `Feature + Architecture`
- "Show me testing-focused improvements" → Filter: `Improvement + Testing`
- "Show me architectural technical debt" → Filter: `Architecture + Technical Debt`
- "Show me bugs that require architectural fixes" → Filter: `Bug + Architecture`
- "Show me features that need documentation" → Filter: `Feature + Documentation`

**Cross-milestone filtering:**
- "Show me all architecture work across all milestones" → Filter: `Architecture` (no milestone filter)
- "Show me all technical debt we're paying down" → Filter: `Technical Debt` (across all milestones)
- "Show me all feature work in M4 and M5" → Filter: `Feature` + Milestones M4/M5

#### Label Application Guidelines

**All new issues should have:**
1. **One intent label** (Feature, Improvement, or Bug)
2. **Zero or more aspect labels** (Testing, Documentation, Architecture, Technical Debt)

**When in doubt:**
- If building something that didn't exist → `Feature`
- If making something existing better → `Improvement`
- If fixing broken behavior → `Bug`
- If significant architectural decisions involved → `+ Architecture`
- If paying down structural/quality debt → `+ Technical Debt`
- If substantial test coverage work → `+ Testing`
- If substantial documentation effort → `+ Documentation`

**Don't over-label:**
- ❌ Don't tag every M2 issue with "M2" (use `[M#]` prefix instead)
- ❌ Don't create labels for temporary states
- ❌ Don't use aspect labels for minor/incidental work (e.g., don't add `Documentation` for a small README update)
- ✅ Do use labels for filtering across milestones
- ✅ Do combine multiple aspect labels when appropriate

### Priorities

**Priority reflects urgency + impact, not just importance:**
- **Urgent (1):** Blockers, production issues
- **High (2):** Critical path, enables other work
- **Medium (3):** Important but not blocking
- **Low (4):** Nice-to-have, optional work

**Milestone issues typically:**
- Current milestone critical path: High (2)
- Current milestone supporting work: Medium (3)
- Future milestone prep: Medium (3)
- Experimental/optional: Low (4)

### States

**Use Linear's default states:**
- **Backlog:** Not started, not scheduled
- **Todo:** Scheduled, not started
- **In Progress:** Active work
- **Done:** Complete
- **Canceled:** Won't do

**Avoid custom states unless necessary:**
- Linear's defaults work well for most workflows
- Custom states add cognitive overhead

---

## Linear API Limitations

### Known Constraints

**Cannot programmatically:**
- Create milestones
- Assign issues to milestones
- Bulk-update milestone assignments

**Workarounds:**
- Use `[M#]` prefixes in titles
- Create milestone templates in project description
- Filter by title prefix for manual milestone assignment

### Best Practices Given Limitations

**1. Prefix all issue titles with milestone marker**
```
✅ [M2] Operations Registry & AI Contract Alignment
❌ Operations Registry & AI Contract Alignment
```

**2. Include milestone templates in project description**
- Enables manual milestone creation
- Provides consistency across projects

**3. Group issues by milestone in planning docs**
- `docs/projects/<project-slug>/milestones/M2-*.md` contains all M2 issues
- Enables bulk creation and tracking

---

## Documentation Workflow

### Issue ↔ Documentation Sync

**Each milestone should have:**
1. **Linear issues** (project management, tracking)
2. **Milestone document** (detailed planning, context)
3. **docs/ROADMAP.md reference** (roadmap visibility)

**When creating issues:**
1. Draft parent issues in milestone document first
2. Create Linear issues from milestone document
3. Link Linear issues back to milestone document

**When updating issues:**
1. Update Linear issue status/description
2. Update milestone document if scope changes
3. Update docs/ROADMAP.md if milestone shifts

### Single Source of Truth

**Linear is the source of truth for:**
- Current status (Backlog, In Progress, Done)
- Assignments
- Real-time discussions

**Milestone documents are the source of truth for:**
- Full context and rationale
- Detailed work breakdown
- Architectural decisions
- Integration notes

**docs/ROADMAP.md is the source of truth for:**
- Overall roadmap
- Milestone sequencing
- Success criteria

---

## For AI Agents

### When Working With Linear

**1. Always read milestone documents first**
- `docs/projects/<project-slug>/milestones/MX-*.md` contains full context
- Linear issues are summaries, not complete specs

**2. Use established patterns**
- Follow existing issue description structure
- Match complexity/guidance ratings to similar work
- Maintain consistent formatting

**3. Separate status from descriptions**
- Update Linear status field, not descriptions
- Post progress updates as comments
- Keep descriptions timeless and work-focused
- Use MCP tools to update status/state

**4. Update docs when scope changes**
- Scope changes require doc updates
- Keep Linear issue descriptions in sync with milestone docs
- Link to detailed documentation
- Add comments for temporal updates

**5. Never manually complete parent issues**
- Parent issues auto-complete when sub-issues close
- Focus on completing sub-issues
- Update sub-issue status via Linear fields

**6. Include full context in issues**
- AI agents (future you) need complete information
- Don't assume context from previous conversations
- Link to detailed documentation
- Keep objectives and acceptance criteria clear

**7. Follow naming conventions strictly**
- Milestone prefixes enable filtering
- Layer-based names reveal scope
- Consistency enables automation

### When Planning Milestones

**1. Think in layers, not technologies**
- What architectural layer does this stabilize?
- What capabilities does this enable?
- Avoid naming after specific tools/frameworks

**2. Ensure forward-only progress**
- Each milestone leaves system in complete state
- No "phase 1 of 3" that leaves work half-done
- Dependencies clear and non-circular

**3. Size for completion, not time**
- Group conceptually related work
- Don't split arbitrarily for calendar alignment
- Aim for 3-6 parent issues per milestone

**4. Document the "why" extensively**
- Future agents need architectural context
- Integration notes explain how pieces connect
- Rationale prevents repeated debates

---

**Last Updated:** 2024-11-24
**For Questions:** See project documentation for context
### Front Matter Requirements

- Use `id` as the identifier field in every issue/milestone/project doc. All issue docs must include: `id`, `title`, `state`, `priority`, `estimate`, `project`, `milestone`, `assignees`, `labels`, `parent`, `children`, `blocked_by`, `blocked`, and `related_to`. Example:

```yaml
---
id: TEAM-11
title: Relocate Frontend App Into TurboRepo
state: in_progress
priority: 2
estimate: 4
project: monorepo-refactor
milestone: milestone-3-monorepo
assignees: [codex]
labels: [refactor, architecture]
parent: TEAM-29
children: [TEAM-11A]
blocked_by: [TEAM-10]
blocked: [TEAM-12]
related_to: []
---
```

- **Required fields:**
  - `id`: Issue identifier (e.g., TEAM-11)
  - `title`: Issue title
  - `state`: planned | in_progress | done | future
  - `priority`: 0 (none) | 1 (urgent) | 2 (high) | 3 (normal) | 4 (low)
  - `estimate`: Exponential scale: 0 | 1 | 2 | 4 | 8 | 16
  - `project`: Project slug
  - `milestone`: Milestone identifier
  - `assignees`: Array of assignee identifiers
  - `labels`: Array of label strings (empty array if none)
  - `parent`: Parent issue ID or null
  - `children`: Array of child issue IDs (empty array if none)
  - `blocked_by`: Array of issue IDs that block this issue (empty array if none)
  - `blocked`: Array of issue IDs that this issue blocks (empty array if none)
  - `related_to`: Array of related issue IDs (empty array if none)

- Always populate `parent`, `children`, `blocked_by`, `blocked`, and `related_to`. Even empty relationships should be represented (e.g., `children: []`) so agents can trust the metadata.
- Before picking up work, read these fields to understand upstream blockers and downstream follow-ups.
- Maintain the human-readable dependency list near the bottom of the Markdown body with explicit links (e.g., `- Blocked by [TEAM-10](https://linear.app/.../TEAM-10)`) so reviewers can navigate quickly. Front matter stays machine-friendly; the body stays human-friendly.
