# Voronoi Plate Generation Explainer - Outline

## Narrative Approach: "Visual Geology with Technical Depth"

Use real-world geology as the entry point, then reveal the mathematical abstraction (Voronoi), show how CIV7 adds physics, explain boundary math, demonstrate how landmasses use this data, show Swooper's hook point, explain our intent, and finally show the control surface and creative possibilities.

**Horizontal flow:** Geology → Math → Physics → Boundaries → Usage → Hook → Intent → Control → Possibilities

**Vertical depth:** Each slide uses multiple blocks to go from intuition → technical detail → code where appropriate.

---

## Slide 1: Why Mountains Exist - Plate Tectonics 101
**Concept:** geology
**Purpose:** Build intuition about real-world plate tectonics before introducing the simulation

**Blocks:**
1. `explainer` - Opening hook: "Every mountain range, volcanic island, and oceanic trench exists because of plate tectonics. The Earth's surface is broken into massive plates that drift, collide, and pull apart. When India crashed into Asia, the Himalayas rose. When the Pacific plate dives under the Americas, volcanoes erupt along the Ring of Fire."

2. `explanation` - The three boundary types:
   - **Convergent:** Plates collide → mountains, volcanoes, trenches (Himalayas, Andes)
   - **Divergent:** Plates pull apart → rift valleys, mid-ocean ridges (East African Rift, Mid-Atlantic Ridge)
   - **Transform:** Plates slide past → earthquakes, fault lines (San Andreas)

3. `layers` - Visual hierarchy:
   - Convergent (collision) → Uplift, mountains, volcanic arcs
   - Divergent (separation) → Rifts, new crust, volcanic activity
   - Transform (sliding) → Shear stress, earthquakes

4. `explanation` - Bridge: "Simulating this computationally requires two things: a way to divide the world into plates, and a way to give those plates physics. Enter the Voronoi diagram."

**Transition:** From real geology to mathematical abstraction

---

## Slide 2: The Voronoi Abstraction - Cracking the World into Cells
**Concept:** voronoi
**Purpose:** Explain what Voronoi diagrams are and how they partition space

**Blocks:**
1. `explainer` - The cracked glass analogy: "Imagine dropping a handful of pebbles onto a frozen lake. Cracks spread from each impact point until they meet cracks from neighboring impacts. The result is a pattern of cells—each cell contains all points closest to its seed. This is a Voronoi diagram."

2. `diagram` - Voronoi construction visualization:
   ```
   Sites (seeds) → Voronoi edges → Cells

   [Points scattered] → [Lines between] → [Closed polygons]
   ```

3. `explanation` - Fortune's Algorithm (the sweep line):
   - Process sites top-to-bottom via a horizontal sweep line
   - Maintain a "beachline" of parabolic arcs
   - Detect "circle events" where three arcs converge → creates Voronoi vertex
   - O(n log n) complexity—efficient for thousands of cells

4. `codeBlock` - Core Voronoi computation structure:
   ```javascript
   // From CIV7's TypeScript-Voronoi library
   compute(sites, bbox) {
     // Sort sites by y-coordinate (sweep direction)
     siteEvents.sort((a, b) => b.y - a.y);

     for (;;) {
       if (site && (!circle || site.y < circle.y)) {
         // Process site event: add to beachline
         this.addBeachsection(site);
       } else if (circle) {
         // Process circle event: create Voronoi vertex
         this.removeBeachsection(circle.arc);
       } else break;
     }

     this.clipEdges(bbox);  // Trim to bounds
     this.closeCells(bbox); // Close boundary cells
   }
   ```

5. `explanation` - Lloyd Relaxation: "Raw random points create irregular cells. CIV7 applies 'Lloyd relaxation'—repeatedly moving each seed to its cell's centroid—to create more uniform, organic-looking plates."

6. `explanation` - Bridge: "But Voronoi cells are just geometry. To simulate tectonics, we need to add physics: movement and rotation."

**Transition:** From static geometry to dynamic plates

