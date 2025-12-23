# Slideshow Outline — M3 Core Engine Refactor & Config Shape Evolution

- **Deck ID (kebab-case):** `m3-core-engine-refactor-config-evolution`
- **Source topic:** `docs/_archive/projects/engine-refactor-v1/milestones/M3-core-engine-refactor-config-evolution.md`
- **Supporting sources (quoted / summarized in slides):**
  - `docs/system/libs/mapgen/architecture.md`
  - `docs/projects/engine-refactor-v1/resources/PRD-pipeline-refactor.md`
  - `docs/projects/engine-refactor-v1/resources/PRD-config-refactor.md`
  - `docs/projects/engine-refactor-v1/resources/config-wiring-status.md`
  - `packages/mapgen-core/src/config/schema.ts`

## Concepts (for visual continuity)

- `plan` — Phase/stack progression and “how we ship”
- `contracts` — Task Graph primitives and fail-fast dependency semantics
- `artifacts` — Canonical data products (artifact spine) and consumers
- `config` — Config integration + schema evolution + presets/recipes
- `adapters` — Engine boundary cleanup (single adapter boundary)
- `appendix` — Deep dives and reference mappings

---

## Slide 1 — M3 in one breath (concept: `plan`)

**Purpose:** Set context + non-negotiables; communicate momentum.

**Blocks:**
1. `explanation` (markdown)
   - Headline: “M3 makes the Task Graph *the way to run*—without changing algorithms”
   - Emphasize: scope locked; wrap-first; fail-fast gating; config evolves to step/phase-aligned.
   - Sources: M3 milestone doc.
2. `kpiGrid` (layout: `grid`)
   - Items (label → value):
     - “Scope posture” → “Wrap-first (no new algorithms)”
     - “Runtime integrity” → “Fail-fast `requires`/`provides` gating”
     - “Config direction” → “Step/phase-aligned `MapGenConfig`”
     - “Shipping model” → “One long-running Graphite stack”

---

## Slide 2 — What M3 is / isn’t (concept: `plan`)

**Purpose:** Make guardrails crisp; prevent “algorithm creep”.

**Blocks:**
1. `table`
   - Caption: “Guardrails from the milestone”
   - Rows (CSV):
     - `In scope,Out of scope`
     - `Wrap existing phases as steps,New geomorphology/hydrology algorithms`
     - `Enforce step contracts at runtime,Quality-changing behavioral swaps`
     - `Canonicalize artifacts across engine,Deep rewrites before artifacts/tests stabilize`
2. `explanation`
   - Notes: M3 boundary vs M2 (stable-slice correctness handled in M2 where not coupled to task-graph primitives).
   - Sources: M3 milestone doc (“Milestone boundary note”, “Scope guardrail”).

---

## Slide 3 — The “playbook” view: Phases A/B/C and Stacks 1–7 (concept: `plan`)

**Purpose:** Horizontal narrative spine; show dependencies and progression.

**Blocks:**
1. `diagram` (mermaid)
   - Caption: “M3 sequencing (not dates): one stack, many conceptual sub-stacks”
   - Content:
     ```mermaid
     flowchart LR
       subgraph A[Phase A — Task Graph becomes the way to run]
         S1[Stack 1: Task Graph MVP\n(MapGenStep + Registry + Executor + standard entry)]
       end

       subgraph B[Phase B — Product spine + consumer migration]
         S2[Stack 2: Hydrology products\n(ClimateField + river summary)]
         S3[Stack 3: Story system as steps\n(StoryOverlays canonical)]
         S4[Stack 4: Biomes/Features wrappers\n(consumes canonical products)]
         S5[Stack 5: Placement wrapper\n(cross-cutting consumer)]
       end

       subgraph C[Phase C — Ship-ready cleanup]
         S6[Stack 6: Config evolution + presets\n(tunables retirement)]
         S7[Stack 7: Adapter boundary collapse\n(one EngineAdapter)]
       end

       S1 --> S2
       S1 --> S3
       S2 --> S4
       S3 --> S4
       S4 --> S5
       S5 --> S6
       S6 --> S7
     ```
