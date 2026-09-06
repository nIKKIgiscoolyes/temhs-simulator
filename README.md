# TEMHS Simulator

A Babylon.js / TypeScript / Vite first-person simulation of Travis Elementary Middle High School. September 2026 canon is preserved in `docs/canon/`.

**Status: ALPHA vertical slice; not the completed six-floor simulator.**

## Run

Node.js 22 or later and npm:

```sh
npm ci
npm run dev
```

Open the local address printed by Vite in a desktop browser with WebGL2 and hardware acceleration enabled.

```sh
npm test
npm run typecheck
npm run build
```

## Current implementation

- Three connected development sections: Floor 1 (2021), Level -1 and Level -2 (1978).
- Eighteen furnished instructional rooms, institutional corridors, stair flights, a passenger lift, access-controlled utility boundaries, signs and TMAP notices.
- First-person movement, mouse/arrow-key look, door/lift/citizen interaction, map, schedule and graphics controls.
- Editable seven-Pulse / thirteen-day schedule, Homing, Passage, staggered meals and terminal release.
- Deterministic identity capacity for 30,000 students; **288 students have slice schedules**. The rest are identity definitions, not a completed 30,000-person institutional simulation.
- Original simplified animal rigs; seated work, walking and teacher gesture/circulation proxies.
- Logical state independent of rendered meshes. Student destinations can be reconstructed at any clock position, including after unloading and reloading an area.
- Browser-local saves with schema validation. No cloud services or live LLM calls are needed at runtime.

## Controls

| Action | Control |
| --- | --- |
| Walk | WASD |
| Brisk walk | Shift |
| Look | Mouse; arrow keys also work |
| Release mouse | Esc |
| Interact | E |
| Map | M |
| Schedule | T |
| Diagnostics | F3 |

The Controls panel includes **Guided Passage**, which places the observer behind a class shortly before its first release and advances the clock at 10×. Time controls are development conveniences. The master clock JSON is explicitly non-canon.

## Important limitations

This is an engineering slice, not a production-ready school. Floor 2, Levels -3/-4, the full several-hundred-metre wings, production character assets, elevator queues for NPCs, robust local crowd avoidance, full social relationships, detailed staff workflows and the complete school population remain unfinished. NPC cross-floor routes currently use stairs, while the player can use the lift. Movement is schedule-derived; visible-agent avoidance and delayed-arrival recovery need a stateful locomotion layer before expansion.

The cloud QA browser could not reach the running preview (`ERR_BLOCKED_BY_CLIENT`). Therefore no visual approval, end-to-end movement verification, real GPU performance result, or full vertical-slice acceptance is claimed. The contract requires this gate before large-floor construction, so the larger campus has not been fabricated around an unverified slice.

See `docs/BUILD_LOG.md`, `docs/ARCHITECTURE.md`, and `docs/ACCEPTANCE.md` for evidence and next steps.