---

## Slide 3: Plates in Motion - Adding Movement and Rotation
**Concept:** physics
**Purpose:** Show how CIV7 adds physics to turn Voronoi cells into tectonic plates

**Blocks:**
1. `explainer` - From cells to plates: "Each Voronoi cell becomes a tectonic plate by adding two physical properties: a movement vector (where it's drifting) and a rotation value (how it's spinning). These are randomly assigned at plate creation, creating a unique tectonic configuration for each map."

2. `diagram` - Plate with physics vectors:
   ```
   ┌─────────────────────────────┐
   │                             │
   │     ⊙ ────→                 │
   │   seed   movement           │
   │     ↺                       │
   │   rotation                  │
   │                             │
   └─────────────────────────────┘
   ```

3. `codeBlock` - PlateRegion initialization:
   ```javascript
   // From voronoi-region.js
   class PlateRegion extends VoronoiRegion {
     m_movement = { x: 0, y: 0 };
     m_rotation = 0;

     constructor(name, id, type, maxArea, color) {
       super(name, id, type, maxArea, 0, color);

       // Random movement direction and speed
       const dir = RandomImpl.fRand("Plate Movement Direction") * Math.PI * 2;
       const speed = RandomImpl.fRand("Plate Movement Speed");
       this.m_movement.x = Math.cos(dir) * speed;
       this.m_movement.y = Math.sin(dir) * speed;

       // Random rotation: -1 to +1 (counterclockwise to clockwise)
       this.m_rotation = RandomImpl.fRand("Plate Rotation") * 2 - 1;
     }
   }
   ```

4. `explanation` - Movement at any position: "A plate's movement at a specific point combines its linear drift with rotational influence. Points far from the plate's center experience more rotational movement."

5. `codeBlock` - Position-specific movement calculation:
   ```javascript
   function calculatePlateMovement(plate, pos, rotationMultiple) {
     // Relative position from plate center
     const relPos = {
       x: pos.x - plate.seedLocation.x,
       y: pos.y - plate.seedLocation.y,
     };

     // Rotation component
     const angularMovement = plate.m_rotation * Math.PI / 180 * rotationMultiple;
     const rotatedPos = rotate2(relPos, angularMovement);
     const rotationMovement = {
       x: relPos.x - rotatedPos.x,
       y: relPos.y - rotatedPos.y,
     };

     // Combine translation + rotation
     return {
       x: rotationMovement.x + plate.m_movement.x,
       y: rotationMovement.y + plate.m_movement.y,
     };
   }
   ```

6. `explanation` - Bridge: "Now we have plates that move. But the interesting geology happens at the boundaries—where plates meet. How do we compute what happens there?"

**Transition:** From plate physics to boundary computation

---

## Slide 4: Boundary Physics - The Math of Collision
**Concept:** boundaries
**Purpose:** Explain the actual math that determines boundary types

**Blocks:**
1. `explainer` - Boundary as relative motion: "A plate boundary isn't just a line—it's a zone where two plates interact. The type of interaction (collision, separation, sliding) depends on how each plate is moving relative to the boundary. CIV7 computes this using vector math."

2. `diagram` - Boundary computation visualization:
   ```
   Plate A                    Plate B
     ●───→                      ←───●
   seedA  movementA    movementB  seedB
              ↓
         ┌───┬───┐
         │   │   │
         │ ● │ ● │  ← boundary midpoint
         │   │   │
         └───┴───┘
              ↓
         normal →  (points from A to B)
   ```

3. `explanation` - The subduction formula:
   - **Normal vector:** Direction perpendicular to boundary (from plate A to plate B)
   - **Subduction:** `dot(normal, movementA) - dot(normal, movementB)`
     - Positive = plates converging (collision)
     - Negative = plates diverging (rift)
   - **Sliding:** `|dot90(normal, movementA) - dot90(normal, movementB)|`
     - High value = transform fault (plates sliding past)

