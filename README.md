# TEMHS Simulator

A Babylon.js / TypeScript / Vite first-person simulation of Travis Elementary Middle High School, set in September 2026.

**Living campus alpha 0.3.** Six playable levels and a substantially enlarged campus. This remains a procedural alpha, with GPU visual acceptance and production crowd quality still open.

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
- Seven academic Pulses, thirteen-day cycles, staggered Passage releases, meal cohorts, terminal release, conservative local yielding, late arrivals and shared NPC/observer lift queues with capacity and door interlocks.
- Version 3 local saves retain journeys, shared cabins, closures, teacher/staff routines, clock, observer position and doors. Versions 1 and 2 remain accepted.
- Lesson activities progress through listening, discussion, reading/writing/typing and packing. Teachers circulate and manage release; custodians follow cleaning routines.
- The classroom directory uses live walking routes. A TMAP inspection closure reroutes journeys around the central stair.
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

32 automated tests and the production build pass. CPU-rendered classroom inspection covers the seminar room, biomed lab and civic archive. The current browser preview was blocked, so new UI interaction, GPU lighting and frame rate remain unverified. No 60 FPS or production visual approval is claimed.

Movement uses physical waypoints and conservative yielding. Complete crowd collision avoidance, social groups, meal capacity and production character assets remain future work. The 2,880-agent population probe is a CPU simulation check, not a rendering benchmark. Large local saves may approach browser storage limits. See `docs/ACCEPTANCE.md` for evidence and remaining gates, and `docs/IMPLEMENTATION_BRIEF.md` for phased engineering priorities.

To reproduce CPU inspection and the population probe after `npm ci` (esbuild is installed through the locked Vite dependency):

```sh
mkdir -p test-results
./node_modules/.bin/esbuild scripts/capture-scenes.ts --bundle --platform=node --packages=external --format=esm --outfile=test-results/capture-scenes.mjs
node test-results/capture-scenes.mjs
./node_modules/.bin/esbuild scripts/probe-population.ts --bundle --platform=node --packages=external --format=esm --outfile=test-results/probe-population.mjs
node test-results/probe-population.mjs
```

Original uploaded images and instructions remain reference-only and are excluded from public project files.
