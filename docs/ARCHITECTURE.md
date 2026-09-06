# Architecture

## Boundaries

- `core/GameClock.ts` constructs operational blocks from `data/schedules/masterClock.json`; elapsed-time advancement, day rollover and thirteen-day cycles do not depend on rendering.
- `campus/plan.ts` owns stable slice room IDs, spatial definitions, access categories and scale. All physical numbers are implementation defaults.
- `npc/NPCScheduler.ts` deterministically derives identity, class assignment, seat and travel from ID and time. Renderer disposal cannot reset these values. Only the slice cohort has complete current route definitions.
- `navigation/RoutePlanner.ts` implements graph shortest-path filtering plus the current physical room/stair waypoint route. The generic closure-aware graph is tested but not yet integrated with all rendered campus routes.
- `architecture/Environment.ts` constructs era-specific materials, furniture, concrete coffers, glazing, corridors and interactive doors. Immutable geometry is merged per sector/material/collision category. Doors, signs and teaching displays retain separate state.
- `npc/Avatar.ts` owns replacement-ready original species geometry and simple joint animation. These are explicitly temporary assets.
- `core/SaveSystem.ts` validates versioned browser-local state before returning it. Identity/schedule state is reconstructed from saved seed and clock, rather than serializing 30,000 redundant records.
- `main.ts` owns input, simulation/render lifecycle, UI, player lift travel and current rendering tiers.

## Streaming and scale

Three slice sectors are enabled by proximity in elevation. Full room streaming and horizontal district streaming are future work. The current environment is roughly 130 metres along its main route; this does **not** satisfy the full-campus 5–8-minute route target. The architecture leaves the full institution intact in canon without claiming the slice is a full floor.

## Schedule semantics

Exact times are NON_CANON_IMPLEMENTATION_DEFAULT. Seven academic pulses are separated by Passage; a meal window contains staggered A/B/C movement. Hold activation clamps advancement at the next Passage boundary and preserves the old classroom until released; this is a conservative development hold policy, not an official bell-time rule. Instructional makeup time and scoped floor holds remain future work.

Routes are sampled in world metres against simulation seconds. Animation uses real elapsed time to avoid rapidly cycling limbs at accelerated clocks. Destination reconstruction provides offscreen consistency but cannot yet model independent accumulated delays and physical elevator queues. Add a persistent locomotion/queue layer before final crowd acceptance.

## Saves

State is local to the current browser origin. It contains time, cycle basis, player position/orientation, open classroom doors, graphics and Still Bell V. Named social changes, outages and construction closures are not yet implemented or saved. Autosave runs every 30 seconds; manual save reports write failures. Unsupported and malformed saves are rejected before application.

## Rendering

Babylon WebGL engine with PBR materials, original procedural texture noise and pooled-by-identity visible proxy objects. Tier counts in diagnostics distinguish current slice schedules from unused identity capacity. There is no measured 1080p performance result yet. Live mesh churn during crowd transitions and the engine bundle size require profiling.
