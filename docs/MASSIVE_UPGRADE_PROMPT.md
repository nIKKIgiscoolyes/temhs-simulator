# TEMHS — major campus and realism upgrade implementation prompt

Act as the lead engineer, technical artist and simulation designer for `nIKKIgiscoolyes/temhs-simulator`. Implement a substantial next milestone in the existing game. This is an execution request: inspect, implement, run, diagnose, verify and document the changes. Do not finish with a plan alone or treat additional room counts as completion.

## Starting point and evidence

The last publication verified in this conversation was alpha 0.3, public commit `bab2132841bc2c5e4e1a369185459281c839d4cd`. Read the current remote before working; preserve subsequent changes. Local equivalents may have different commit IDs because publication used GitHub's commit API. Compare trees and ancestry before synchronizing; do not reset or overwrite user work.

The existing implementation has six playable levels (2, 1, -1, -2, -3, -4), five districts per level, 180 instructional rooms, 24 support rooms and 2,880 scheduled students. The 30,000 figure is identity capacity, not 30,000 fully simulated people. Preserve shared NPC/observer lifts, live routing, closures, persistent classroom/staff routines and v3 save compatibility.

Inspect the three attached screenshots as the current visual baseline. If attachments are unavailable, report that limitation and use these observations without pretending to have loaded the images:

- Classroom: flat beige illumination, visibly repetitive or stretched floor patterns, elementary geometric character anatomy, repetitive furniture and oversized-looking personal items. Characters lack convincing contact with furniture and visually coherent clothing.
- Corridor: a long repeated tunnel with limited spatial identity, flat surfaces, small repeated locker banks and insufficient architectural detail. Assess corridor proportions against actual movement requirements before changing dimensions.
- Stairwell: open pale-blue voids, exposed stacked slabs, disconnected-looking rails and signs visible from their backs. This is a serious visual integrity problem. Diagnose missing enclosure, mesh orientation, streaming, clipping and renderer behavior independently; the screenshot alone does not prove the cause.

Do not infer frame rate, active renderer or successful collision handling from screenshots. Log whether the session uses WebGL or CPU compatibility rendering. Both must remain intelligible, but CPU images do not verify GPU lighting.

## Delivery objective

Deliver a coherent, detailed, functioning school that feels substantially more believable at normal first-person viewing distance. Combine structural repair, material and lighting improvements, better characters, a richer school day and meaningful new destinations. Preserve the six-level campus and expand its usable facilities rather than merely extending identical corridors.

Use semi-realistic anthropomorphic school characters, grounded architecture and restrained environmental detail. Do not promise photorealism from procedural primitives. Prioritize strong silhouettes, plausible scale, convincing materials, controlled lighting and consistent visual quality.

## Canon and scope constraints

Read repository canon and the existing implementation brief first. Floors 1 and 2 were built in 2021. Underground levels were built in 1978 and are occupied, remediated educational spaces: maintained older construction, not an abandoned horror bunker. Retain established school terminology, scheduling and accessibility provisions. Separate established canon from new implementation defaults. Do not invent named staff biographies or precise school statistics as established facts.

Retain current playable levels. The wider campus may be represented through signs and future-access boundaries, but do not claim inaccessible floors are simulated. Maintain anthropomorphic species diversity and account for body size in doors, seats, routes and lift capacity. Where extreme canon sizes cannot fit the playable section, explicitly represent an appropriate accessible route or scoped limitation instead of clipping bodies through architecture.

## Required extensive graphics overhaul

The user explicitly requires extensive graphics upgrades that make the game look actually good. Treat this as a core deliverable with dedicated implementation effort and visual acceptance criteria. Small color adjustments, extra props, a lighting preset or an increased room count do not fulfill this requirement. Rework the visual systems and assets responsible for the current unfinished appearance.