4. `codeBlock` - Boundary computation from CIV7:
   ```javascript
   // From continent-generator.js (lines 710-747)
   for (const plateCell of regionCells) {
     for (const neighborId of plateCell.cell.getNeighborIds()) {
       const neighbor = regionCells[neighborId];

       if (neighbor.plateId !== plateCell.plateId) {
         // Boundary midpoint
         const pos = {
           x: (plateCell.cell.site.x + neighbor.cell.site.x) * 0.5,
           y: (plateCell.cell.site.y + neighbor.cell.site.y) * 0.5,
         };

         // Normal: direction from this cell to neighbor
         const normal = VoronoiUtils.normalize({
           x: neighbor.cell.site.x - plateCell.cell.site.x,
           y: neighbor.cell.site.y - plateCell.cell.site.y,
         });

         // Calculate movements at this boundary position
         const plate1Movement = calculatePlateMovement(plates[plateCell.plateId], pos);
         const plate2Movement = calculatePlateMovement(plates[neighbor.plateId], pos);

         // Subduction: positive = converging, negative = diverging
         const subduction = dot2(normal, plate1Movement) - dot2(normal, plate2Movement);

         // Sliding: transform fault magnitude
         const sliding = Math.abs(dot2_90(normal, plate1Movement) - dot2_90(normal, plate2Movement));

         plateBoundaries.push({ pos, normal, plateSubduction: subduction, plateSliding: sliding });
       }
     }
   }
   ```

5. `table` - Boundary type classification:
   ```
   Subduction Value, Sliding Value, Boundary Type, Geological Result
   > 0.3, *, Convergent, Mountains / volcanic arcs / trenches
   < -0.2, *, Divergent, Rift valleys / mid-ocean ridges
   *, > 0.5, Transform, Fault lines / earthquake zones
   else, else, Passive, Stable plate interior
   ```

6. `explanation` - kdTree storage: "All boundaries are stored in a kdTree (k-dimensional tree) for fast spatial queries. Any downstream system can ask 'what's the nearest boundary to this tile?' and get an O(log n) answer."

7. `explanation` - Bridge: "Now we have boundaries with physics. But how do landmasses actually use this information to decide where to grow?"

**Transition:** From boundary math to landmass behavior

---

## Slide 5: Landmass Growth - Smelling Plate Boundaries
**Concept:** landmass
**Purpose:** Show how the rule system biases landmass growth toward plate boundaries

**Blocks:**
1. `explainer` - Weighted rule system: "CIV7 doesn't place continents randomly. Landmasses 'grow' cell by cell, with each candidate cell scored by a weighted sum of rules. One key rule: prefer cells near plate boundaries, especially convergent ones. This naturally creates coastlines that follow tectonic logic."

2. `diagram` - Rule-based growth:
   ```
   Landmass seed
        ↓
   [Consider neighbors]
        ↓
   Score each by:
   ├── RuleCellArea (prefer larger cells)
   ├── RuleNearNeighbor (stay connected)
   ├── RuleAvoidEdge (avoid poles/meridians)
   ├── RuleNearPlateBoundary ← key rule
   └── ... other rules
        ↓
   [Pick highest-scoring cell]
        ↓
   [Repeat until target size]
   ```

3. `codeBlock` - RuleNearPlateBoundary implementation:
   ```javascript
   // From voronoi_rules/near-plate-boundary.js
   class RuleNearPlateBoundary extends Rule {
     static getName() { return "Near Plate Boundary"; }

     configDefs = {
       scaleFactor: {
         description: "Distance where score = 0.5",
         defaultValue: 4,
       },
       directionInfluence: {
         description: "How much plate movement affects score",
         defaultValue: 0.5,
       }
     };

     score(regionCell, ctx) {
       const cellPos = { x: regionCell.cell.site.x, y: regionCell.cell.site.y };
       const boundary = this.m_plateBoundaries.search(cellPos);
       const distance = Math.sqrt(boundary.distSq);

       // Distance score: 0 (far) to 1 (at boundary)
       const distanceScore = 1 - distance / (distance + this.configValues.scaleFactor);

       // Direction score: boost for convergent boundaries
       const plateMovementScore = distanceScore * boundary.data.plateSubduction * 0.5;

       // Blend based on directionInfluence config
       return VoronoiUtils.lerp(distanceScore, plateMovementScore, this.configValues.directionInfluence);
     }
   }
   ```

