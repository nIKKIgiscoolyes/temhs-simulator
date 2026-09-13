# Acceptance — campus renewal alpha 0.4

| Gate | Result | Evidence / limit |
| --- | --- | --- |
| Automated regression | PASS | 39 tests across seven suites |
| Type checking / build | PASS | Vite production build; approximately 6 MB Babylon vendor chunk warning remains |
| Stair enclosure | CPU PASS | Side/back enclosure ray checks across all 30 district/level combinations; permanent shells and landing support independent of sector streaming |
| Representative routes | CPU PASS | Existing classroom/cross-floor ray tests and lateral facility entrance probes; not complete capsule sweep or interactive stair traversal |
| Six facility wings | IMPLEMENTED | Six 2,400 m² floor footprints + six 108 m² links = 15,048 m² modeled footprint; all directory routes reach the intended entrance |
| Facility operations | PARTIAL | Saved supervisor duty routes; 72-identity pilot dining cohort with unique seats. Full serving queues, general meal capacity, library student schedules and gym activity remain open |
| Save reliability | LOGIC PASS | IndexedDB migration, ordered writes, invalid import retention, transaction abort recovery tested using fake-indexeddb; real browser quota/UI checks open |
| Graphics | CPU INSPECTED / GPU OPEN | Classroom, corridor, stair and six facility captures. World-scale texture mapping, quieter palette, continuous garment limbs, backed signs and local GPU character shadows implemented |
| Population probe | PASS within scope | 2,880 students, 30 simulation seconds, approximately 510 ms on this host, 2,240,751-byte UTF-8 snapshot. Not a rendering or long-duration benchmark |
| Browser UI / GPU frame rate | BLOCKED | Browser returned ERR_BLOCKED_BY_CLIENT for the local preview. No alternate route used to evade the block |
| Full visual transformation | INCOMPLETE | Character models remain original procedural geometry. Authored rigs, polished animation/contacts, high-quality asset pipeline and comprehensive art review are not complete |
| Full simulation brief | INCOMPLETE | Social groups, robust body-aware avoidance/deadlock recovery and capacity across all meal destinations remain future work |

CPU screenshots verify geometry and approximate material presentation, not PBR lighting, GPU shadows or a stable 60 FPS target. No claim of production realism or user-approved visual quality is made. The six classroom categories currently have differentiated spacing/material/equipment, not six fully reconstructed authored layouts.

Reproduce CPU facility inspection:

```sh
mkdir -p test-results
./node_modules/.bin/esbuild scripts/capture-facilities.ts --bundle --platform=node --packages=external --format=esm --outfile=test-results/capture-facilities.mjs
node test-results/capture-facilities.mjs
```

For desktop acceptance, enter the campus, open Map, select a FAC destination and walk the route. Inspect each stair/lift bank; save and load in transit; export/import a backup; watch a complete lesson/Passage transition. Record renderer, device, resolution, graphics setting and frame-time distribution. Do not mark those checks passed based on the CPU evidence above.
