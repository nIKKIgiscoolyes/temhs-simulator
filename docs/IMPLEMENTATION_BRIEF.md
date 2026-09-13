# Implementation status — September 13, 2026

The review below records the published three-level baseline at `8945b40`. Implementation discovered and preserved the existing local six-level expansion `9d22cea`; alpha 0.3 builds on that work rather than removing it. The original proposed alpha 0.2 label and population boundary below are historical planning assumptions, superseded by this status section.

| Phase | File-specific delivery | Acceptance / status |
| --- | --- | --- |
| Persistent transport | `src/navigation/LiftController.ts`, `src/npc/CampusSimulation.ts`, `src/core/SaveSystem.ts` | Shared observer/NPC capacity, physical boarding, interlocks and v3 resume tested; complete crowd avoidance deferred |
| Classroom cycle | `src/npc/ClassroomController.ts`, `src/npc/StaffController.ts`, `src/npc/Avatar.ts`, `src/main.ts` | Phase-specific actions, teacher circulation/release, custodial routines and saved continuity tested; production rigs/social groups deferred |
| Architecture | `src/architecture/Environment.ts`, `src/campus/plan.ts` | Seminar, biomed lab and civic archive upgraded; hinged doors and representative route clearance checked with CPU geometry |
| Navigation and scale | `src/navigation/RoutePlanner.ts`, `src/ui/Wayfinding.ts`, `src/rendering/AvatarPool.ts` | Live stair detours, room directory, bounded avatar reuse; 2,880-agent CPU probe completed |
| Release validation | `tests/integrated-journey.test.ts`, `tests/lifts.test.ts`, `tests/environment.test.ts`, `scripts/` | 32 tests and build pass; desktop interaction and GPU acceptance remain open |

Next phased tasks:

1. Desktop acceptance: traverse each stair/lift bank, interrupt and resume a queued ride, walk the TMAP detour, and watch a complete lesson-to-Passage cycle. Accept only with no solid-wall crossings or missing destination geometry; record browser/device and GPU results in `docs/ACCEPTANCE.md`.
2. Crowd and storage: extend `CampusSimulation.ts` with body-aware avoidance and destination capacity; move large snapshots from local storage to a versioned IndexedDB store in `SaveSystem.ts`. Accept a long-duration 2,880-agent run with bounded queues, explicit unreachable outcomes and successful save/reload under quota pressure.
3. Character and social realism: introduce an authored rig/animation pipeline behind `Avatar.ts`, retaining deterministic identities and pooling. Add bounded peer-group and supervision state to the simulation. Accept anatomically stable sitting/walking transitions, species clearance and identity continuity through streaming.
4. Architecture and performance: profile `Environment.ts` and `AvatarPool.ts` on target hardware before adding more campus area. Author distinctive connecting public spaces, then validate 1080p frame time, memory and all-route clearance on the recorded device.

See `ACCEPTANCE.md` for current evidence and limitations. The original review follows as the detailed design rationale; its proposed tasks are not all claimed complete.

---

# TEMHS Simulator — Next Alpha Engineering Brief

Prepared September 12, 2026. Direction selected by Nikki: balanced architecture, character quality, and a working lesson-to-Passage cycle.

## 1. Recommendation and delivery outcome

Build a credible, persistent school experience across the existing Floor 1 / Level -1 / Level -2 section before constructing the remaining three playable levels. The next milestone should let an observer watch instruction, see students pack and leave, follow an identifiable student through congestion and vertical transport, watch that student settle into the next class, and save/resume the experience accurately.

The largest gains come from combining three changes: authored architectural spaces, properly animated anthropomorphic characters, and movement that remembers what actually happened. Lighting alone cannot resolve primitive characters; larger maps will expose the limitations of clock-derived routes.

**Proposed milestone:** Balanced Alpha 0.2. This is a planning label, not an existing release or a promise of completion time.

**Completion boundary:** preserve the 18 instructional rooms and 288 scheduled students; upgrade three representative teaching rooms and their connecting public spaces to the new standard; make the entire existing cohort use the improved movement system. Expand one bounded circulation loop within the existing section after baseline traversal is verified. Full six-level construction follows this milestone.

## 2. Reviewed baseline and evidence limits