4. `explanation` - Rule weights in ContinentGenerator:
   ```
   m_landmassRuleConfigs = [
     [RuleAvoidEdge, { weight: 1.0 }],        // Stay away from map edges
     [RuleCellArea, { weight: 0.1 }],         // Prefer larger cells
     [RuleNearNeighbor, { weight: 0.5 }],     // Stay connected
     [RuleNearRegionSeed, { weight: 0.05 }],  // Don't stray too far
     [RuleNeighborsInRegion, { weight: 0.25 }], // Compact shape
     [RuleAvoidOtherRegions, { weight: 1.0 }],  // Don't overlap
     [RuleNearPlateBoundary, { weight: 0.75 }], // ← Follow tectonics!
     [RulePreferLatitude, { weight: 0.5 }],   // Tropical bias
   ]
   ```

5. `explanation` - The result: "With `RuleNearPlateBoundary` weighted at 0.75, landmasses naturally grow along convergent boundaries. This is why CIV7 maps have mountain ranges along coastlines (like the Andes) and volcanic arcs—it's emergent from the physics, not hand-placed."

6. `explanation` - Bridge: "This is all CIV7's native system. But Swooper needs this data too—for climate, narrative overlays, and downstream features. How do we hook in?"

**Transition:** From CIV's system to Swooper's integration

---

## Slide 6: The Swooper Hook - WorldModel & Typed Arrays
**Concept:** integration
**Purpose:** Show the technical mechanism by which Swooper captures plate data

**Blocks:**
1. `explainer` - Why wrap CIV's system?: "CIV7's plate generation is excellent, but the data disappears after landmass growth. Swooper needs persistent access to plate boundaries for climate (orographic rainfall), narrative overlays (rift valleys, collision zones), and feature placement (volcanoes on convergent margins). We solve this by capturing the physics into typed arrays."

2. `diagram` - Integration architecture:
   ```
   CIV7 Base Game                    Swooper Engine
   ┌─────────────────┐              ┌─────────────────┐
   │ VoronoiUtils    │              │ plates.js       │
   │ PlateRegion     │──imports────→│ computePlates   │
   │ kdTree          │              │ VoronoiWrapper  │
   └─────────────────┘              └────────┬────────┘
                                             │
                                             ↓
                                    ┌─────────────────┐
                                    │ WorldModel      │
                                    │ ─────────────── │
                                    │ plateId[]       │
                                    │ boundaryClose[] │
                                    │ boundaryType[]  │
                                    │ upliftPotent[]  │
                                    │ riftPotential[] │
                                    │ tectonicStress[]│
                                    │ shieldStabil[]  │
                                    │ boundaryTree    │
                                    └─────────────────┘
   ```

3. `codeBlock` - computePlatesVoronoi wrapper:
   ```javascript
   // From plates.js
   export function computePlatesVoronoi(width, height, config) {
     const { count, relaxationSteps, convergenceMix, plateRotationMultiple } = config;

     // Use CIV7's utilities directly
     const bbox = { xl: 0, xr: width, yt: 0, yb: height };
     const sites = VoronoiUtils.createRandomSites(count, bbox.xr, bbox.yb);
     const diagram = VoronoiUtils.computeVoronoi(sites, bbox, relaxationSteps);

     // Create PlateRegions with physics (CIV7's class)
     const plateRegions = diagram.cells.map((cell, index) => {
       const region = new PlateRegion(`Plate${index}`, index, ...);
       region.seedLocation = { x: cell.site.x, y: cell.site.y };
       return region;
     });

     // Compute boundaries (same algorithm as CIV7)
     const plateBoundaries = computePlateBoundaries(regionCells, plateRegions);
     const boundaryTree = new kdTree(PlateBoundaryPosGetter);
     boundaryTree.build(plateBoundaries);

     // Capture into typed arrays for downstream use
     return {
       plateId: new Int16Array(size),
       boundaryCloseness: new Uint8Array(size),
       boundaryType: new Uint8Array(size),
       // ... populate arrays from boundary queries
     };
   }
   ```

