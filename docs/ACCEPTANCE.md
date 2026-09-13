# Acceptance — living campus alpha 0.3

| Gate | Result | Evidence / limit |
| --- | --- | --- |
| Automated tests | PASS | 32 tests across five suites: schedules, routes, geometry, shared lifts, saves, routines and integrated journeys |
| Type checking and production build | PASS | TypeScript and Vite; approximately 6 MB Babylon vendor chunk still warns |
| Shared lifts | LOGIC PASS | NPCs and observer share capacity, boarding slots, cabin position and door interlocks; queued save resume covered |
| Lesson-to-Passage cycle | LOGIC PASS | Phase-specific activities, teacher circulation/release, continuous late travel, holds and accelerated bell crossing |
| Live routing / TMAP | LOGIC PASS | Active graph detours, unreachable routes and directory destinations tested; central inspection barriers implemented |
| Classroom architecture | CPU INSPECTED | Generated views of F1-101 seminar, B1-104 biomed lab and B2-102 civic archive; signage fitted to panels |
| Route geometry | CPU PASS | Representative classroom/stair routes raycast against solid scene geometry; not full-body collision acceptance |
| Save/load | LOGIC PASS | v3 includes shared lifts, closures, teacher/staff routines; v1/v2 accepted. Old virtual lift positions migrate to a safe landing |
| Scale | CPU PROBE | 2,880 agents advanced 30 simulation seconds in approximately 942 ms; save approximately 2.25 MB UTF-8 / 4.50 MB UTF-16. Host-specific, not a frame-rate benchmark |
| Streaming | IMPLEMENTED | Simulation remains active independently of visibility; bounded dormant avatar cache reduces reconstruction |
| Browser interaction / all-floor traversal | OPEN | Local browser preview blocked in this environment; new controls require desktop smoke testing |
| GPU visuals / 1080p frame rate | OPEN | CPU raster images do not establish lighting, shadow, GPU memory or performance acceptance |
| Audio listening | OPEN | Existing opt-in synthesized audio requires listening QA |

This is a balanced functional alpha, not completion of the production realism brief. Full-body crowd avoidance, social groups, meal capacity, production character assets, extensive staff workflows, all-route traversal and long-duration profiling remain deferred. Teachers circulate within assigned rooms; they do not transfer between rooms. Storage quota varies by browser; large saves and retained legacy entries can exhaust local storage. Manual save reports failures; autosave must not be treated as a backup guarantee.

The existing six-level expansion was preserved. The next realism work concentrates on the original three-level section rather than increasing the footprint further.
