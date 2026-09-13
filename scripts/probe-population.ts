import { GameClock, blocks } from "../src/core/GameClock";
import { CampusSimulation } from "../src/npc/CampusSimulation";
import { encode, decode, type Save } from "../src/core/SaveSystem";
import { performance } from "node:perf_hooks";
const c = new GameClock(),
  sim = new CampusSimulation(c);
c.minute = blocks.find((b) => b.kind === "PASSAGE")!.start;
const begin = performance.now();
sim.update(c, 0);
for (let i = 0; i < 120; i++) {
  c.tick(0.25);
  sim.update(c, 0.25);
}
const s: Save = {
  version: 3,
  seed: 20260907,
  day: c.day,
  minute: c.minute,
  speed: 1,
  player: { x: 0, y: 0.85, z: 28 },
  rotation: { x: 0, y: 0, z: 0 },
  hold: false,
  doors: [],
  quality: "medium",
  simulation: sim.snapshot(),
};
const raw = encode(s);
decode(raw);
console.log(
  JSON.stringify({
    students: sim.agents.length,
    simulatedSeconds: 30,
    cpuMilliseconds: Math.round(performance.now() - begin),
    saveUtf8Bytes: Buffer.byteLength(raw),
    saveUtf16Bytes: raw.length * 2,
    queue: sim.queueCount,
    blocked: sim.blockedCount,
  }),
);
