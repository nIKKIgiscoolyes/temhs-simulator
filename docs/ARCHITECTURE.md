# Architecture — expansion alpha 0.2

## System boundaries

- `GameClock` owns operational blocks and the thirteen-day cycle; exact timings remain editable implementation defaults.
- `campus/plan.ts` defines six levels, five districts, 180 instructional rooms and 24 support rooms. The original eighteen room IDs, coordinates and record order are preserved.
- `NPCScheduler` owns deterministic identities and assignments. Its legacy analytic sampling remains for regression checks; the live application uses `CampusSimulation`.
- `CampusSimulation` advances 2,880 persistent records independently of render visibility. Records retain positions, waypoints, targets, release times, lift stages and waiting time. Movement is subdivided into steps no longer than 0.35 simulation seconds, with a spatial hash for conservative local yielding. Late students continue travelling into the next Pulse.
- `RoutePlanner` builds physical corridor/stair/interdistrict waypoints. Its generic closure-aware shortest-path helper is tested separately; live campus routes do not yet support arbitrary closures.
- `Environment` streams nearby classroom districts, preserves door state and disposes remote district geometry and sign textures. Connector geometry persists by floor. Immutable room and stair meshes are merged by material; doors remain interactive.
- `Avatar` constructs original anatomical forms, clothing and species features with hierarchical joint animation. Render limits are 64/112/160 students on GPU or 14 in compatibility mode. Teachers are instantiated near the observer; student objects still churn at visibility boundaries.
- `Atmosphere` synthesizes original noise and tones through opt-in WebAudio. There are no recordings, voices or runtime media downloads.
- `main.ts` coordinates observer input, UI, lifts, scene lighting, visible agents and saves.

## Spatial design

The fixed plan repeats five instructional districts across levels 2, 1, -1, -2, -3 and -4. An east–west concourse at z=140 joins the side districts, while a north spine joins the central districts. The northernmost stair tower reaches about z=430. Each district contains six classrooms per level and a six-stop observer lift; 25 physical flights connect adjacent elevations. NPCs use their source district stairs or a staged central lift journey.

New classroom districts are loaded in small increments with distance hysteresis. Save restoration, observer travel and lift selection explicitly prepare destination geometry before placement. Persistent student and door state survives sector unloading.

## Behaviour and saves

Passage releases are staggered by seat and cohort. Holds retain physical positions. Local yielding slows followers and gives space to the observer; this is not reciprocal collision avoidance. Meal waves travel to commons, then return to class; terminal release routes go to district exits. These are simplified routines and can produce crowded shared destinations.

Version 2 saves serialize locomotion alongside the existing player, clock and door state. Version 1 remains accepted and reconstructs student journeys. The browser storage key falls back to the old version when necessary. Malformed points, paths and unknown room IDs are rejected. Relationships, outages and construction closures are not persistent features yet.

## Rendering and validation

The GPU path uses Babylon PBR materials, procedural surface textures, directional and room lighting and FXAA. A NullEngine-based CPU preview rasterizes the same geometry with a depth buffer when WebGL is unavailable. It deliberately uses simplified illumination and reduced resolution; it cannot establish PBR, shadow or GPU performance acceptance.

The Babylon vendor bundle remains large (approximately 6 MB uncompressed). Real GPU profiling, crowd churn reduction and production material/character work remain necessary.