- **Rendering foundation:** inspect the active rendering path, color space, tone mapping, exposure, antialiasing, texture filtering, resolution scaling and lighting configuration. Correct underlying problems before adding effects. Keep a clear renderer/quality diagnostic so reduced compatibility graphics cannot be mistaken for the intended appearance.
- **Lighting overhaul:** create balanced room lighting, soft contact and cast shadows, believable daylight where available, and coherent indoor illumination. Evaluate ambient occlusion and baked or otherwise efficient indirect-light approximations where supported. Prevent glowing faces, washed-out surfaces, detached-looking furniture, excessively dark corners and abrupt lighting transitions between sectors.
- **Material overhaul:** replace visibly weak procedural surfaces with high-quality, consistently authored materials. Use appropriate base color, roughness, normal and metalness information with measured texture scale. Improve masonry, flooring, ceilings, wood, painted metal, glass, clothing and character surfaces together. Preserve a clean, maintained school appearance.
- **Model overhaul:** materially improve character meshes, furniture, doors, stairs, lockers, fixtures and teaching equipment. Add coherent silhouettes, beveled edges where visible, believable thickness and properly aligned details. Use original or suitably licensed assets when available. Increasing tessellation on the same primitive shapes is not sufficient.
- **Animation polish:** blend actions, eliminate obvious foot sliding and joint separation, align hands and feet with nearby surfaces, and use calm expressions and varied attention. Review moving footage, not just carefully selected still frames.
- **Visual composition:** give each major space an intentional palette, focal points, architectural rhythm and readable circulation. Make the school feel welcoming and occupied. Avoid sterile repetition, unsettling faces, empty voids and oversized featureless spaces.
- **Image quality and performance:** maintain sharp, stable images at normal viewing distances. Use suitable mipmaps, texture filtering, antialiasing and level-of-detail transitions. Budget textures, lights, shadows and meshes against measured performance. Bloom must be restrained; blur, fog, depth of field, film grain and camera effects must not conceal unresolved defects.

Establish a representative classroom, corridor and stairwell as visual benchmarks. Iterate until they demonstrate a substantial improvement over the supplied screenshots, then apply the validated visual standard throughout existing and newly added areas. Do not leave most of the campus at the old quality while presenting a single showcase room as a complete graphics overhaul.

Required evidence: matching-camera before/after views for all three benchmark spaces, character close-ups, views from both architectural eras, and a motion sequence showing walking and classroom activity. Record renderer, resolution and quality settings. Assess structural completeness, material scale, lighting depth, model coherence, animation contact and welcoming atmosphere separately. Document remaining visual defects honestly. Passing code tests alone cannot satisfy graphics acceptance, and unavailable GPU verification must remain explicitly pending.

## Mandatory art direction — believable, welcoming and visibly transformed

The user's central requirement is a major improvement in perceived realism. The current screenshots feel unsettling and artificial to the user. Treat that reaction as a primary design problem, not something solved by adding more rooms or increasing polygon counts. Deliver a school that feels occupied, cared for, comfortable and socially natural. Aim for a polished semi-realistic school simulation with appealing anthropomorphic characters. Maintain realistic architecture and materials while deliberately art-directing character faces to avoid the uncanny valley.

### Characters: highest visual priority alongside structural repairs