2. `layers` (layout: `stack`)
   - Layers (3):
     - Phase A — value: `Stack 1` — “Task Graph MVP becomes the way to run (wrap-only)”
     - Phase B — value: `Stacks 2–5` — “Product spine + consumer migration (still wrap-first)”
     - Phase C — value: `Stacks 6–7` — “Config evolution + adapter boundary cleanup (ship-ready)”
3. `explanation`
   - Include “Graphite execution decision (locked): one long-running stack merged at milestone end.”
   - Sources: M3 milestone doc (“Sequencing & Parallelization Plan”, “Merge Strategy”).

---

## Slide 4 — Phase A / Stack 1: Task Graph MVP (the unlock) (concept: `contracts`)

**Purpose:** Explain what gets built first and why it unblocks everything else.

**Blocks:**
1. `explanation`
   - Summarize Stack 1 deliverables: `MapGenStep`, `StepRegistry`, `PipelineExecutor`, runtime gating, standard pipeline recipe, parallel entry paths.
   - Sources: M3 milestone doc (Stack 1 section), `docs/system/libs/mapgen/architecture.md`.
2. `diagram` (mermaid)
   - Caption: “From recipe → steps → context (wrap-first transition)”
   - Content:
     ```mermaid
     flowchart LR
       Recipe[Standard pipeline recipe\n(code or JSON)] --> Exec[PipelineExecutor]
       Exec --> Reg[StepRegistry]
       Reg --> Step[MapGenStep (wrappers first)]
       Step --> Ctx[MapGenContext\n(config + fields + artifacts)]
       Ctx --> Adapter[EngineAdapter\n(engine-surface effects)]
     ```
3. `codeBlock`
   - File: `docs/system/libs/mapgen/architecture.md`
   - Lines: `55–80`
   - Snippet: `MapGenStep` interface excerpt (exact lines from doc).

---

## Slide 5 — Runtime integrity: `requires`/`provides` and dependency tags (concept: `contracts`)

**Purpose:** Make “fail-fast gating” concrete and legible.

**Blocks:**
1. `explanation`
   - Explain: gating prevents “silently limp through generation”; missing dependencies throw `MissingDependencyError`.
   - Source: architecture doc + pipeline PRD + M3 objectives.
2. `table`
   - Caption: “Dependency tags (M3 terminology)”
   - Rows:
     - `Tag class,Meaning,Examples`
     - `artifact:*,Canonical in-memory products,artifact:heightfield | artifact:climateField | artifact:storyOverlays`
     - `field:*,Canvas buffers (what map looks like),field:elevation | field:terrainType`
     - `state:*,Engine-surface guarantees,state:engine.biomesApplied | state:engine.placementApplied`
3. `codeBlock`
   - File: `docs/system/libs/mapgen/architecture.md`
   - Lines: `40–46`
   - Snippet: `GenerationPhase` type excerpt (phase vocabulary used by steps).

---

## Slide 6 — Phase B: Make the artifact spine real (Stacks 2–5) (concept: `artifacts`)

**Purpose:** Communicate the “product spine + consumer migration” goal and what “canonical” means.