4. `table` - Typed array schema:
   ```
   Array, Type, Range, Purpose
   plateId, Int16Array, 0..N, Which plate owns this tile
   boundaryCloseness, Uint8Array, 0..255, Distance to nearest boundary (255 = at boundary)
   boundaryType, Uint8Array, 0..3, none/convergent/divergent/transform
   tectonicStress, Uint8Array, 0..255, Overall stress level (boundary proximity)
   upliftPotential, Uint8Array, 0..255, Mountain formation potential (high at convergent)
   riftPotential, Uint8Array, 0..255, Rift valley potential (high at divergent)
   shieldStability, Uint8Array, 0..255, Plate interior stability (inverse of stress)
   plateMovementU/V, Int8Array, -127..127, Plate movement vector components
   plateRotation, Int8Array, -127..127, Plate rotation value
   ```

5. `explanation` - Bridge: "This gives us the data. But why do we need it? What does Swooper actually do with plate physics?"

**Transition:** From technical mechanism to purpose

---

## Slide 7: Why We Hook In - Intent and Downstream Consumers
**Concept:** intent
**Purpose:** Explain the motivation for capturing plate data and how downstream systems use it

**Blocks:**
1. `explainer` - The physics-before-narrative principle: "Swooper's architecture follows a key principle: establish physical reality first, then annotate and interpret it. Plate tectonics is foundational physics—it should inform climate, narrative, and features, not be overridden by them. By capturing plate data early, we ensure all downstream systems work from the same physical truth."

2. `layers` - Downstream consumers of plate data:
   ```
   Layer, Consumer, Uses Plate Data For
   Foundation, WorldModel, Single source of truth for all physics
   Morphology, mountains.js, Uplift-aware peak placement along convergent boundaries
   Morphology, volcanoes.js, Volcanic arc placement at subduction zones
   Morphology, coastlines.js, Ruggedization intensity based on margin type
   Climate, climateBaseline.js, Orographic effects use boundary-aware elevation
   Narrative, storyRifts.js, Tag rift valleys at divergent boundaries
   Narrative, storyOrogeny.js, Tag mountain ranges at collision zones
   Features, feature-biomes.js, Volcanic features biased toward convergent zones
   ```

3. `diagram` - Data flow through pipeline:
   ```
   ┌─────────────┐
   │ WorldModel  │ ← Single source of truth
   │ plateData   │
   └──────┬──────┘
          │
     ┌────┴────┬────────┬────────┬────────┐
     ↓         ↓        ↓        ↓        ↓
   Morphology  Climate  Narrative Features  Balance
   (terrain)   (rain)   (tags)   (volcanoes) (starts)
   ```

4. `explanation` - Specific use cases:
   - **Mountains:** `upliftPotential` biases mountain placement toward convergent boundaries
   - **Volcanoes:** Placed preferentially where `boundaryType === convergent` and `boundaryCloseness > threshold`
   - **Climate:** Rain shadow calculations use plate-derived elevation gradients
   - **Coastlines:** Active margins (convergent) get fjords; passive margins get gentle shelves
   - **Narrative tags:** `StoryOverlays.rifts` marks divergent zones; `StoryOverlays.collisionZones` marks convergent

5. `explanation` - Why typed arrays?: "Downstream systems need O(1) lookups. A stage processing 10,000 tiles can't afford kdTree queries for each one. By pre-computing into flat arrays indexed by tile position, we get instant access: `upliftPotential[y * width + x]`."