- Rework the entire character silhouette and face construction. A few extra spheres, accessories or texture changes are insufficient. Remove the visibly disconnected oval limbs, balloon-like joints, mitten-like appendages and stiff mannequin stance evident in the baseline.
- Design continuous torso, shoulders, elbows, hips, knees and ankles with believable transitions. Clothing should read as garments with shape, thickness, seams, cuffs and restrained folds rather than colored body segments. Hands and shoes must have intentional shapes.
- Establish species-specific face designs with coherent muzzle placement, eyelids, restrained eye size, gaze direction and neutral expressions. Avoid bulging eyes, frozen wide-eyed staring, oversized identical pupils and permanently exaggerated smiles. Do not add realistic skin or fur detail to an unresolved cartoon face and call it realism.
- Use restrained fur detail and groomed silhouettes. Avoid noisy hair layers or excessive sharp tufts. Ears, antlers and tails must fit the species and remain clear of nearby furniture and people.
- Give students and adults distinct age-appropriate proportions, posture and clothing. Vary body builds and outfits within a coherent school setting. Teachers should read as adults through design and behavior, not merely scaling up a student.
- Add subtle breathing, occasional blinking, natural gaze shifts, weight shifts and task-specific attention. Students should usually look toward their work, teacher or conversation partner. They must not all turn toward or track the observer.
- Create natural transitions between standing, walking and sitting. Hands should contact desks, books or keyboards when performing those actions. Feet should contact the floor or an appropriate foot support. Bags should hang from hooks, rest beside seats or be worn correctly rather than float as repeated rectangular blocks.
- First build and inspect a representative student, teacher and contrasting species at close, medium and classroom distances. Approve the visual approach against this brief before propagating it across the population. This is an engineering/art review, not a requirement to interrupt the user for routine permission.

### Architecture: a recognizable school, not an endless empty maze

- Establish believable dimensions using a documented meter scale and representative character clearances. Check door heights, desk heights, chair depth, lockers, ceiling height and stair proportions together. Provide clearly designed larger-species accommodations rather than making every room feel cavernous.
- Break up long corridors with departmental entrances, framed displays, seating alcoves, drinking fountains, believable locker runs, interior glazing, clocks, room-number systems and visible destinations. Furnish intentionally; random clutter is not realism.
- Create distinct spatial sequences: entrance, reception, public circulation, departmental corridor, classroom threshold and teaching space. Make the observer understand where they are without relying entirely on a HUD.
- Give major rooms authored compositions and purposeful furniture arrangements. Desks need believable construction and useful work surfaces; classrooms need teaching walls, storage, circulation and evidence of a particular subject.
- Make underground areas feel like maintained 1978 school interiors with current repairs and equipment. Use clean painted masonry, resilient floors, acoustic ceilings where appropriate, comfortable artificial lighting and organized services. Do not introduce decay, mold, threatening darkness, abandoned clutter or flickering horror lighting.
- Modern floors should feel newer through construction, daylight access, glazing and acoustic treatments. Preserve visual continuity through school colors, signage and furniture standards.

### Lighting and materials: comfortable depth and clear surfaces

- Replace the pervasive flat beige appearance with a coordinated palette: warm neutral walls, restrained school-color accents, believable wood tones, muted locker colors and distinguishable floor materials. Avoid arbitrary saturated colors or clinical uniform whiteness.
- Use plausible illumination from actual fixtures and legitimate exterior openings. Add soft grounding/contact shadows and controlled contrast so characters and furniture sit convincingly in the room. Avoid black eye sockets, harsh facial shadows and dramatic horror-style contrast.
- Specify texture scale in meters. Floor patterns, masonry joints, wood grain and fabric weave must remain plausible at walking distance. Eliminate stretched streaks, excessive speckling, visible tiling and texture noise that resembles dirt.
- Improve glass, metal and painted finishes with appropriate roughness; avoid making every floor glossy. Add subtle wear at believable contact areas while keeping occupied spaces clean and maintained.
- Diagnose the renderer on the user's machine. If compatibility rendering contributes to the appearance, explain that in diagnostics and improve its readability; do not silently label it high-quality GPU rendering. Make the full GPU path the visual target and keep fallback limitations explicit.

### Everyday activity and sound: a comfortable occupied school

- Populate appropriate public spaces with purposeful activity: students checking a noticeboard, briefly using lockers, reading in the library, waiting at reception and conversing in small groups. Distribute activity by schedule and capacity rather than randomly filling every corridor.
- During lessons, include natural variation within the task: reading, note-taking, looking up, occasional hand raises and teacher movement. Avoid synchronized idle loops and rows of motionless staring faces.
- Add restrained, optional spatial sound: ventilation, distant school activity, footfalls suited to surfaces, occasional chair movement and appropriate bell tones. Avoid ominous drones, loud looping murmurs, sudden unexplained sounds or unintelligible close-up pseudo-speech. Preserve a mute option and obey browser audio restrictions.
- Improve camera comfort: sensible eye height and field of view, smooth input, stable vertical motion and optional/reduced head bob. Do not use camera shake or exaggerated wide-angle distortion to make the campus seem larger.