**Blocks:**
1. `layers` (layout: `stack`)
   - Layers (4–5, keep within schema):
     - `FoundationContext` — value: `artifact:foundation` — “Shared foundation contract (seeded in M2, extended in M3)`
     - `Heightfield` — value: `artifact:heightfield` — “Elevation/landform representation for downstream consumers”
     - `ClimateField` — value: `artifact:climateField` — “Authoritative rainfall/moisture surface”
     - `StoryOverlays` — value: `artifact:storyOverlays` — “Story tags/overlays published as a product”
2. `table`
   - Caption: “Stacks 2–5: what gets published/consumed (wrap-first)”
   - Rows:
     - `Stack,What lands,Consumes,Provides`
     - `2 Hydrology,ClimateField becomes canonical + river summary,artifact:foundation,artifact:climateField + artifact:hydrology`
     - `3 Story remainder,Story stages as steps + overlays publication,artifact:climateField,artifact:storyOverlays`
     - `4 Biomes/Features wrappers,Consume canonical products,artifact:climateField + artifact:storyOverlays,field/engine-state biomes+features`
     - `5 Placement wrapper,Cross-cutting step consumes prior outputs,artifact:* + biomes+features,state:engine.placementApplied`
3. `explanation`
   - Notes: “No new algorithm swaps; wrappers call existing logic but must read from canonical products where available.”
   - Sources: M3 milestone doc (Phase B exit criteria, Stack 2–5 sections).

---

## Slide 7 — Phase C / Stack 6: Config evolution + tunables retirement (concept: `config`)

**Purpose:** Explain what changes in how config is shaped and read, and why it’s late-phase.

**Blocks:**
1. `table`
   - Caption: “Config PRD Phases mapped to M3 Stack 6”
   - Rows:
     - `PRD phase,Goal,M3 intent`
     - `Phase 2,Config in MapGenContext,Steps read via context.config (not tunables/globals)`
     - `Phase 3,Shape evolution,Top-level sections align to phases/steps; in-repo callers migrate`
2. `codeBlock`
   - File: `packages/mapgen-core/src/config/schema.ts`
   - Lines: `2360–2372`
   - Snippet: `MapGenConfigSchema.presets` excerpt (shows schema supports presets).
3. `table`
   - Caption: “Current gap to close (from wiring-status audit)”
   - Rows:
     - `Field,Current status,Implication for M3`
     - `presets,Unused / planned,Define BASE_CONFIG + implement preset resolution`
     - `stageManifest.* requires/provides,Unused / planned,Executor gating makes contracts real`
4. `explanation`
   - Notes: “Intermediate states may be non-backwards-compatible; stack remains runnable by updating in-tree callers.”
   - Sources: M3 milestone doc (Stack 6), config PRD.

---

## Slide 8 — Presets/recipes + BASE_CONFIG: the resolution model (concept: `config`)

**Purpose:** Make the “preset resolution” deliverable concrete without inventing an implementation.

**Blocks:**
1. `diagram` (mermaid)
   - Caption: “Proposed resolution pipeline (behavior to define + test in M3)”
   - Content:
     ```mermaid
     flowchart LR
       Base[BASE_CONFIG\n(canonical baseline)] --> Presets[Apply presets\n(left-to-right merge)]
       Presets --> Overrides[Apply user overrides]
       Overrides --> Validate[Validate + default\n(parseConfig / schema)]
       Validate --> Context[context.config\n(single source of truth)]
     ```
2. `table`
   - Caption: “Decisions M3 must make (from milestone open questions)”
   - Rows:
     - `Decision,Options,Must be explicit in`
     - `Legacy preset semantics,Preserve | simplify | deprecate,Docs + tests`
     - `Where resolution lives,bootstrap | pipeline pre-step,Architecture + code`
3. `explanation`
   - Sources: M3 milestone doc (“Presets/recipes and canonical BASE_CONFIG”), config wiring status.

---

## Slide 9 — Stack 7: Collapse adapter boundary (concept: `adapters`)

**Purpose:** Explain the end-state boundary (single adapter) and why it’s late.

**Blocks:**
1. `diagram` (mermaid)
   - Caption: “Before vs after: one adapter boundary”
   - Content:
     ```mermaid
     flowchart LR
       subgraph Before[Before (transient)]
         Orchestrator[MapOrchestrator] --> OA[OrchestratorAdapter\n(map-init concerns)]
         Orchestrator --> Ctx[MapGenContext]
         Ctx --> EA[EngineAdapter]
       end

       subgraph After[After (target)]
         Entry[Pipeline entry / MapOrchestrator] --> Ctx2[MapGenContext]
         Ctx2 --> EA2[EngineAdapter (expanded)\n(includes map-init responsibilities)]
       end
     ```
2. `table`
   - Caption: “Stack 7 deliverables / acceptance (excerpt)”
   - Rows:
     - `Deliverable,Acceptance signal`
     - `EngineAdapter covers map-init responsibilities,No OrchestratorAdapter references remain`
     - `Civ7Adapter implements expanded API,Map generation still initializes correctly`
     - `MapOrchestrator uses MapGenContext.adapter only,Implementation matches architecture.md`
3. `explanation`
   - Sources: M3 milestone doc (Stack 7), architecture doc (adapter boundary direction).

---

## Slide 10 — “Keep main coherent”: risk controls + branch safety (concept: `plan`)

**Purpose:** Communicate how M3 avoids breaking map generation while refactoring.

**Blocks:**
1. `table`
   - Caption: “Risk controls explicitly called out in M3”
   - Rows:
     - `Risk control,What it protects,Where stated`
     - `Parallel entry paths during transition,Ability to compare outputs and avoid dead-ends,Stack 1 acceptance criteria`
     - `Wrapper-first posture,Map quality stability,M3 objectives/scope guardrail`
     - `Fail-fast gating,No silent contract violations,M3 objectives + architecture.md`
     - `Late-phase integration cuts (placement/adapter),Contain cross-cutting risk,Stack 5/7 notes`
2. `explanation`
   - Notes: “M3 merges as one long-running stack at milestone end; keep the stack runnable end-to-end throughout.”
   - Sources: M3 milestone doc.

---

## Slide 11 — Definition of Done: M3 acceptance criteria checklist (concept: `plan`)

**Purpose:** End with a testable checklist of “what must be true”.

**Blocks:**
1. `objectivesDisplay` (layout: `default`)
   - Objectives (4–5, derived from milestone acceptance criteria/objectives):
     - Objective: “Phases run as steps”
       - KRs: add “Major phases represented as pipeline steps”; add “Standard pipeline recipe runs end-to-end”
     - Objective: “Contracts are enforced”
       - KRs: add “Runtime gating throws on missing requires”; remove “Silent contract violations”
     - Objective: “Config matches architecture”
       - KRs: add “MapGenConfig step/phase-aligned”; remove “Tunables as primary config path”; add “Preset resolution documented/tested”
     - Objective: “Consumers use canonical products”
       - KRs: remove “Direct GameplayMap reads where artifacts exist”; add “ClimateField/StoryOverlays as authoritative inputs”
2. `explanation`
   - Sources: M3 milestone doc (“Objectives”, “Acceptance Criteria”).

---

## Slide 12 — Issue map snapshot (how to mint and group) (concept: `plan`)

**Purpose:** Make issue structure legible at a glance (without rehashing Linear mechanics).

**Blocks:**
1. `table`
   - Caption: “Draft parent issues (from milestone Issue Map)”
   - Rows:
     - `Stack,Filename,Title,Blocked by`
     - `1,LOCAL-M3-task-graph-mvp.md,Task Graph MVP: primitives + standard entry,—`
     - `2,LOCAL-M3-hydrology-products.md,Hydrology productization,Stack 1`
     - `3,LOCAL-M3-story-system.md,Story system modernization,Stack 1`
     - `4,LOCAL-M3-biomes-features-wrapper.md,Biomes & Features step wrapper,Stacks 1–3`
     - `5,LOCAL-M3-placement-wrapper.md,Placement step wrapper,Stack 4`
     - `6,LOCAL-M3-config-evolution.md,Config evolution (Phase 2/3) + tunables,Stacks 1–5`
     - `7,LOCAL-M3-adapter-collapse.md,Adapter boundary collapse,Stack 6`
2. `explanation`
   - Notes: “Recommended minting order is Stack 1 → 2/3 → 4 → 5 → 6 → 7.”
   - Sources: M3 milestone doc (“Issue Map”, “Recommended Minting Order”).

---

## Slide 13 (Appendix) — Deep dive: config schema vs wiring status (concept: `appendix`)

**Purpose:** Provide the evidence for “schema supports it, runtime doesn’t (yet)”.

**Blocks:**
1. `explanation`
   - Sources: `packages/mapgen-core/src/config/schema.ts`, `docs/projects/engine-refactor-v1/resources/config-wiring-status.md`.
2. `table`
   - Caption: “Selected fields called out by wiring-status”
   - Rows:
     - `Field,Status,Note`
     - `presets,Unused / planned,Schema field exists; bootstrap stores list but does not apply`
     - `stageManifest.* requires/provides,Unused / planned,Forward-compat; dependency resolution not implemented yet`

---

## Slide 14 (Appendix) — Deep dive: current stage order (TS) as a refactor map (concept: `appendix`)

**Purpose:** Ground the migration in the current stage order (what wrappers must cover).

**Blocks:**
1. `explanation`
   - Include the canonical stage order list as “current TS pipeline order (from wiring-status)”.
2. `table`
   - Caption: “Canonical Stage Order (excerpted list; keep as reference)”
   - Rows:
     - `Stage order (current TS),Notes`
     - `foundation → landmassPlates → coastlines → ... → placement,Used by bootstrap/resolved; wrappers should preserve behavior`