6. `codeBlock` - Example downstream usage:
   ```javascript
   // In mountains.js
   function scoreMountainPlacement(x, y) {
     const i = y * width + x;

     // Base score from other factors
     let score = baseTerrainScore(x, y);

     // Boost from plate tectonics
     const uplift = WorldModel.upliftPotential[i] / 255;  // 0..1
     score += uplift * CONFIG.mountains.upliftWeight;

     // Extra boost at convergent boundaries
     if (WorldModel.boundaryType[i] === BOUNDARY.convergent) {
       score += CONFIG.mountains.convergentBonus;
     }

     return score;
   }
   ```

7. `explanation` - Bridge: "Now we understand what we capture and why. But how much control do we have over the plate generation itself?"

**Transition:** From intent to configuration

---

## Slide 8: Taking Control - Configuration Surface
**Concept:** config
**Purpose:** Show all the knobs available for tuning plate generation

**Blocks:**
1. `explainer` - Configuration philosophy: "Plate generation is highly configurable through the `foundation.plates.*` namespace. You can control plate count, boundary character, relaxation quality, and even override the RNG seed for reproducible results. These settings cascade through the entire pipeline."

2. `table` - Core plate config:
   ```
   Config Key, Type, Default, Effect
   foundation.plates.count, number, 8, Number of tectonic plates
   foundation.plates.relaxationSteps, number, 5, Lloyd iterations (higher = more uniform)
   foundation.plates.convergenceMix, 0..1, 0.5, Ratio of convergent vs divergent boundaries
   foundation.plates.plateRotationMultiple, number, 1.0, Amplify/dampen rotational influence
   ```

3. `codeBlock` - Seed control for reproducibility:
   ```javascript
   // From plate_seed.js
   export const PlateSeedManager = {
     capture(width, height, config) {
       const seedCfg = normalizeSeedConfig(config);
       // seedMode: "engine" (use CIV's RNG) or "fixed" (deterministic)
       // fixedSeed: specific seed value when mode is "fixed"
       // seedOffset: integer offset applied to base seed

       const control = applySeedControl(seedCfg.seedMode, seedCfg.fixedSeed, seedCfg.seedOffset);

       return {
         snapshot: Object.freeze({ ...seedCfg, seed: control.seed }),
         restore: control.restore,  // Call to restore original RNG state
       };
     }
   };
   ```

4. `table` - Seed configuration:
   ```
   Config Key, Type, Default, Effect
   foundation.seed.mode, "engine"/"fixed", "engine", Use CIV's RNG or fixed seed
   foundation.seed.fixed, number, undefined, Specific seed when mode is "fixed"
   foundation.seed.offset, number, 0, Offset applied to base seed
   ```

5. `explanation` - Directionality control: "Beyond random plates, you can bias plate movement toward a preferred axis. This creates maps with coherent tectonic patterns—like all plates drifting generally eastward."

6. `table` - Directionality config:
   ```
   Config Key, Type, Default, Effect
   foundation.directionality.cohesion, 0..1, 0, How strongly to bias toward primary axis
   foundation.directionality.primaryAxes.plateAxisDeg, degrees, 0, Preferred plate movement direction
   foundation.directionality.variability.angleJitterDeg, degrees, 0, Random variation around axis
   foundation.directionality.variability.magnitudeVariance, 0..1, 0.35, Speed variation
   ```

7. `codeBlock` - Applying directionality bias:
   ```javascript
   function applyDirectionalityBias(plate, directionality) {
     const cohesion = directionality.cohesion ?? 0;
     const plateAxisDeg = directionality.primaryAxes?.plateAxisDeg ?? 0;
     const jitter = getRandomJitter(directionality.variability?.angleJitterDeg ?? 0);

     // Blend current angle toward target axis
     const currentAngle = Math.atan2(plate.m_movement.y, plate.m_movement.x) * 180 / Math.PI;
     const targetAngle = currentAngle * (1 - cohesion) + plateAxisDeg * cohesion + jitter;

     // Apply new angle, preserve magnitude
     const mag = Math.sqrt(plate.m_movement.x ** 2 + plate.m_movement.y ** 2);
     const rad = targetAngle * Math.PI / 180;
     plate.m_movement.x = Math.cos(rad) * mag;
     plate.m_movement.y = Math.sin(rad) * mag;
   }
   ```