### Visual acceptance is a milestone gate

Create a visual checklist and compare matching-camera captures against the supplied screenshots. Verify all of the following explicitly:

1. The stairwell reads as a complete enclosed structure, with no unintended voids or disconnected components.
2. A close-up character reads as an intentionally designed student or adult, with coherent joints, clothing and a calm neutral face.
3. A full classroom shows plausible furniture scale, grounded seated poses, varied attention and useful teaching detail.
4. A corridor reads as a maintained school with clear destinations and spatial variety.
5. Modern and underground areas are distinct, both comfortable and occupied rather than unsettling.
6. Lighting grounds objects, materials have correct scale, and no major repeated artifact dominates the view.
7. A short motion sequence demonstrates natural walking, turning, sitting and classroom activity; still screenshots cannot establish animation quality.

Self-review and revise obvious failures before release. Do not claim the subjective reaction is guaranteed, and do not call the realism milestone visually accepted without actual rendered evidence. If only CPU inspection is possible, mark GPU acceptance pending. Structural and simulation improvements may be delivered, but must not be presented as completion of the requested visual transformation.

## Phase 1 — structural integrity and trustworthy movement

Start with `src/architecture/Environment.ts`, `src/campus/plan.ts`, `src/navigation/RoutePlanner.ts`, `src/navigation/LiftController.ts` and observer movement in `src/main.ts`.

1. Build complete stair cores: enclosing walls, correctly sized slab openings, landings, continuous rails and guards, soffits, door frames, floor numbers, lighting and collision geometry. Underground stair cores must not reveal outdoor sky through unintended gaps. Preserve real travel between floors.
2. Diagnose the screenshot's apparent missing geometry. Fix the actual cause. Do not globally disable back-face culling, hide voids with excessive fog, or add invisible blockers over defective architecture.
3. Separate persistent structural shells from streamed furnishings so looking across a stair core cannot expose unloaded campus interiors. Keep destination floor support available before an observer or NPC arrives.
4. Align routes, doors, furniture and body clearances. Add meaningful clearance checks beyond centerline raycasts. Cover turning space, headroom, rail alignment and large-species routes.
5. Verify observer stairs and shared lift boarding physically. Prevent falls through seams, uncontrolled sliding, cabins passing closed landing doors and routes entering inaccessible shafts.
6. Give signs correct mounting, orientation and readable type. Use opaque backing for one-sided signs and deliberately authored reverse faces when appropriate.

Acceptance: all five lift banks and all 25 interlevel stair flights have continuous support and appropriate enclosure; no unintended sky/void is visible from underground circulation; representative body-sized traversal succeeds; closures still yield a physically usable alternative or an explicit unreachable result.

## Phase 2 — comprehensive environment art pass

Refactor `Environment.ts` into maintainable modules such as `src/architecture/StructuralShell.ts`, `StairCore.ts`, `RoomLayouts.ts` and `src/rendering/MaterialLibrary.ts` where that improves ownership. These are proposed modules, not assertions that they already exist.