The latest default-branch commit retrieved for this review is [`8945b40787e34ff9e55c336566d0edfb36b4dc2b`](https://github.com/nIKKIgiscoolyes/temhs-simulator/commit/8945b40787e34ff9e55c336566d0edfb36b4dc2b), dated September 6, 2026, titled “feat: publish sanitized TEMHS simulator alpha.” The GitHub Releases collection returned no releases. “Published alpha” here means the pushed source commit; this review does not establish a deployed playable build.

This is a source and documentation review. I inspected the implementation, both test files, package configuration, CI workflow, architecture documentation, acceptance record, and relevant architectural/TMAP canon. I did not run the simulator, rerun its tests, inspect a live GPU session, or compare it against the original uploaded images. Runtime defects below are identified as risks where execution is needed to confirm the visible outcome.

The [README](https://github.com/nIKKIgiscoolyes/temhs-simulator/blob/8945b40/README.md) describes three connected development sections, 18 rooms, simplified rigs, and 288 scheduled students. The 30,000 figure is deterministic identity capacity, not an implemented 30,000-person school simulation. The [acceptance record](https://github.com/nIKKIgiscoolyes/temhs-simulator/blob/8945b40/docs/ACCEPTANCE.md) reports passing logic/type/build checks but blocked browser verification. The inspected test files contain 16 tests; their presence is not a fresh passing result.

## 3. Highest-impact findings

| Priority | Source finding | Practical consequence | Next change |
|---|---|---|---|
| P0 | `NPCScheduler.studentState()` reconstructs position from the current block and elapsed time. Academic blocks return an assigned seat directly. | Queues, closures, and lateness cannot persist naturally; a delayed student can reset to the next seat at a block boundary. | Separate schedule intent from persistent physical state. |
| P0 | `RoutePlanner.shortestPath()` filters blocked edges, but `routeBetween()` constructs fixed waypoints without using that graph. | The passing graph test does not demonstrate live NPC detours. | Generate one traversable graph from the campus definition and use it for actual routes. |
| P0 | `main.ts` controls the player lift separately; `setLiftOpen()` iterates every landing door. | Landing doors open together in the code, and NPCs cannot share the transport system. | One lift controller with landing interlocks, occupancy, queues, and requests. |
| P1 | `plan.ts` repeats six rooms at the same coordinates on each floor; `Environment.ts` builds nearly identical room footprints. | Floor identity and institutional scale remain weak despite different surface treatments. | Author a fixed spatial plan with distinct room types, junctions, support spaces, and landmarks. |
| P1 | `Avatar.ts` uses boxes, low-segment spheres, and simple limb rotations; characters share one underlying construction. | Larger models or more polygons alone will not produce convincing species anatomy or seated work. | Introduce a character asset/animation pipeline and scale-aware interaction anchors. |
| P1 | `main.ts` maps most stationary students to a seated pose; teachers and staff use sinusoidal movement proxies. | Activity labels can disagree with bodies; work and teaching lack clear purpose. | Explicit classroom, locomotion, and staff action states drive animation. |
| P1 | Visible avatars are disposed and recreated as the selected nearby set changes. Sectors toggle by height; there is no horizontal room streaming. | Higher-detail crowds and wider floors may cause loading churn and frame spikes. | Profile, pool representations, add hysteresis, and stream spatial cells. |
| P1 | Save v1 includes time, player transform, doors, hold, and quality, but no independent NPC delay or lift state. | A new stateful simulation will lose continuity unless persistence changes alongside it. | Versioned save migration and simulation snapshots. |
| P2 | Interaction uses proximity checks; map geometry is hard-coded; meals and locker stops have simplified behavior. | Interactions may be offered through obstacles; map and behavioral descriptions can outgrow actual functionality. | Shared interaction targets, graph-driven wayfinding, and actual activity reservations. |

Sources: [NPC scheduler](https://github.com/nIKKIgiscoolyes/temhs-simulator/blob/8945b40/src/npc/NPCScheduler.ts), [routing](https://github.com/nIKKIgiscoolyes/temhs-simulator/blob/8945b40/src/navigation/RoutePlanner.ts), [main loop and interaction](https://github.com/nIKKIgiscoolyes/temhs-simulator/blob/8945b40/src/main.ts), [campus plan](https://github.com/nIKKIgiscoolyes/temhs-simulator/blob/8945b40/src/campus/plan.ts), [environment](https://github.com/nIKKIgiscoolyes/temhs-simulator/blob/8945b40/src/architecture/Environment.ts), [avatars](https://github.com/nIKKIgiscoolyes/temhs-simulator/blob/8945b40/src/npc/Avatar.ts), [saves](https://github.com/nIKKIgiscoolyes/temhs-simulator/blob/8945b40/src/core/SaveSystem.ts).

## 4. Scope and canon constraints

Keep Babylon.js, TypeScript, Vite, WebGL2-first delivery, deterministic identities, browser-local persistence, the thirteen-day cycle, seven Pulses, Homing, Passage, meals, terminal release, and Still Bell V. Preserve established behavior through explicit compatibility tests. Keep exact clock times labeled as implementation defaults.

Floor 1 and eventual Floor 2 are 2021 new construction. Underground levels originate in 1978 and remain occupied, maintained, repaired, and partially modernized. Preserve structural concrete, institutional circulation, and layered renovations. TMAP is approximately 58% complete in September 2026; its percentages describe institutional condition and must not be converted mechanically into visible room counts.

The eventual playable scope remains Floors 1 and 2 and Levels -1 through -4. Imply deeper levels through truthful directories, restricted transfer points, and infrastructure. Do not build -5 through -30 in this scope. Keep the map stable between sessions and retain existing room IDs or supply explicit migrations.

Original uploaded reference images and prompt/specification attachments remain excluded from public repository history. New assets must have documented provenance and redistribution permission. The brief does not authorize a new public upload of original references.

Canon sources: [campus master plan](https://github.com/nIKKIgiscoolyes/temhs-simulator/blob/8945b40/docs/canon/CAMPUS_MASTERPLAN.md), [2021 architecture](https://github.com/nIKKIgiscoolyes/temhs-simulator/blob/8945b40/docs/canon/ARCHITECTURE_2021.md), [1978 architecture](https://github.com/nIKKIgiscoolyes/temhs-simulator/blob/8945b40/docs/canon/ARCHITECTURE_1978.md), [TMAP](https://github.com/nIKKIgiscoolyes/temhs-simulator/blob/8945b40/docs/canon/TMAP_2026.md).

## 5. Architecture and visual production package

Deliver three representative teaching spaces: a modern Floor 1 classroom, a retrofitted Level -1 lab, and an older Level -2 humanities/civic-memory room. Retain the other instructional rooms and apply shared collision, material, lighting, and interaction improvements throughout.

| Area | Required architectural treatment | Functional evidence |
|---|---|---|
| Floor 1 arrival/common space | Glazing, believable exterior backdrop, structural bays, pale millwork, acoustic treatment, maintained terrazzo, five years of subtle wear | Reception point, directory, seating, clear routes to teaching and transport |
| Level -1 transition | Heavy concrete, deeper openings, older signage beside newer systems, repaired surfaces, modern ventilation | Busy transfer junction with usable detour and supervised movement |
| Level -2 teaching area | Coffered structure, older cabinetry, contemporary learning equipment, differentiated room layouts | Workstations, teacher circulation, storage and subject-specific activities |
| Shared support spaces | At least one furnished staff workroom, restroom entrance/interior, storage/service boundary, and seating or meal area | Correct access classes and meaningful occupancy; no unnecessary full facility simulation |
| TMAP interface | Separated work zone, inspection notice, repair layers and updated services | A closure affects navigation, signs, and staff response consistently |

Define dimensions, door clearances, furniture footprints, and interaction anchors in data. Use accessible transport and appropriately sized seats/routes for species scale classes; uniformly enlarging a character must not leave its head through a lintel or its body inside a desk. Add one larger-species clearance fixture for validation without claiming the full extreme-size population is supported.

Improve materials with coherent physical scale, roughness, surface normals where useful, edge treatment, and restrained wear. Replace noise-only appearance where it limits the focal spaces. Use lighting zones appropriate to daylight and occupied underground rooms; emissive fixture geometry needs a corresponding illumination strategy. Profile baked/static approaches and limited dynamic shadows before selecting their final budgets. Production techniques are implementation choices, not verified performance claims.

## 6. NPC simulation and character package

**Schedule intent:** identity, timetable, destination, authorized route requirements, meal group, and desired activity.

**Persistent runtime state:** agent ID, current position and region, goal, route and progress, locomotion mode, delay, queue reservation, activity reservation, and last simulation update. The schedule supplies goals; it must not overwrite a delayed physical position with an assigned seat.

**Classroom cycle:** arrive → locate reserved seat → settle → attend instruction / discuss / work → pack → wait for release → leave → travel → settle. A late student remains late until arrival. Teacher actions follow lesson phase and occupancy: explain, turn to board, circulate along walkable space, respond briefly to a student, and supervise release.

**Movement:** graph-based room-to-room routing, traversable local paths around desks, body-size clearance checks, local avoidance, deterministic release staggering, doorway queues, stairs, lift boarding/alighting, and rerouting after a closure. Detect sustained lack of progress and retry or report a blocked route. Do not conceal routing failures with unexplained teleportation.

**Assets:** begin with three distinct, reusable anthropomorphic species archetypes with proper articulated joints, compatible animation clips, and several clothing/body variants. Extend through a manifest rather than hard-coded model branches. Provide idle, walk, turn, sit/stand, seated work, pack, and teaching gestures. Transition animation from actual activity and distance travelled to reduce foot sliding. Maintain stable appearance for each identity through unload/reload.

**Staff and social behavior:** deliver one teacher release routine, one custodian route that avoids crowded Passage, and one facilities routine associated with the TMAP boundary. Give a small friend group a scheduled conversation or shared walk that yields to class obligations. Full relationships, conversational AI, and comprehensive institutional staffing remain later work.

**Behavior consistency fixes:** make meal rotation and displayed meal group derive from the same field; the current code chooses rotation from `index % 3` but identity meal from a hash. Turn locker stops into actual stopped actions with a reserved position, or remove the label until implemented. Replace implicit “not walking means seated” with explicit poses.

## 7. File-specific implementation map

Existing paths below are reviewed files. Paths marked **new** are proposed modules, not code already present.

| File | Required work |
|---|---|
| `src/campus/plan.ts` | Preserve stable IDs; replace repeated positional assumptions with authored rooms, portals, connectors, support spaces, bounds, capacity, access and size-clearance data. Separate instructional rooms from all rooms so adding a restroom does not accidentally increase `ACTIVE_STUDENTS`. |
| `src/campus/schema.ts` **new** | Define and validate room, doorway, connector, seat, zone, TMAP and accessibility records. Geometry, navigation, map and signs consume the same records. |
| `src/architecture/Environment.ts` | Build from the schema; split geometry by streamable cells; implement reusable era-specific components and proper door pivots/state. Avoid merging an entire floor into batches that prevent useful room culling. |
| `src/architecture/Materials.ts` and `Lighting.ts` **new** | Centralize material definitions, texture scale, illumination zones, shadow quality and lifecycle ownership. |
| `src/navigation/RoutePlanner.ts` | Integrate the existing graph search into real routes; handle door state, authorization, clearance, alternate connectors and unavailable destinations. Remove fixed eight-metre stair assumptions from route generation. |
| `src/navigation/LocomotionSystem.ts` **new** | Persist route progress; implement local collision-aware movement, avoidance, queue approach and recovery. Keep movement independent of avatar existence. |
| `src/navigation/LiftController.ts` **new** | Own cabin position, request order, occupancy, door interlocks and boarding/alighting for both player and NPCs. Only the serviced landing opens. |
| `src/npc/NPCScheduler.ts` | Retain identity and assignment compatibility; output goals; unify meal assignment; stop using clock-derived seat position as the authoritative answer for delayed agents. |
| `src/npc/AgentState.ts` and `ClassroomController.ts` **new** | Own runtime state, reservations, phase-specific actions, attendance/late arrival and teacher release. Give staff distinct role identities rather than relying on student-shaped metadata. |
| `src/npc/Avatar.ts` | Become an asset/animation adapter; add manifest-driven models, scale handling, animation transitions and reusable visual instances. Ensure disposal returns resources safely without destroying shared assets. |
| `src/core/GameClock.ts` | Preserve cycle semantics; publish transitions consistently; make time jumps explicit simulation operations. Distinguish pause, accelerated simulation and debug seeking. |
| `src/core/SaveSystem.ts` | Add v2 schema and v1 migration; persist relevant agent deltas, queues, closures, classroom state and lift state; validate IDs before applying atomically. Keep a recoverable v1 copy. |
| `src/main.ts` | Extract UI, input, lift and simulation orchestration. Replace avatar churn with representation pooling; use line-of-sight interaction targets; keep initial graphics settings and restored state consistent. |
| `src/ui/MapPanel.ts`, `src/interaction/InteractionSystem.ts` **new** | Build maps and route guidance from campus data; handle visible/reachable targets and occupied interactions consistently. |
| `src/audio/CampusAudio.ts` **new** | Add user-gesture-unlocked spatial classroom, footstep, door, bell and ventilation audio; mute/volume controls and room attenuation. |
| `src/core/SimulationWorld.ts`, `src/campus/StreamingSystem.ts` **new** | Use a bounded fixed-step simulation; preserve state across four representation tiers; stream rooms/cells with hysteresis and defined ownership. |
| `tests/simulation.test.ts`, `tests/environment.test.ts` | Preserve useful baseline coverage; extend for actual live graph routing, stateful delays, clearance, holds and migrations. Replace obsolete fixed-count assertions only with meaningful new invariants. |
| `tests/e2e/` **new**, `package.json`, `.github/workflows/ci.yml` | Add browser journey coverage, test scenarios, screenshots and artifacts. Choose browser tooling during implementation; do not equate headless success with measured GPU performance. |
| `THIRD_PARTY_ASSETS.md`, `docs/ARCHITECTURE.md`, `docs/ACCEPTANCE.md`, `docs/BUILD_LOG.md` | Document asset provenance, state ownership, test evidence, exact tested commit and remaining limitations. |

## 8. Phased execution and exit gates

| Phase | Scope | Exit gate |
|---|---|---|
| 0 — Establish baseline | Fresh checkout of reviewed SHA; dependency install; existing checks; reachable browser; repeatable start and lesson-to-Passage fixture; screenshots and performance capture | Record current failures and successful checks. Traverse all existing levels and assess doors/stairs/lift before expanding geometry. |
| 1 — Shared physical foundation | Campus schema, graph integration, persistent agent state, lift controller and save migration; preserve current visuals initially | A student can be delayed by a real obstacle, finish the journey after the bell, and retain progress through save/reload. |
| 2 — Balanced experience | Three focal rooms, arrival/transfer spaces, bounded circulation loop, three character archetypes, complete classroom cycle, staff routines and audio | Recorded end-to-end classroom → Passage → next classroom experience across old/new architecture, with genuine queues and visible continuity. |
| 3 — Population and performance | Apply behavior to 288 scheduled students; pool assets; implement streaming tiers; finish interaction/map integration and optimize measured bottlenecks | Pass crowded routes, unload/reload, persistence and performance gates below. |
| 4 — Controlled scale expansion | Extend authored wings, then add Floor 2, Level -3 and Level -4 in separate increments | Each addition passes traversal, capacity, scheduling, streaming and visual gates before the next increment. |

Phases specify dependency order, not separate agents or calendar estimates. Character and environment production can proceed as independent workstreams once data contracts are stable, but the milestone ships only when their integrated journey works.

## 9. Acceptance criteria for Balanced Alpha 0.2

These are proposed engineering thresholds, not TEMHS canon or measured alpha performance. Establish a named reference computer, browser, resolution and quality preset in Phase 0. Any later threshold change must be documented with evidence.

| Gate | Pass requirement | Evidence |
|---|---|---|
| Regression | Typecheck, all retained meaningful tests and production build pass from a clean dependency install | Commands, logs and exact commit |
| Core journey | At normal speed, observe lesson activity, packing, release, travel, arrival and next-class settling; repeat on same-floor and cross-floor routes | Automated state assertions plus uninterrupted browser recording |
| Schedule persistence | No seat reset when the next Pulse starts while an agent is still travelling; late status clears only on arrival | Deliberately delayed-agent test |
| Crowds | Exercise all 288 scheduled students over three Passage windows; no wall penetration or persistent doorway deadlock; blocked agents replan or expose a reason within 10 simulation seconds | Route completion, blockage and queue diagnostics plus visual inspection |
| Routing and TMAP | Close a live connector; authorized agents use an alternate route. If none exists, they wait/report blockage. Map/signage reflects the same closure | Integration test on actual campus graph |
| Lift | Player and NPCs queue, board, ride and exit; capacity enforced; no boarding during travel; only the correct landing opens | Two-floor demand scenario, occupancy assertions and recording |
| Still Bell | Existing hold semantics remain explicit; activation and release cannot reset agents already in motion or invalidate reservations | Tests before release, during Passage and after loading a hold |
| Character quality | Three distinct species archetypes, stable identity appearance, credible walk/turn/sit/work transitions; no persistent foot sliding or furniture penetration in focal scenes | Fixed-camera close and medium views; animation clips |
| Architecture | Three focal rooms differ by era and function; door, stair, furniture and route clearances match data; public paths are continuous | Dimension audit and full walking tour |
| Persistence | A v1 save migrates; a v2 save restores during travel, queueing and a hold. Malformed saves do not partially apply | Migration fixtures, round trips and browser reload scenarios |
| Streaming | Leave/re-enter zones ten times; identity, reservations and destination remain stable; no visible-agent teleport caused by tier changes | State assertions and recorded transition views |
| Resource lifecycle | After warm-up, repeated identical tours show no monotonic retained-mesh/texture growth; compare memory where browser measurement is available | Ten-loop counters and capture |
| Performance | Proposed normal-play target: 1080p medium, median frame time ≤16.7 ms, p95 ≤25 ms, and no repeatable streaming stall >100 ms during the defined crowded tour | Five-minute capture with hardware/browser details; report 1×, 10× and 60× separately |
| Interaction/audio | Prompts require a reachable target; map destinations exist; doors, directions and schedule are usable; mute works and classroom sound respects space | Browser checklist and smoke tests |
| Visual approval | Compare matching 2021, 1978, classroom, crowd, junction and lift views; investigate artifacts rather than relying on compile success | Screenshots/recording tied to tested SHA |

A blocked browser or unavailable reference GPU must remain a failed/unverified gate. Complete the useful code and logic checks, record the blocker, and do not label the milestone visually complete or use it to justify broad floor expansion.

## 10. Scale strategy after the balanced milestone

The existing architectural documentation describes a roughly 130-metre main route. At the implemented 1.4 m/s normal walking speed, that is about 93 seconds of unobstructed travel. The master plan's eventual five-to-eight-minute walking target implies approximately 420–672 metres at that speed, before queues and vertical transport. These are route lengths, not prescribed straight corridors or whole-floor dimensions.

Expand through fixed districts with intersections, support spaces, short alternatives and recognizable landmarks. Generate construction from authored data while keeping topology stable. Validate that travel time plus service time fits schedules, or represent planned lateness/operational adjustment explicitly. Extending corridors without changing transport and schedule feasibility will produce a larger but less convincing school.

Use four simulation/representation tiers: nearby full animation and local avoidance; nearby simplified agents; offscreen route/event simulation; distant institutional occupancy/identity records. Promotion into a visible tier must reconstruct from persistent state without moving the underlying person. Report scheduled, simulated, visible and identity-only counts separately. Rendering 30,000 full rigs is not the scale objective.

Floor 2 should emphasize modern academic spaces; Level -3 historical/specialized instruction; Level -4 active deep institutional and infrastructure interfaces. Add each as a functioning district with stable routes, staff, room records and transport capacity. The expansion should inherit proven kits and behavior, not duplicate the original six-room corridor.

## 11. Risks and engineering decisions

- **Character production is a real dependency.** Rigged anatomy, skinning and animation require a deliberate asset workflow. Adding a model-loader dependency or increasing primitive detail does not complete that work. Record the chosen asset route and licenses before integration.
- **Persistent state increases complexity.** Decide ownership of reservations, queue positions, route progress and save snapshots before implementing each controller. One system must be authoritative for each value.
- **Acceleration can break physics.** Use bounded substeps/event processing and separate debug seeking from real simulation. Test skipped block boundaries and avoid uncontrolled catch-up loops at 60×.
- **Streaming must preserve collisions and navigation.** Unloaded rendering must not erase logical routes or remove the player's required collision region. Prefetch connector destinations, especially lift landings.
- **Visual improvements increase cost.** Profile draw calls, animation, texture memory and allocation churn. Choose budgets from a measured representative scene; do not remove occupied students silently to satisfy FPS.
- **Old saves may place the player inside changed geometry.** Preserve IDs where possible; migrate invalid positions to a documented safe anchor with user-visible feedback.

## 12. Definition of delivery

Deliver the integrated source change, asset/provenance manifest, save migration fixtures, browser scenarios, before/after views, performance captures and updated acceptance documentation. State precisely which spaces meet the visual standard and which remain intermediate. Tie all evidence to the same tested commit.

The milestone succeeds when TEMHS visibly operates as a school: its spaces support its occupants, its occupants behave for understandable reasons, and their progress survives time, distance and reloads. That is the foundation for the much larger six-level campus.
