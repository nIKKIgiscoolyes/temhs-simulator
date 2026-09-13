# Acceptance — expansion alpha 0.2

| Gate | Result | Evidence / limit |
| --- | --- | --- |
| Automated tests | PASS | 22 tests: schedules, identity, routes, holds, saves, continuous travel, meals/release, doors, geometry and streaming |
| Type checking and production build | PASS | TypeScript and Vite build; vendor size warning remains |
| Six-level expansion | IMPLEMENTED | 180 instructional and 24 support rooms; five districts per level, stairs, lift banks and concourses |
| Deep sector loading | PASS | Test loads Level -4 extension, verifies floor support, restored door state and old-sector disposal |
| Classroom visual inspection | PASS in compatibility mode | Inspected furnished upgraded Level -2 classroom and original articulated characters; teacher placement corrected |
| Expanded floor inspection | PASS in compatibility mode | Inspected Floor 2 east corridor and Level -4 north extension through observer navigation |
| Save/load | PASS in logic and compatibility UI | Version 2 round trip and v1 migration tested; browser reports local save and restore success |
| Delayed arrivals and holds | PASS | Positions remain continuous across Pulse boundaries and holds |
| Meal and terminal release | LOGIC PASS | Routes start from existing positions and point to commons/exits |
| Physical crowd fidelity | PARTIAL | Local yielding and staggered release exist; no complete collision/queue solver or social simulation |
| NPC lifts | IMPLEMENTED approximation | Staged waiting, hidden cabin travel and persistent state; independent of observer lift |
| Observer stairs/lifts | IMPLEMENTED; full traversal QA OPEN | Destination geometry prepared before arrival; all-floor ride/walk coverage still required |
| Audio | IMPLEMENTED; listening QA OPEN | Opt-in synthesized ambience, footsteps and tones |
| GPU visual fidelity / 1080p performance | NOT VERIFIED | QA browser has no WebGL; compatibility screenshots cannot validate GPU lighting or frame rate |
| Publication hygiene | PASS before push | 41 candidate files audited by path and original-upload content hashes; publication descends only from sanitized public alpha |

This milestone is an expansion alpha. It is not a declaration that the full requested realism or production acceptance standard has been met. Character production quality, advanced social and staff workflows, complete crowd collision handling, all-route traversal and GPU visual/performance checks remain open.
