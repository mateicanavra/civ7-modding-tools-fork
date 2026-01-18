# Phase 0.5 Greenfield Pre-Work Spike (Template)

Purpose: do **greenfield, earth-physics-first** thinking *before* current-state mapping or target-state modeling so Phase 1/2 aren’t biased by legacy shapes.

Scope guardrails:
- This is **pre-draft / pre-domain-model** work. Do not map the current codebase here.
- Do not commit to contracts, artifact shapes, or slice plans here.
- Treat Phase 2 as “up for grabs”: the goal is to imagine what the domain *should be* when designed from scratch for maximum pipeline capability.

Required output:
- `docs/projects/engine-refactor-v1/resources/spike/spike-<domain>-greenfield.md`

## What to do (greenfield-first)

1. Deep research (spend real time)
   - Read the domain’s earth-physics references and prior domain models.
   - Use external research (papers, textbooks, credible references) where useful; cite sources in the spike.
   - Skim existing code only to understand *what problems exist*, not to inherit its structure.
2. Earth-physics-first model sketch
   - Write the “ideal system” narrative: what the domain simulates/represents, and why.
   - Define what the domain owns vs neighbor domains (e.g., what morphology owns vs hydrology vs ecology).
   - Identify subdomains and their relationships (causality spine).
3. Greenfield pipeline-diff exercise (required; upstream + downstream)
   - **Upstream (current vs ideal):**
     - List what upstream domains/stages provide *today* (artifacts, buffers, overlays, invariants).
     - Separately list what you would want upstream to provide in an *ideal greenfield world* to make this domain’s best design feasible.
     - Write the **diff** (gaps) as “upstream change candidates” to be considered later in the overall refactor sequence.
   - **Downstream (ideal outputs):**
     - Describe what this domain should provide downstream if designed ideally (artifacts/buffers/overlays, invariants, contracts).
     - Explain how those ideal outputs would unlock downstream capabilities (e.g., ecology consuming morphology outputs).
     - Note any downstream changes implied by these ideal outputs (change candidates).

## Required sections (minimum)

- Greenfield domain narrative (earth-physics-first; unconstrained by existing code)
- Executive vision (1 paragraph: what capability this unlocks for the pipeline)
- Boundary sketch (what this domain owns vs what neighbors own)
- Ideal subdomain decomposition + causality spine
- Parameterization posture (semantic knobs vs forbidden authored overrides)
- Upstream inventory (current): “what exists today that we can consume”
- Upstream requirements (ideal): “what we would want in a greenfield world”
- Upstream diff: “gaps that justify upstream modifications later”
- Downstream outputs (ideal): “what we should provide downstream”
- Downstream enablement: “how ideal outputs unlock downstream domains”
- Downstream diff: “downstream changes implied by the ideal design”
- Performance + memory reality (what must be bounded; e.g., fixed-pass loops, discretized time)
- Open questions + research backlog

## Gate checklist (Phase 0.5 completion)

- Greenfield narrative exists and is earth-physics-grounded.
- Executive vision exists and names the pipeline capability unlocked.
- Domain boundary sketch exists and names neighbor domains explicitly.
- Upstream current vs ideal lists exist and a diff is written.
- Downstream ideal outputs exist and downstream implications are written.
- Parameterization posture exists and separates semantic knobs from forbidden authored overrides.
- Performance/memory notes exist (what would be bounded in a real implementation).
- Open questions list exists (things to validate during Phase 1/2).

References:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/earth-physics-and-domain-specs.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`

Next:
- Phase 1 current-state spike template:
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/phase-1-current-state.md`
