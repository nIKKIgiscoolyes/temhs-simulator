# Build log

## 2026-09-06 — Initial autonomous development session

Inspected `nIKKIgiscoolyes/temhs-simulator` via the connected GitHub account and cloned it. The repository was empty, its default branch was `main`, and it is public. No replacement repository or Site repository was created.

Implemented the TypeScript/Vite/Babylon scaffold, npm lockfile, CI checks, canon and reference analysis, deterministic schedule/identity model, browser save schema, first-person controls, map and schedule overlays, three connected architectural sections, eighteen furnished rooms, proxy animal rigs, student schedule-derived movement, simple teaching displays, player lift, stair route and restricted utility doors.

Initial test run: 11 tests passed. Initial TypeScript and production build passed. Build emitted a large engine-chunk warning (approximately 6 MB uncompressed initial bundle); no frame-rate claim is made. Later changes add direct hold-boundary and non-browser geometry tests; see final validation note below.

Visual QA blocker: supervised preview started successfully, but the dedicated browser refused the exact supported preview address with `ERR_BLOCKED_BY_CLIENT`. Preview status confirmed running. No alternate browser mechanism, alternate host, or security bypass was used. No screenshot or visual acceptance is claimed.

Version control: local initial commit created. Automatic approval review rejected the push because all project contents, including the uploaded contract, would be sent to an unverified public destination and explicit public-publication authorization was insufficient. No connector write or alternate push path was used to bypass that rejection. Local code remains available; public push requires user approval.

The browser gate is mandatory before large-floor construction in the user's development contract. Remaining non-browser work was completed locally; expansion to the full six floors remains blocked on actual vertical-slice verification and unfinished core behavior.

Next engineering targets: validate visible classroom geometry and movement; address collision and stair/lift failures found in that pass; add stateful local avoidance and NPC lift queues; complete Still Bell scoped routing and social/support-staff behaviors; prove the full vertical slice; then build the full fixed master plan and streamed floors. Replace all proxy character art during visual production.

### Final local validation

16 tests passed across simulation and Babylon NullEngine scene-structure suites. TypeScript passed. Final production build passed; application entry is about 35 KB and the Babylon engine chunk about 6.01 MB uncompressed (1.32 MB gzip). Structural tests confirm three sectors, eighteen classroom doors/boards, a solid floor below the start location, restricted utility access and reconstructible avatar identity. NullEngine tests do not render images and are not a substitute for visual/browser QA.

Corrected staircase return waypoints, aligned rendered species with deterministic identities, preserved classroom assignment through holds, added explicit graphics/state diagnostic labels, and formatted source. All final changes are committed locally. No push was retried after the automatic approval rejection.

## Public alpha preparation

The user explicitly authorized publication to the public `nIKKIgiscoolyes/temhs-simulator` repository, excluding original uploads. The remote had no branch history. A clean public root commit was prepared from the tested alpha, with the original development contract removed. Original source material and the old unpublished commits remain local/reference-only. No original PNG references were tracked. `.gitignore` now excludes source-upload directories, the original specification path, pasted-upload filenames and the two original image filenames; generated project assets remain eligible for publication.

The public commit has no parent carrying the original specification. Source code, tests, package lock and runtime configuration are unchanged from the tested local alpha. Shell Git authentication was unavailable, so publication uses the connected GitHub account: an initial generated README commit followed by the complete reviewed alpha tree on `main`. Neither public commit contains original uploads. No force update or additional branch/tag publication is used.

## Expansion alpha 0.2 — September 6, 2026

Built forward from sanitized public alpha `8945b40`; retained the engine, clock, identity system, original room records and v1 save compatibility. Added richer procedural materials and furniture, articulated species models, subject-specific equipment, persistent locomotion, staggered release, yielding, late arrivals and staged lift state. Expanded to six levels, five districts per level, 180 instructional rooms and 24 support rooms. Added connected concourses, 25 stair flights, five lift banks, nearby district loading and opt-in synthesized ambience.

The browser now reaches the preview but has no WebGL. Added a depth-buffered CPU compatibility view of the same geometry. Inspected the upgraded classroom, Floor 2 east wing, Level -4 north extension, map navigation and successful local save. Corrected teacher placement, stale map content, meal/release routines, utility IDs, streaming texture cleanup and explicit destination loading. Automated checks: 22 tests pass; type checking and production build pass. Vite retains a large vendor-chunk warning. Full GPU visual acceptance, frame rate and all-route first-person traversal remain open.

Original source attachments remain local/reference-only. No downloaded character models, recordings or source images were added to runtime assets.
