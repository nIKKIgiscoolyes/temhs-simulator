# TEMHS Simulator

A Babylon.js / TypeScript / Vite first-person simulation of Travis Elementary Middle High School, set in September 2026.

**Expansion alpha 0.2.** Six playable levels and a substantially enlarged campus. This remains a procedural alpha, with GPU visual acceptance and production crowd quality still open.

## Run

Node.js 22 or later:

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
```

Use a desktop browser with WebGL and hardware acceleration. A reduced CPU compatibility preview is available when WebGL is unavailable; its simplified lighting and low resolution are not representative of GPU rendering.

## Explore

- Floors 1/2 use modern 2021 materials; Levels -1 through -4 use occupied, remediated 1978 architecture.
- Five connected districts per level: Central, North, East, West and North Extension. The footprint reaches approximately 430 metres northward and 220 metres across.
- 180 instructional rooms, 24 support rooms, commons, concourses, 25 interlevel stair flights and five six-stop lift banks. Nearby classroom districts load and unload while logical state persists.
- Subject equipment includes microscopes, technology workstations, chemistry trays, archival material and art desks. Support spaces include faculty workrooms, student services, restrooms and reading rooms.
- 2,880 scheduled students have persistent physical journeys. Identity generation supports 30,000; the remaining population is not fully simulated. GPU detail tiers draw up to 64/112/160 nearby students; compatibility mode draws 14.
- Original articulated animal characters have jointed limbs, seated poses, clothing, backpacks, facial features and species variation. Teachers and 18 support staff have role-specific presentation.
- Seven academic Pulses, thirteen-day cycles, staggered Passage releases, meal cohorts, terminal release, conservative local yielding, late arrivals and staged NPC lift queues.
- Version 2 local saves retain journeys, queues, clock, observer position and doors. Version 1 saves migrate by reconstructing student state.
- Opt-in original synthesized ventilation, crowd ambience, footsteps and bell tones.

## Controls

| Action | Control |
| --- | --- |
| Walk / brisk walk | WASD / Shift |
| Look | Mouse or arrow keys |
| Release mouse | Esc |
| Interact | E |
| Map | M |
| Schedule | T |
| Diagnostics | F3 |

The map includes observer travel to every district and level without changing student journeys. Controls includes save/load, ambience, graphics, clock speed and Guided Passage. Exact clock times and room numbering are implementation defaults, not new canon.

## Validation and limits

22 automated tests and the production build pass. The browser was used to inspect the upgraded classroom, Floor 2 east wing, Level -4 north extension, wayfinding and local saving. The QA browser lacks WebGL, so PBR lighting, shadows and GPU frame rate remain unverified. No 60 FPS or production visual approval is claimed.

Movement uses waypoints and conservative yielding, not a navigation mesh or complete crowd solver. NPC lift service is a staged approximation, distinct from the observer cabin. Social groups, supervision and meal activity remain simplified; teachers do not yet transfer between rooms. The original geometry is improved but is not a finished semi-realistic character asset pipeline. See `docs/ACCEPTANCE.md` for remaining gates.

Original uploaded images and instructions remain reference-only and are excluded from public project files.
