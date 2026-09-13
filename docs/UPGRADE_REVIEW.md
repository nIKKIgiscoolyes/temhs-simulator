# Expansion review — September 6, 2026

The published alpha was inspected without restarting the project. Its scene starts on a WebGL-capable client, but the dedicated QA browser now reaches the app and reports WebGL unavailable. A CPU compatibility preview projects the same Babylon scene geometry; it permits geometry/UI inspection here but does not validate GPU PBR, shadows, or GPU performance.

Observed / source-confirmed issues: faceted heads and tubular bodies; straight horizontal legs when seated; one-piece arm gestures; identical room kits; texture noise is repetitive; movement positions derive directly from clock and ignore accumulated delays; avatars are repeatedly destroyed at distance thresholds; only three short linear floor sections; no NPC elevator queue; synthetic meal destinations have no dining furniture; oversized persistent interface cards obscure the room.

Order: establish compatibility inspection, improve articulated rigs and environment detail, replace visible movement with persistent locomotion and queue state, verify those in the existing section, then extend a fixed six-level campus with horizontal districts and physical connectors. Keep old room IDs and save migration. Verify new geometry and routing with structural and behavioural tests, inspect the resulting app, and report compatibility-renderer limitations separately.