- Establish world-scale texture mapping. Eliminate stretched floor grain, noisy oversized terrazzo and repeated patterns that change scale between meshes. Use restrained albedo, roughness and normal detail; obtain or generate appropriate assets and record provenance.
- Distinguish terrazzo, vinyl tile, sealed concrete, painted blockwork, wood, metal, glass, fabric and acoustic panels. Avoid uniformly beige materials and uniformly reflective floors.
- Model credible wall thickness, door reveals, skirting, threshold strips, glazing frames, ceiling systems, vents, service access and fixture housings. Do not scatter arbitrary pipes as decoration.
- Modern floors: daylight where exterior geometry allows it, glazing, contemporary acoustic treatments, durable school furniture, integrated wayfinding and coherent teaching technology.
- Underground floors: painted masonry, period structural rhythm, remediated finishes, newer lighting/services within older construction, documented repairs and selective modernization. No exterior windows into solid ground.
- Replace universal desk rows with at least six functional classroom layouts: seminar, general teaching, biology/biomed, technology, art and civic archive. Maintain accessible aisles and real seat ownership.
- Add purposeful classroom detail: teacher station, storage, displays, subject equipment, books, papers, bins, clocks and bags positioned in plausible places. Set clutter budgets; details must not obstruct movement.
- Improve light balance, exposure, shadows and contact. Bound shadow casters and room lights. Use daylit modern areas and credible artificial underground lighting without washing out all surfaces.

Acceptance: matching-camera before/after images show clear material and architectural improvement in the classroom, corridor and stairwell; six layouts are physically usable; signage is legible at intended distances; no major texture stretching, floating props or visible structural intersections.

## Phase 3 — character reconstruction and animation

Work through `src/npc/Avatar.ts`, `src/rendering/AvatarPool.ts` and a new asset/animation layer as needed.

Replace the obvious disconnected oval/capsule appearance with coherent bodies, integrated joints, shaped clothing, better heads/muzzles, ears, tails, hands and footwear. Preserve recognizable species silhouettes, age-appropriate appearance and deterministic identity. Improve face proportions and restrained eye/head movement; avoid huge identical eyes across species.

Prefer licensed or original rigged glTF assets when suitable tools and assets are available. Check license and redistribution terms before including third-party files. If an authored asset pipeline is unavailable, improve generated meshes honestly and label the remaining quality gap. Do not describe basic procedural models as production characters.

Implement blended idle, walking, turning, sitting, standing, listening, reading, writing, typing, packing and teaching actions. Derive stride from actual movement; keep feet grounded, hands aligned with tasks and seated hips aligned with furniture. Use size-aware seating and equipment placement. Stagger gestures and gaze so the class does not animate in synchrony.

Acceptance: close, medium and full-class views show coherent anatomy; sitting/standing transitions avoid desk penetration; feet do not visibly skate during representative walking; identity and appearance survive streaming and save/load. Verify animation under pause, slow time and accelerated time.

## Phase 4 — a richer operational school day

Extend `CampusSimulation.ts`, `ClassroomController.ts`, `StaffController.ts`, scheduling and shared transport without duplicating ownership of position or time.

- Students arrive, navigate aisles, settle, use learning materials, participate selectively, pack, stand and leave in plausible order. Delayed students continue their actual journey after the bell.
- Teachers use board/front/aisle positions, supervise independent work, respond to arrivals and manage dismissal. Board content must relate to the class and lesson phase.
- Add bounded persistent peer groups and conversations at appropriate times. Use proximity, duration and interruptible schedules; do not replace every student's goal with random wandering.
- Add body-aware local avoidance and door/landing queues, with deadlock detection and deterministic recovery. Use spatial indexing. Never recover by silently teleporting students to class.
- Assign real meal/service destinations with capacity and waiting positions. Custodians and facilities staff carry out specific routes and tasks without blocking passage indefinitely.
- Expand interaction with readable identity/action information, room schedules and useful contextual actions. Avoid placeholder buttons and repeated notifications.

Acceptance: follow the same student through an entire lesson–Passage–next-lesson cycle; test a held release, closed stair, delayed lift and busy doorway; save during transit and resume without losing identity, reservations or teacher/staff state. All destinations have defined behavior when full or unreachable.

## Phase 5 — substantial campus expansion with purpose

