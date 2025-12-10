# Graphite Stacked Pull Requests Workflow

This document provides comprehensive guidance for using Graphite's stacked PR workflow in the magic-temp repository. **All AI agents and developers should use stacked PRs for future commits** to maintain clean, reviewable, and incrementally mergeable work.

## Table of Contents
1. [Why Stacked PRs](#why-stacked-prs)
2. [Core Concepts](#core-concepts)
3. [Stacks & Milestones](#stacks--milestones)
4. [Essential Commands Reference](#essential-commands-reference)
5. [Quick Start Workflow](#quick-start-workflow)
6. [Stack Operations & Iteration](#stack-operations--iteration)
7. [Sync and Collaboration](#sync-and-collaboration)
8. [Merging and Cleanup](#merging-and-cleanup)
9. [Commit Hygiene Best Practices](#commit-hygiene-best-practices)
10. [GitHub Configuration](#github-configuration)
11. [Common Scenarios](#common-scenarios)
12. [Troubleshooting](#troubleshooting)
13. [Additional Resources](#additional-resources)

---

## Why Stacked PRs

Stacked PRs solve the problem of large, monolithic pull requests by breaking work into small, logically dependent changes. Benefits include:

- **Faster Reviews**: Reviewers can approve small, focused PRs incrementally
- **Parallel Progress**: Work on next layers while earlier ones are in review
- **Clear Dependencies**: Stack structure shows logical build order
- **Easy Rollback**: Can abandon upper layers without losing lower work
- **Better Context**: Each PR represents one atomic, understandable change
- **Reduced Conflicts**: Smaller changes = fewer merge conflicts

For refactoring work (like Stage 6 service extraction), stacked PRs are essential for maintaining velocity while ensuring quality.

---

## Core Concepts

### Branch Stack
A "stack" is a series of branches where each branch builds on top of the previous one. The base of the stack is your trunk branch (typically `main`).

```
◉ part_3 (current)          ← Top of stack
│
◯ part_2                     ← Middle layer
│
◯ part_1                     ← Base layer
│
◯ main                       ← Trunk
```

### Upstack vs Downstack
- **Downstack**: Branches below the current branch (closer to trunk)
- **Upstack**: Branches above the current branch (farther from trunk)

### Restacking
When you modify a branch in the middle of a stack, Graphite automatically rebases all upstack branches to incorporate your changes. This keeps the stack consistent.

---

## Stacks & Milestones

Milestones describe *what* needs to ship; Graphite stacks describe *how* we stage the Git history to ship it. Even when Linear is unavailable, each milestone document (see `docs/projects/monorepo-refactor/milestones/*.md`) must spell out the stacks required to complete that milestone.

- **One milestone, many stacks:** Break parent-level workstreams into independent stacks. Each stack originates from `main` (or the current trunk) and may contain one branch (small issue) or several layers (ordered subtasks of the same parent issue).
- **Sequencing:** Within a stack, layers must merge bottom-to-top. Use stacks for chains that have strict dependencies (e.g., ANVIL-29 → ANVIL-42). Document that order under the milestone’s *Sequencing & Parallelization Plan* so reviewers know why one PR blocks another.
- **Parallelization:** Separate stacks can progress simultaneously as long as their prerequisites are satisfied. Capture these parallel tracks in the same plan so the team knows which stacks can run in parallel and which must pause until a dependency merges.
- **No Linear?** Reference the milestone doc directly when naming stacks/branches (e.g., `m3-stack-a-anvil-29`). The milestone still owns the source of truth for stack membership, so downstream collaborators can trace a branch back to its milestone context without Linear links.
- **Sub-issues:** Reserve additional stack layers for sub-issues that need their own PRs. Smaller checklist items stay as commits within the parent branch to keep stacks short and reduce restack churn.

Every milestone doc must include a “Sequencing & Parallelization Plan” that lists the active stacks (e.g., Stack A, Stack B) and the issues/layers assigned to each. Mirror that plan in Linear (when used) so the issue tracker and Git workflow stay in sync.

---

## Essential Commands Reference

| Command | Alias | Purpose |
|---------|-------|---------|
| `gt init` | - | Initialize Graphite in repository |
| `gt create -am "msg"` | `gt c -am` | Create new branch + commit |
| `gt create --insert` | `gt c -i` | Insert branch in middle of stack |
| `gt submit --stack` | `gt ss` | Submit all PRs in stack |
| `gt submit --stack --update` | `gt ss -u` | Update existing PRs |
| `gt modify --all` | `gt m -a` | Amend current branch |
| `gt modify --commit` | `gt m --commit` | Add new commit to branch |
| `gt sync` | - | Sync with remote + restack |
| `gt sync --force` | `gt sync -f` | Force sync (no prompts) |
| `gt checkout` | `gt co` | Interactive branch picker |
| `gt log short` | `gt ls` | Show branch hierarchy |
| `gt stack` | - | Show current stack details |
| `gt restack` | - | Rebase stack after changes |
| `gt squash` | - | Squash commits in branch |
| `gt fold` | `gt f` | Fold branch into parent |
| `gt get [branch]` | - | Fetch coworker's stack |
| `gt track` | `gt tr` | Track external branch |
| `gt merge` | - | Merge stack via Graphite |
| `gt bottom` | - | Jump to bottom of stack |
| `gt trunk` | - | Jump to trunk branch |

---

## Quick Start Workflow

### Initial setup

```bash
gt init            # First run only – picks trunk (main)
gt sync && gt checkout main
```

### Build a stack in layers

1. Make a focused change for the first layer and run `gt create -am "feat(scope): summary"`.
2. Repeat for each dependent layer (implementation → integration → tests → docs, etc.).
3. Use `gt ls` to confirm the stack order and `gt co branch-name` to jump between layers.

### Submit and keep iterating

```bash
gt ss                 # Submit the stack (or gt ss -u to update)
gt modify -a          # Amend current branch after edits
gt create -i -am "..."  # Insert a forgotten layer between existing ones
```

Graphite will restack any upstack branches automatically when you amend or insert.

### Before hand-off

- `gt ls` – verify the review order (always bottom → top).
- `gt squash` – ensure single commit per branch when needed.
- `gt ss -u` – push final state, then document PR links + dependencies in your hand-off notes.

📌 **Milestone-specific templates** (e.g., Stage 6 service extraction) now live in the active milestone doc under `docs/projects/` to avoid duplication here.

## Stacking In Practice

Think of a stack as a river you step into when a parent issue spawns a chain of dependent changes. Open the first branch for the base issue (e.g., ANVIL-29), then add new layers for every PR-worthy sub-issue while smaller checkboxes stay behind as commits on those layers. Each branch in the stack is self-standing—it maps either to its own Linear issue or to a slim slice of work that would make sense as its own PR outside the stack. Ship downstream momentum by merging bottom-to-top: once reviewers approve the lowest branch, merge it, restack, and immediately pick up the next layer without leaving the river. If a new insight appears, `gt create --insert` drops another stone midstream without rewriting history; if a layer proves unnecessary, `gt fold` or delete the branch so the flow keeps moving. The stack “finishes” when every required layer has merged, but it stays fluid the whole way—layers land incrementally, issues stay traceable through branch names/PR titles, and folding lets you bail gracefully without losing the progress already downstream.

---

## Stack Operations & Iteration

### Creating Branches with Different Strategies

**Let Graphite infer branch name from commit message:**
```bash
gt create -am "feat(api): Add user fetching endpoint"
# Creates branch: feat-api-add-user-fetching-endpoint
```

**Specify branch name explicitly:**
```bash
gt create -am "feat: Add API endpoint" my-custom-branch-name
```

**Stage changes interactively:**
```bash
# Make changes
echo "code" >> file.js

# Add specific files
gt add file.js another.js

# Create commit on new branch
gt create -m "feat: Add feature"
```

**Use patch mode (select hunks):**
```bash
gt create --patch --message "feat: Partial changes"
# or alias: gt c -pm "feat: Partial changes"
```

### Visualizing Your Stack

**Short format (recommended):**
```bash
gt log short
# or alias: gt ls
```

**Detailed format:**
```bash
gt log
# Shows commit hashes, ages, PR links

gt stack
# Shows current stack only
```

### Navigating Between Branches

**Interactive selection:**
```bash
gt checkout
# Opens picker with all branches
# Use arrow keys + Enter
```

**Direct checkout:**
```bash
gt checkout branch-name
# or alias: gt co branch-name
```

**Jump to trunk:**
```bash
gt trunk
```

**Jump to bottom of stack:**
```bash
gt bottom
```

### Editing Existing Layers

**Amend a single-commit branch**
```bash
gt checkout <branch>
# edit files
gt modify -a            # or gt m -a
gt ss -u                # update matching PR
```
Graphite automatically restacks every upstack branch after the amend.

**Add a follow-up commit instead of amending**
```bash
gt checkout <branch>
# edit files
gt modify --commit -am "describe change"
gt ss -u
```
Use this when reviewers prefer seeing the delta before you squash.

**Address review feedback** by using either approach above or (if you already amended via Git) running `gt restack` so dependent branches pick up the change.

### Inserting or Splitting Branches

**Insert a forgotten layer between two branches**
```bash
gt checkout <parent-branch>
# edit files
gt create --insert --all --message "feat(scope): describe layer"
gt ss
```

**Split an oversized branch into two**
```bash
gt checkout <large-branch>
git reset HEAD~1        # keep changes staged
gt add fileA.ts fileB.ts
gt create -m "feat: Part 1"
gt add remaining files
gt create -m "feat: Part 2"
```
Delete the old branch after verifying the new stack order.

---

## Sync and Collaboration

### Keeping Your Stack Updated

**Standard sync (recommended before starting work):**
```bash
gt sync
# Pulls latest main, deletes merged branches, restacks all stacks
```

**Force sync (skip confirmations):**
```bash
gt sync --force
# or alias: gt sync -f
```

**Sync without restacking (manual control):**
```bash
gt sync --no-restack
# Then manually restack:
gt restack
```

**Sync across all trunks (if using multiple):**
```bash
gt sync --all
```

### Working with Coworkers' Stacks

**Fetch a coworker's entire stack:**
```bash
gt get coworker-branch-name
# Fetches branch + all downstack dependencies
```

**Fetch only downstack branches:**
```bash
gt get coworker-branch-name --downstack
```

**Example scenario:**
```bash
# Coworker A creates and pushes a stack
gt create my_feature_branch -m "Add feature"
gt submit

# Coworker B (or you on another machine) pulls it
gt get my_feature_branch
# Now you have the entire stack locally
```

### Collaborating on Non-Graphite Branches

If a coworker created a branch with standard Git:

```bash
# Pull their changes
git pull

# Bring into Graphite workflow (manual)
gt track          # or alias: gt tr

# Now you can use gt commands on this branch
# Note: Graphite will rebase during gt sync
```

For branches created via external tools (e.g., Claude/Codex worktrees or cloud tasks), prefer the helper commands:

```bash
# Workflow 1: Import current worktree/standalone branch into Graphite
# - Tracks the branch with Graphite
# - Renames it to the desired name
# - Optionally restacks it onto a parent branch
# - Submits the stack as draft PRs
pnpm gt:import-worktree <new-branch-name> [parent-branch]

# Workflow 2: Import a remote PR branch into Graphite
# - Fetches the remote branch
# - Creates/checks out a local branch with the desired name
# - Delegates to the worktree importer (Workflow 1)
pnpm gt:import-pr <remote> <remote-branch> <new-branch-name> [parent-branch]
```

### Avoiding Conflicts

**Before making changes:**
```bash
gt sync  # Get latest from main
```

**If you encounter conflicts during restack:**
```bash
# Graphite will pause rebase
# Resolve conflicts in your editor
git add resolved_files.js
gt continue

# If you want to abort:
git rebase --abort
```

**After merges to main:**
```bash
gt sync && gt restack && gt submit --stack
```

---

## Merging and Cleanup

### Merging via Graphite (Recommended)

**Interactive merge:**
```bash
gt merge
# Prompts for confirmation before each PR
```

**Dry run (preview what would be merged):**
```bash
gt merge --dry-run
```

**Force merge (no confirmations):**
```bash
gt merge --confirm
```

### Merging via GitHub UI

If you merge PRs manually through GitHub:

```bash
# After merging bottom PR(s)
gt sync
# Cleans up merged branches locally
# Restacks remaining PRs in stack

# Push any restacked changes
gt submit
```

**Important:** Always merge from bottom to top of the stack. Graphite handles this automatically, but if merging manually, follow dependency order.

### Post-Merge Cleanup

```bash
# Sync after merge
gt sync

# Graphite will:
# 1. Pull latest main
# 2. Delete merged branches
# 3. Restack any remaining work
# 4. Prompt for confirmation

# Output:
# 🌲 Pulling main from remote...
# 🧹 Checking if any branches have been merged/closed...
# ✔ feat-add-database-schema is merged into main. Delete it? … yes
# Deleted branch feat-add-database-schema
# Restacked feat-implement-service-layer on main.
```

---

## Commit Hygiene Best Practices

### One Logical Change Per Branch

Each branch should represent a single, reviewable unit of work:

✅ **Good:**
```bash
gt create -am "feat(service): Add FilterOperations service class"
gt create -am "feat(registry): Wire service into registry"
gt create -am "test: Add service tests"
```

❌ **Bad:**
```bash
gt create -am "feat: Add service, update registry, add tests, fix bug"
```

### Single Commit Per Branch (Recommended)

Maintain one commit per branch for cleaner history:

**If you have multiple commits, squash them:**
```bash
gt log
# ◉ my-feature (current)
# │ abc123 - third change
# │ def456 - second change
# │ ghi789 - first change

gt squash
# Opens editor to rename the single commit

gt log
# ◉ my-feature (current)
# │ jkl012 - consolidated feature
```

**Use amend workflow:**
```bash
gt create -am "feat: Initial implementation"

# Make more changes
gt modify -a  # Amends instead of new commit

# Make even more changes
gt modify -a  # Amends again
```

### Conventional Commit Messages

Follow Conventional Commits format (matches repo standards):

```bash
feat: Add new feature
feat(scope): Add scoped feature
fix: Fix bug in filter operations
refactor: Restructure service layer
test: Add tests for FilterOperations
docs: Update API documentation
chore: Update dependencies
```

**Examples from Stage 6:**
```bash
gt create -am "feat(types): Define FilterOperations service interface"
gt create -am "feat(service): Implement FilterOperations class"
gt create -am "feat(registry): Add service to operations registry"
gt create -am "refactor: Migrate useFilterOperations to service"
gt create -am "test: Add FilterOperations service tests"
```

### Descriptive Branch Names

Graphite auto-generates branch names from commit messages:

```bash
gt create -am "feat(api): Add user authentication endpoint"
# Creates: feat-api-add-user-authentication-endpoint
```

**Override if needed:**
```bash
gt create -am "feat: Complex feature" auth-service
# Creates: auth-service
```

### Folding Branches for Consolidation

If you realize two branches should be one:

```bash
gt log
# ◉ add-validation (current)
# ◯ add-types
# ◯ main

# Fold add-validation into add-types
gt fold
# or alias: gt f

# Result:
# ◉ add-types (current)
# │ All commits from both branches
# ◯ main
```

---

## GitHub Configuration

For stacked PRs to work correctly, configure these GitHub repository settings:

### Required Settings (Disable)

1. **"Require approval of the most recent reviewable push"**: **Disabled**
   - Graphite changes target branches during merge
   - These changes count as reviewable pushes
   - Enabled = merge failures

2. **"Require merge queue"**: **Disabled**
   - GitHub merge queue doesn't support stacked PRs
   - Can merge out of order → inconsistent state
   - Use Graphite Merge Queue instead

3. **"Limit how many branches and tags can be updated in a single push"**: **Disabled**
   - Graphite submits entire stacks atomically
   - Limits prevent large stacks from being pushed
   - Set to "Disabled" or very high value (100+)

### GitHub Actions Configuration

Ignore Graphite's temporary `graphite-base/*` branches:

```yaml
# .github/workflows/your-workflow.yml
on:
  pull_request:
    types: [opened, reopened, synchronize]
    branches-ignore:
      - "**/graphite-base/**"
```

**Prevent duplicate CI runs:**
```yaml
concurrency:
  group: ${{ github.repository }}-${{ github.workflow }}-${{ github.ref }}-${{ github.ref == 'refs/heads/main' && github.sha || ''}}
  cancel-in-progress: true
```

---

## Common Scenarios

### Scenario 1: Break Large Feature into Stack

**Problem:** Feature requires 500 lines across multiple files

**Solution:**
```bash
gt checkout main

# Step 1: Add types (50 lines)
# Edit types...
gt create -am "feat(types): Add feature types"

# Step 2: Add helpers (100 lines)
# Edit helpers...
gt create -am "feat(utils): Add helper functions"

# Step 3: Add service (200 lines)
# Edit service...
gt create -am "feat(service): Implement feature service"

# Step 4: Add UI integration (150 lines)
# Edit components...
gt create -am "feat(ui): Integrate feature in UI"

# Submit entire stack
gt ss
```

**Result:** 4 small PRs instead of 1 large PR, each independently reviewable

### Scenario 2: Urgent Hotfix During Stack Work

**Problem:** Need to fix critical bug while working on a stack

**Solution:**
```bash
# Save current work
gt log short  # Note current branch

# Create fix from main
gt checkout main
gt create -am "fix: Critical bug in auth flow"
gt submit

# Return to your stack
gt checkout your-feature-branch

# After hotfix merges
gt sync  # Rebase stack on updated main
```

### Scenario 3: Work Across Multiple Machines

**Problem:** Started stack on laptop, need to continue on desktop

**Solution:**
```bash
# On laptop: Create and push stack
gt create -am "feat: Part 1"
gt create -am "feat: Part 2"
gt ss

# On desktop: Pull the stack
gt get feat-part-2
# Fetches both Part 2 and Part 1

# Continue work
gt create -am "feat: Part 3"
gt ss
```

---

## Troubleshooting

### Issue: "Branch has diverged from remote"

**Cause:** Local and remote branches have different histories

**Solution:**
```bash
# Force sync to overwrite local
gt sync --force

# Or force push your local changes
gt submit --stack --force
```

### Issue: Rebase conflicts during `gt sync`

**Cause:** Your changes conflict with new commits in main

**Solution:**
```bash
# Conflicts will be marked in files
# Open files and resolve conflicts

# Stage resolved files
git add resolved_file.js

# Continue rebase
gt continue

# If you want to abort
git rebase --abort
```

### Issue: "Cannot find parent branch"

**Cause:** Graphite metadata is out of sync

**Solution:**
```bash
# Retrack the branch
gt track

# Or recreate stack with proper parents
gt checkout desired-parent
gt checkout problem-branch
gt restack
```

### Issue: Accidentally created too many commits in one branch

**Cause:** Used `git commit` multiple times instead of `gt modify`

**Solution:**
```bash
# Squash all commits in branch into one
gt squash

# Opens editor to rename consolidated commit
```

### Issue: Want to rename a branch

**Cause:** Branch name is unclear or doesn't follow conventions

**Solution:**
```bash
gt rename new-branch-name

# Note: This removes PR association
# Use --force to rename branch with open PR
gt rename new-name --force
```

### Issue: Need to remove a branch from middle of stack

**Cause:** Realized a branch is no longer needed

**Solution:**
```bash
# Checkout the branch you want to remove
gt checkout unwanted-branch

# Checkout its child
gt checkout child-branch

# Rebase child onto unwanted-branch's parent
git rebase parent-branch

# Delete unwanted branch
git branch -D unwanted-branch

# Restack
gt restack

# Submit updated stack
gt ss -u
```

### Issue: Submitted wrong stack by accident

**Cause:** Ran `gt ss` while on wrong branch

**Solution:**
```bash
# Close unwanted PRs on GitHub
# Then sync
gt sync

# Deletes local branches for closed PRs
```

### Issue: Want to see detailed diff between stack and main

**Cause:** Need to understand total changes in stack

**Solution:**
```bash
# See all changes from main to current branch
git diff main...HEAD

# See changes in specific branch only
git diff parent-branch..current-branch
```

---


## Additional Resources

- [Graphite Official Docs](https://graphite.dev/docs)
- [Graphite CLI Reference](https://graphite.dev/docs/get-started/command-reference)
- [Graphite Cheatsheet](https://graphite.dev/docs/get-started/cheatsheet)
- [Comparing Git and Graphite](https://graphite.dev/docs/get-started/comparing-git-and-gt)

---

**Remember:** All future commits should use stacked PRs. This keeps the repository history clean, reviews manageable, and development velocity high. When in doubt, break your work into smaller logical pieces and stack them with Graphite.

---

## Appendix: Linear + Graphite Development Workflow

Standard workflow for implementing Linear issues using Graphite stacked PRs.

### Prerequisites

- Graphite CLI installed and initialized (`gt init`)
- Linear issue assigned and ready for work
- Local issue doc exists in `docs/projects/<project>/issues/<ID>-<name>.md`

### Workflow Steps

#### 1. Get Task

Receive prompt/task assignment (e.g., "work on PER-20").

#### 2. Ground Into Context

Before writing any code:

- **Review the plan**: Read the issue doc thoroughly
- **Locate the task**: Cross-reference Linear + local docs
- **Look ahead/behind**: Understand dependencies (`blocked_by`, `blocks` in front matter)
- **Understand real scope**: What files will change? What's the acceptance criteria?

#### 3. Check Stack Status & Create Branch

```bash
# Always check existing stack first
gt ls
```

**Decision point**: Ask whether to:
- **Continue existing stack** - when work is related to current stack
- **Create new stack from main** - when starting a new work focus

Branch naming convention: `<linear-id>-<kebab-case-title>`

```bash
# If continuing stack (stay on current branch):
gt create per-20-create-validated-env-config-module

# If new stack:
gt checkout main
gt create per-20-create-validated-env-config-module
```

**Note**: Create branch without commit initially - commit when ready.

#### 4. Update Task Doc + Initial Commit

- Update local issue doc if grounding revealed scope changes
- Add initial commit when ready:

```bash
git add -A && git commit -m "feat(scope): description of change"
```

Commit message format: Conventional commits (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`)

**Commit strategy on Graphite branches:**
- **Create new commits** as you make progress - this keeps a record of your work
- **Only use `gt modify`** when you actually want to amend/override an existing commit
- All commits on a branch get squashed into the PR when merging anyway
- Some issues map 1:1 with a single commit; larger issues benefit from multiple commits showing progress

#### 5. Do the Work

Execute the implementation:

- Follow the deliverables in the issue doc
- Keep changes focused on the current issue
- Update issue doc checkboxes as you complete items

#### 6. Verify

Before considering work complete:

```bash
bun run check-types    # Type checking
bun run build          # Build verification
# bun run test         # Tests (when available)
```

All checks must pass.

#### 7. Mark Checkboxes Locally

Update the local issue doc (`docs/projects/<project>/issues/<ID>-*.md`):

- Mark completed deliverables with `[x]`
- Mark completed acceptance criteria with `[x]`
- Note any deviations or discoveries

#### 8. Submit Stack (Draft) - Automatic

**Immediately and automatically** submit as draft PR (do not ask, do not wait):

```bash
gt ss --draft          # Submit entire stack as draft PRs
```

This happens **BEFORE** presenting to user for review. The user will review the draft PR itself.

**If batch workflow** (user requested multiple issues):
- Loop back to Step 1 for next issue
- Stack branches: each issue gets its own branch in the stack
- Submit draft after each issue (keeps PRs up to date)

#### 9. Review Checkpoint

Present summary to user for review. Include:
- What was done
- Files changed
- **Draft PR link(s)** (already submitted in step 8)

User reviews the draft PR and provides approval before publishing.

#### 10. Publish (After User Approval)

Only after user approves:

```bash
gt ss --publish        # Publish draft PRs for merge
```

#### 11. Update Linear

**Status auto-updates**: Linear status automatically moves based on PR state:
- Draft PR → stays in current status
- Published PR → moves to "In Review" or "Merging"
- Merged PR → moves to "Done"

**Don't manually update status** - let the integration handle it.

**What to update manually:**
- **Issue body**: Update with final deliverables and checkboxes (what was built)
- **Comments**: Add implementation notes, decisions, or context (commentary goes here, not in body)
- **Parent issue**: Update if all sub-issues complete

#### 12. Repeat

Move to next task in sequence.

---

### Development Workflow Quick Reference

| Step | Action | Command |
|------|--------|---------|
| Check stack | View current branches | `gt ls` |
| Create branch | New branch (no commit) | `gt create <name>` |
| New commit | Add commit to branch | `git add -A && git commit -m "msg"` |
| Amend commit | Override existing commit | `gt modify -a` (use sparingly) |
| Verify | Type check | `bun run check-types` |
| Verify | Build | `bun run build` |
| Submit draft | Submit stack as draft PRs | `gt ss --draft` |
| Publish drafts | Publish draft PRs for review | `gt ss --publish` |
| Submit final | Submit stack (non-draft) | `gt ss` |
| Update PRs | Push changes to PRs | `gt ss -u` |

### Development Stacking Guidelines

**When to continue existing stack:**
- Work is directly related to current stack
- Issues have explicit dependencies (`blocked_by`/`blocks`)
- Same milestone or feature area

**When to create new stack:**
- Starting a new work focus
- Issues are independent
- Current stack is getting large (5+ branches)
- Parallel workstream

**Stack size**: Keep stacks small and focused. Prefer 2-4 branches per stack.

### Development Common Patterns

**Single issue, single branch:**
```bash
gt ls                                    # Check stack
gt create per-20-env-config-module       # Create branch
# ... do work ...
gt modify -a -m "feat(config): add env"  # Commit
bun run check-types && bun run build     # Verify
gt ss --draft                            # Submit as draft PR
```

**Multiple related issues, stacked:**
```bash
gt ls                                    # Check stack
gt create per-20-env-config-module       # Issue 1
# ... complete issue 1 ...
gt create per-23-barrel-export-audit     # Issue 2 (stacks on issue 1)
# ... complete issue 2 ...
gt ss --draft                            # Submit entire stack as drafts
```

**Batch workflow (user requests multiple issues):**
```bash
# User: "Complete PER-20, PER-23, and PER-22"
gt ls
gt create per-20-env-config-module
# ... complete PER-20 ...
gt create per-23-barrel-export-audit
# ... complete PER-23 ...
gt create per-22-logging-abstraction
# ... complete PER-22 ...
# Return to user for review of entire stack
gt ss --draft                            # Submit stack as drafts
# After approval:
gt ss --publish                          # Publish for merge
```

---

### Development Workflow Troubleshooting

**Branch created on wrong parent:**
```bash
gt checkout correct-parent
gt checkout problem-branch
gt restack
```

**Need to insert branch in middle of stack:**
```bash
gt checkout parent-branch
gt create --insert new-branch-name
```

**Forgot to create branch, committed to wrong branch:**
```bash
git reset HEAD~1                    # Undo commit (keep changes)
gt create correct-branch-name       # Create correct branch
gt modify -a -m "commit message"    # Recommit
```
