import { it, expect } from "vitest";
import { GameClock, blocks } from "../src/core/GameClock";
import { CampusSimulation } from "../src/npc/CampusSimulation";
import { identity } from "../src/npc/NPCScheduler";
import { decode, encode, type Save } from "../src/core/SaveSystem";
it("keeps an agent in transit when the next Pulse starts", () => {
  const c = new GameClock();
  const sim = new CampusSimulation(c, 32);
  c.minute = blocks.find((b) => b.kind === "PASSAGE")!.start;
  sim.update(c, 0);
  const before = { ...sim.agents[0].point };
  c.minute = blocks.find((b) => b.kind === "PASSAGE")!.end;
  sim.update(c, 0.2);
  expect(sim.agents[0].point).not.toEqual(before);
  expect(sim.agents[0].path.length).toBeGreaterThan(0);
  expect(sim.agents[0].activity).toBe("Late arrival");
});
it("moves continuously at walking speed and preserves a queued journey in v2 saves", () => {
  const c = new GameClock();
  const sim = new CampusSimulation(c, 32);
  c.minute = blocks.find((b) => b.kind === "PASSAGE")!.start;
  sim.update(c, 0);
  const a = { ...sim.agents[0].point };
  c.tick(0.3);
  sim.update(c, 0.3);
  expect(
    Math.hypot(sim.agents[0].point.x - a.x, sim.agents[0].point.z - a.z),
  ).toBeLessThan(0.5);
  const save: Save = {
    version: 2,
    seed: 20260907,
    day: c.day,
    minute: c.minute,
    speed: 1,
    player: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    hold: false,
    doors: [],
    quality: "medium",
    simulation: sim.snapshot(),
  };
  const loaded = decode(encode(save));
  const other = new CampusSimulation(c, 32);
  other.restore(loaded.simulation!);
  expect(other.snapshot()).toEqual(sim.snapshot());
});
it("holds existing physical positions without teleporting travellers back to a room", () => {
  const c = new GameClock();
  const s = new CampusSimulation(c, 16);
  c.minute = blocks.find((b) => b.kind === "PASSAGE")!.start;
  s.update(c, 0);
  c.tick(10);
  s.update(c, 10);
  const positions = s.agents.map((a) => ({ ...a.point }));
  s.update(c, 20, true);
  expect(s.agents.map((a) => a.point)).toEqual(positions);
});
it("preserves the old v1 player save format", () => {
  const old = {
    version: 1,
    seed: 20260907,
    day: 2,
    minute: 570,
    speed: 1,
    player: { x: -14, y: -15.15, z: 28 },
    rotation: { x: 0, y: 3.14, z: 0 },
    hold: false,
    doors: ["B2-101"],
    quality: "medium",
  };
  expect(decode(JSON.stringify(old)).player).toEqual(old.player);
});

it("sends the pilot meal cohort to dining without teleporting and retains release journeys", () => {
  const c = new GameClock(),
    sim = new CampusSimulation(c, 32);
  const before = { ...sim.agents[0].point };
  c.minute =
    blocks.find((b) => b.kind === "MEAL ROTATION")!.start +
    ["A", "B", "C"].indexOf(identity(0).meal) * 12;
  sim.update(c, 0);
  expect(sim.agents[0].point).toEqual(before);
  expect(sim.agents[0].path.at(-1)?.z).toBeCloseTo(129.2);
  c.minute = blocks.find((b) => b.kind === "TERMINAL RELEASE")!.start;
  sim.update(c, 0);
  expect(sim.agents[0].point).toEqual(before);
  expect(sim.agents[0].path.at(-1)).toEqual({ x: -2, y: 0, z: -10 });
});