8. `explanation` - Bridge: "With this control surface, what kinds of worlds can we create?"

**Transition:** From configuration to creative possibilities

---

## Slide 9: Creative Possibilities - Different Worlds
**Concept:** creative
**Purpose:** Show example configurations and their geological outcomes

**Blocks:**
1. `explainer` - Configuration as world-building: "By tuning plate generation parameters, you can create dramatically different geological settings. A high-convergence world has intense mountain building; a divergent world has rift valleys and spreading seas; many small plates create archipelagos."

2. `table` - Example configurations:
   ```
   World Type, Plate Count, Convergence Mix, Rotation, Result
   Pangaea, 3-4, 0.8, 0.5, Few large continents with massive collision zones
   Archipelago, 15-20, 0.3, 1.5, Many small landmasses, volcanic island chains
   Rift World, 6-8, 0.2, 0.3, Elongated continents separated by young seas
   Ring of Fire, 8-10, 0.9, 1.0, Coastal mountain ranges, volcanic arcs
   Shield World, 4-5, 0.1, 0.2, Stable, flat continents with minimal mountains
   ```

3. `layers` - Configuration to outcome:
   ```
   High convergenceMix (0.8+)
   └── Many convergent boundaries
       └── Frequent mountain building
           └── Rugged coastlines, volcanic arcs

   Low convergenceMix (0.2-)
   └── Many divergent boundaries
       └── Rift valleys, spreading ridges
           └── Elongated seas, young ocean floor

   High plateRotationMultiple (1.5+)
   └── Amplified rotational effects
       └── Curved plate boundaries
           └── Arc-shaped island chains
   ```

4. `explanation` - Preset examples:
   - **Classic preset:** Balanced plates (8), moderate convergence (0.5), standard rotation (1.0) → Earth-like distribution
   - **Volcanic preset:** Many plates (12), high convergence (0.8), high rotation (1.2) → Ring of Fire everywhere
   - **Continental preset:** Few plates (4), low convergence (0.3), low rotation (0.5) → Large stable landmasses

5. `explanation` - Future possibilities:
   - **Hotspot simulation:** Volcanic chains that cross plate boundaries (like Hawaii)
   - **Plate age:** Older plates = thicker, more stable; younger = thinner, more active
   - **Mantle plumes:** Deep heat sources creating localized volcanic activity
   - **Historical tectonics:** Simulate plate positions at different geological eras

6. `kpiGrid` - Summary of control points:
   ```
   Control, Range, Impact
   Plate count, 2-20, Landmass fragmentation
   Convergence, 0-1, Mountain intensity
   Rotation, 0-2, Boundary curvature
   Directionality, 0-1, Global drift coherence
   Seed mode, engine/fixed, Reproducibility
   ```

7. `explanation` - Closing: "Voronoi plate generation transforms random geometry into physically-motivated terrain. By understanding the math—from Fortune's algorithm through boundary physics to rule-based growth—you can tune the system to create worlds that feel geologically authentic while serving gameplay needs."

---

## Key Takeaways

1. **Voronoi diagrams** partition space into cells using Fortune's O(n log n) sweep-line algorithm
2. **Plates gain physics** through random movement vectors and rotation values per PlateRegion
3. **Boundary types emerge** from vector math: `subduction = dot(normal, movement1 - movement2)`
4. **Landmasses follow plates** via weighted rules that bias growth toward convergent boundaries
5. **Swooper captures** plate physics into typed arrays for downstream climate, narrative, and features
6. **Configuration controls** plate count, convergence mix, rotation, directionality, and seeding
7. **Creative possibilities** range from Pangaea to Archipelago based on parameter tuning
