import { it, expect } from "vitest";
import { facilities, facilityRoom, rooms, seat } from "../src/campus/plan";
import { Wayfinding } from "../src/ui/Wayfinding";
import { StaffController } from "../src/npc/StaffController";
it("routes to every facility through its real entrance", () => {
  for (const f of facilities) {
    const w = new Wayfinding();
    expect(w.setDestination(f.id, seat(rooms[0], 0), new Set())).toBe(true);
    expect(
      w.path.some((p) => p.x === f.door.x && p.z === 140 && p.y === f.y),
    ).toBe(true);
    expect(facilityRoom(f.id)?.floor).toBe(f.floor);
  }
});
it("maintains facility staff duty and movement across saved state", () => {
  const c = new StaffController(31001, "Campus supervisor", -2, 140);
  for (let i = 0; i < 260; i++) c.update(1, false, false);
  expect(c.state.point.x).toBeGreaterThan(120);
  const restored = new StaffController(31001, "Campus supervisor", -2, 140);
  restored.restore(c.snapshot());
  for (let i = 0; i < 30; i++) {
    c.update(1, false, false);
    restored.update(1, false, false);
  }
  expect(restored.snapshot()).toEqual(c.snapshot());
});
it("assigns unique dining-hall seats to the bounded meal cohort", async () => {
  const { GameClock, blocks } = await import("../src/core/GameClock");
  const { CampusSimulation } = await import("../src/npc/CampusSimulation");
  const c = new GameClock();
  c.minute = blocks.find((b) => b.kind === "MEAL ROTATION")!.start;
  const sim = new CampusSimulation(c, 72);
  sim.update(c, 0, false);
  const diners = sim.agents.filter((a) => a.path.at(-1)?.x! > 120);
  expect(diners.length).toBeGreaterThan(0);
  const seats = diners.map((a) => JSON.stringify(a.path.at(-1)));
  expect(new Set(seats).size).toBe(seats.length);
  expect(diners.every((a) => a.path.at(-1)?.y === -8)).toBe(true);
});
