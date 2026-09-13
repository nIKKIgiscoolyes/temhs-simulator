# Architecture — living campus alpha 0.3

## System boundaries

- `GameClock` owns operational blocks and the thirteen-day cycle; exact timings remain editable implementation defaults.
- `campus/plan.ts` defines six levels, five districts, 180 instructional rooms and 24 support rooms. The original eighteen room IDs, coordinates and record order are preserved.
- `NPCScheduler` owns deterministic identities and assignments. Its legacy analytic sampling remains for regression checks; the live application uses `CampusSimulation`.
- `CampusSimulation` advances 2,880 persistent records independently of render visibility. Records retain positions, waypoints, targets, release times, lift stages and waiting time. Movement is subdivided into steps no longer than 0.25 simulation seconds, with a spatial hash for conservative local yielding. Late students continue travelling into the next Pulse.
- `RoutePlanner` builds physical corridor/stair/interdistrict waypoints. The live graph supports closed stair edges and supplies the directory and student routes.
- `Environment` streams nearby classroom districts, preserves door state and disposes remote district geometry and sign textures. Connector geometry persists by floor. Immutable room and stair meshes are merged by material; doors remain interactive.
- `Avatar` constructs original anatomical forms, clothing and species features with hierarchical joint animation. Render limits are 64/112/160 students on GPU or 14 in compatibility mode. Teachers are instantiated near the observer; a bounded dormant `AvatarPool` reuses student objects across visibility boundaries.
- `Atmosphere` synthesizes original noise and tones through opt-in WebAudio. There are no recordings, voices or runtime media downloads.
- `main.ts` coordinates observer input, UI, lifts, scene lighting, visible agents and saves.

## Spatial design

The fixed plan repeats five instructional districts across levels 2, 1, -1, -2, -3 and -4. An east–west concourse at z=140 joins the side districts, while a north spine joins the central districts. The northernmost stair tower reaches about z=430. Each district contains six classrooms per level and a six-stop observer lift; 25 physical flights connect adjacent elevations. NPCs use graph-planned stairs or shared district lifts. `LiftController` owns cabin position, capacity, queue order, slots and interlocks for both students and the observer.

New classroom districts are loaded in small increments with distance hysteresis. Save restoration, observer travel and lift selection explicitly prepare destination geometry before placement. Persistent student and door state survives sector unloading.

## Behaviour and saves

Passage releases are staggered by seat and cohort. Holds retain physical positions. Local yielding slows followers and gives space to the observer; this is not reciprocal collision avoidance. Meal waves travel to commons, then return to class; terminal release routes go to the ground-level central exit. These are simplified routines and can produce crowded shared destinations.

Version 3 saves serialize shared lift reservations, closures, locomotion and teacher/staff records alongside observer, clock and doors. Versions 1 and 2 remain accepted; old virtual lift journeys replan from a safe landing. Save validation checks finite coordinates, identities, room references, capacity and reservation phases. Local storage quota remains a practical limit.

`ClassroomController` derives student activities from the clock and advances persistent teacher aisle routes. `StaffController` owns custodial and inspection routines. Both update independently of render visibility. `Wayfinding` shares the routing graph; `main.ts` owns UI, observer motion and presentation without duplicating lift movement.

## Rendering and validation

The GPU path uses Babylon PBR materials, procedural surface textures, directional and room lighting and FXAA. A NullEngine-based CPU preview rasterizes the same geometry with a depth buffer when WebGL is unavailable. It deliberately uses simplified illumination and reduced resolution; it cannot establish PBR, shadow or GPU performance acceptance.

The Babylon vendor bundle remains large (approximately 6 MB uncompressed). Real GPU profiling and production material/character work remain necessary.

## Alpha 0.4 ownership changes

`StairCore.ts` owns permanently present circulation envelopes and return floors. These objects are not removed with classroom sectors. `Facilities.ts` owns six connected east-concourse wings; their floor visibility follows the connection layer. Static batches preserve collision flags while reducing mesh count.

`campus/plan.ts` supplies stable facility identifiers, footprints and pseudo-room routing endpoints. `Wayfinding` resolves classrooms and facilities through the same route planner. A bounded dining cohort routes into the new hall; supervisors traverse the east concourse to explicit duty stops. The broader meal and crowd systems remain simplified.

`SaveRepository.ts` serializes IndexedDB transactions. Legacy v1/v2/v3 local-storage snapshots migrate on load and remain untouched. UI export/import uses validated JSON snapshots. `SaveSystem.ts` remains the schema/validation layer. fake-indexeddb is a test-only dependency.

Textured boxes map UV coordinates according to face dimensions. CPU inspection now repeats PBR textures and applies approximate face shading. GPU presentation adds a bounded local character-shadow pass; it has not been visually validated on a GPU in this environment.