Add connected, furnished, navigable facilities within the six-level campus: a main entrance/reception hub, library/media center, cafeteria with serving/queue/seating areas, student-services suite, larger science/technology area, and gym with associated circulation/changing facilities. Create genuine room layouts and operating roles for all six facility types. Reuse an existing support space where appropriate and enlarge it only where the plan supports it.

Create spatial variety through intersections, departmental thresholds, widened gathering areas, appropriate sightlines and deliberate landmarks. Every added area must have structural enclosure, lighting, collision, directory entry, navigation connections and a stated school-day function. At least the cafeteria, library and services hub must receive scheduled or role-driven NPC activity.

Update `campus/plan.ts`, route topology, sector streaming, room directory, schedules and tests together. Do not break stable room IDs or saved destinations. Measure the resulting playable area and room counts from data; report the actual increase. Do not inflate figures with unbuilt placeholders or advertise a full 30,000-student simulation.

Acceptance: all six facility types are reachable through ordinary first-person travel; three have observable NPC use; existing classrooms, lifts and detours still function; expansion does not introduce missing walls or disconnected routes.

## Phase 6 — saves, usability and scale

- Move large persistent snapshots from synchronous local storage to versioned IndexedDB or another appropriate browser store. Migrate existing v1/v2/v3 saves without deleting the original until the replacement is verified. Handle quota and malformed data explicitly. Add export/import for recoverable backups.
- Show save progress/failure accurately and prevent overlapping writes. Autosave must not silently present failure as success.
- Improve the map into a useful floor directory with destination search, current position, route segments, closures and access information. Clearly separate ordinary navigation from observer/debug travel.
- Keep the HUD compact, readable and unobtrusive; retain keyboard controls, pause, quality settings and optional audio. Add sensible settings persistence and input focus handling.
- Profile active meshes, draw calls, simulation cost, animation cost, memory, sector transitions and save duration. Use instancing, shared assets, distance detail and bounded caches where measurement supports them.
- Keep distant citizens logically persistent while limiting presentation cost. Do not update all pairs of NPCs for avoidance.

Acceptance: migration and interrupted/failed writes preserve recoverable data; repeated district crossings do not cause unbounded resource growth; profiling includes a crowded Passage and the new facilities. Target a stable 60 FPS at 1080p on a specified desktop configuration, reporting actual frame-time distributions and quality settings. If the target is missed or GPU access is unavailable, report that clearly instead of claiming acceptance.

## Execution and release requirements

1. Inspect current source, instructions and dependencies; identify the active rendering path and reproduce defects before editing.
2. Record a short milestone plan and baseline captures. Implement the phases in dependency order, with reviewable commits. Structural correctness leads; then character/environment quality and functional expansion.
3. Use focused tests for high-risk behavior: geometry/clearance, lift invariants, scheduling, migration, capacity and streaming. Keep existing tests passing and add actual regression coverage rather than assertions that mirror code.
4. Run the production build and meaningful browser checks. Capture the three original viewpoints plus modern classroom, cafeteria, library and busy Passage views. A GPU recording should show the lesson-to-Passage cycle when GPU access is available. CPU renders must be labeled.
5. Update README, architecture, build log, asset provenance, implementation brief and acceptance record with exact implemented scope and remaining gaps. Do not mark deferred work complete.
6. Original uploaded screenshots and specification attachments remain reference-only and excluded from Git, including commit history. Generated game assets and documentation may be published. Audit intended publication contents.
7. The user has authorized publishing generated simulator upgrades to the public repository's `main` branch. Honor repository requirements and any applicable approval controls; do not force-push or overwrite newer work. Publish the tested result when permitted and verify remote tree contents.
8. Deliver the commit link, run instructions, concise changes, before/after evidence and honest limitations. Continue through implementation rather than stopping after planning or asking routine design questions. If a genuine access/tool limit blocks a phase, complete independent work and identify the precise blocked deliverable.

Definition of done: a materially better-looking, structurally coherent, expanded and functioning campus, demonstrated through actual traversal and simulation evidence. More code, more repeated rooms and passing logic tests alone do not establish that result.
