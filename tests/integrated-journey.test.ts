import { it, expect } from "vitest";
import { GameClock, blocks } from "../src/core/GameClock";
import { CampusSimulation } from "../src/npc/CampusSimulation";
import {
  routeBetween,
  stairEdge,
  distance,
} from "../src/navigation/RoutePlanner";
import { roomById, rooms, seat, districts } from "../src/campus/plan";
import { decode, encode, type Save } from "../src/core/SaveSystem";
import { classroomAction } from "../src/npc/ClassroomController";

it("uses live graph detours and exposes inaccessible routes rather than crossing a closure", () => {
  const a = roomById("F1-101")!,
    b = roomById("B1-101")!;
  const direct = routeBetween(a, b, seat(a, 0), seat(b, 0), 0);
  const closed = new Set([stairEdge("central", 0)]);
  const detour = routeBetween(a, b, seat(a, 0), seat(b, 0), 0, { closed });
  expect(detour.length).toBeGreaterThan(direct.length);
  expect(detour.some((p) => p.z > 200)).toBe(true);
  for (const d of districts) closed.add(stairEdge(d.id, 0));
  expect(routeBetween(a, b, seat(a, 0), seat(b, 0), 0, { closed })).toEqual([]);
});
it("finishes a shared lift journey and settles into the intended classroom", () => {
  const clock = new GameClock();
  clock.minute = blocks.find((b) => b.kind === "PASSAGE")!.start;
  const sim = new CampusSimulation(clock, 1);
  sim.update(clock, 0);
  const destination = sim.agents[0].target;
  let sawQueue = false,
    sawRide = false;
  for (let i = 0; i < 1800; i++) {
    clock.tick(0.25);
    sim.update(clock, 0.25);
    sawQueue ||= sim.agents[0].activity === "Waiting for lift";
    sawRide ||= sim.agents[0].activity === "Riding lift";
    if (!sim.agents[0].path.length && sim.agents[0].room === destination) break;
  }
  expect(sawQueue).toBe(true);
  expect(sawRide).toBe(true);
  expect(
    distance(sim.agents[0].point, seat(roomById(destination)!, 0)),
  ).toBeLessThan(0.05);
});
it("retains shared queues, closures and positions in v3, and rejects invalid reservations atomically", () => {
  const clock = new GameClock(),
    sim = new CampusSimulation(clock, 1);
  sim.setClosure(stairEdge("central", 0), true);
  sim.lifts[0].request("observer", 1, -2);
  const save: Save = {
    version: 3,
    seed: 20260907,
    day: 0,
    minute: clock.minute,
    speed: 1,
    player: { x: 0, y: 0.85, z: 2 },
    rotation: { x: 0, y: 0, z: 0 },
    hold: false,
    doors: [],
    quality: "medium",
    simulation: sim.snapshot(),
  };
  const loaded = decode(encode(save));
  const other = new CampusSimulation(clock, 1);
  other.restore(loaded.simulation!);
  expect(other.snapshot()).toEqual(sim.snapshot());
  const bad = JSON.parse(encode(save));
  bad.simulation.lifts[1].passengers = bad.simulation.lifts[0].passengers;
  expect(() => decode(JSON.stringify(bad))).toThrow();
  expect(other.snapshot()).toEqual(sim.snapshot());
});
it("samples lesson actions and never seats a held traveller through a clock reset", () => {
  const clock = new GameClock();
  const pulse = blocks.find((b) => b.kind === "ACADEMIC PULSE")!;
  clock.minute = pulse.start + 3;
  expect(classroomAction(clock, 0)).toBe("Settling");
  clock.minute = pulse.start + (pulse.end - pulse.start) * 0.75;
  expect(classroomAction(clock, 1)).toBe("Writing");
  clock.minute = pulse.end - 0.01;
  expect(classroomAction(clock, 0)).toBe("Packing");
  const sim = new CampusSimulation(clock, 1);
  clock.minute = pulse.end;
  sim.update(clock, 0);
  clock.tick(20);
  sim.update(clock, 20);
  const point = { ...sim.agents[0].point };
  sim.update(clock, 0, true);
  expect(sim.agents[0].walking).toBe(false);
  expect(sim.agents[0].point).toEqual(point);
});
it("processes an accelerated bell crossing without skipping the travel release", () => {
  const clock = new GameClock(),
    sim = new CampusSimulation(clock, 16);
  const b = blocks.find((b) => b.kind === "PASSAGE")!;
  clock.minute = b.start - 0.02;
  sim.update(clock, 0);
  clock.tick(6);
  sim.update(clock, 6);
  expect(sim.agents[0].path.length).toBeGreaterThan(0);
  expect(sim.agents[0].point).not.toEqual(seat(rooms[0], 0));
});

it("persists teacher circulation and runs purposeful staff routines independently of meshes", async () => {
  const { TeacherController } = await import("../src/npc/ClassroomController");
  const { StaffController } = await import("../src/npc/StaffController");
  const c = new GameClock(),
    b = blocks.find((b) => b.kind === "ACADEMIC PULSE")!,
    r = roomById("B2-102")!;
  c.minute = b.start + (b.end - b.start) * 0.75;
  const t = new TeacherController(r);
  t.update(c, 8, false);
  const restored = new TeacherController(r);
  restored.restore(t.snapshot());
  c.minute = b.end - 0.01;
  for (let i = 0; i < 120; i++) {
    t.update(c, 0.25, false);
    restored.update(c, 0.25, false);
  }
  expect(restored.snapshot()).toEqual(t.snapshot());
  expect(
    distance(t.point, { x: r.door.x + 1.3, y: r.y, z: r.door.z + 1.8 }),
  ).toBeLessThan(0.1);
  const worker = new StaffController(31000, "Custodian", 1, 36);
  worker.update(5, true, false);
  expect(worker.state.point.x).toBeCloseTo(4.8);
  expect(worker.state.action).toBe("Keeping Passage clear");
  const other = new StaffController(31000, "Custodian", 1, 36);
  other.restore(worker.snapshot());
  worker.update(15, false, false);
  other.update(15, false, false);
  expect(other.snapshot()).toEqual(worker.snapshot());
});
it("provides a directory route to a real room using the active closure state", async () => {
  const { Wayfinding } = await import("../src/ui/Wayfinding");
  const nav = new Wayfinding();
  expect(
    nav.setDestination(
      "B1-101",
      seat(roomById("F1-101")!, 0),
      new Set(["stairs:central:0"]),
    ),
  ).toBe(true);
  expect(nav.path.some((p) => p.z > 200)).toBe(true);
  expect(nav.path.at(-1)).toEqual({ x: -6.8, y: -8, z: 18 });
  expect(nav.setDestination("missing", nav.path[0], new Set())).toBe(false);
});
