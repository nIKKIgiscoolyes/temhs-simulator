import { describe, it, expect } from "vitest";
import { GameClock, blocks, lessonPhase } from "../src/core/GameClock";
import { identity, assignment, studentState } from "../src/npc/NPCScheduler";
import { decode, encode, type Save } from "../src/core/SaveSystem";
import { allowed, rooms, seat } from "../src/campus/plan";
import {
  shortestPath,
  routeBetween,
  sampleRoute,
} from "../src/navigation/RoutePlanner";
describe("TEMHS master clock", () => {
  it("advances through thirteen days, including large elapsed intervals", () => {
    const c = new GameClock();
    c.minute = 1439;
    c.tick(13 * 86400 + 60);
    expect(c.day).toBe(14);
    expect(c.cycleDay).toBe(2);
    expect(c.minute).toBe(0);
  });
  it("has seven contiguous pulses with distinct Passage windows", () => {
    expect(blocks.filter((b) => b.kind === "ACADEMIC PULSE")).toHaveLength(7);
    for (let i = 1; i < blocks.length; i++)
      expect(blocks[i].start).toBe(blocks[i - 1].end);
    const c = new GameClock();
    c.minute = blocks[1].end - 0.1;
    expect(lessonPhase(c)).toBe("PACKING");
    c.tick(6);
    expect(c.block.kind).toBe("PASSAGE");
  });
  it("does not move while paused", () => {
    const c = new GameClock();
    c.paused = true;
    const t = c.minute;
    c.tick(900);
    expect(c.minute).toBe(t);
  });
});
describe("identity and offscreen continuity", () => {
  it("keeps identities and grade-appropriate slice assignments deterministic", () => {
    const before = identity(121);
    for (let i = 0; i < 30000; i += 113) identity(i);
    expect(identity(121)).toEqual(before);
    expect(before.grade).toBeGreaterThanOrEqual(9);
    expect(assignment(121, 1, 1)).not.toEqual(assignment(121, 2, 1));
  });
  it("travels from the old seat to the next room without a render object", () => {
    const c = new GameClock();
    const passage = blocks.find((b) => b.kind === "PASSAGE")!;
    c.minute = passage.start;
    const before = studentState(0, c);
    expect(before.point).toEqual(seat(assignment(0, 1, 1), 0));
    c.minute = passage.end - 0.01;
    const after = studentState(0, c);
    expect(after.point).toEqual(seat(assignment(0, 1, 2), 0));
    expect(after.walking).toBe(false);
    c.minute = passage.end;
    expect(studentState(0, c).point).toEqual(after.point);
  });
  it("Still Bell holds the assigned room during Passage", () => {
    const c = new GameClock();
    c.minute = blocks.find((b) => b.kind === "PASSAGE")!.start + 5;
    expect(studentState(18, c, true).point).toEqual(
      seat(assignment(18, 1, 1), 2),
    );
    expect(studentState(18, c, true).walking).toBe(false);
  });
  it("resumes the same student from serialized time", () => {
    const c = new GameClock();
    c.day = 7;
    c.minute = 551;
    const before = studentState(42, c);
    const s: Save = {
      version: 1,
      seed: 20260907,
      day: c.day,
      minute: c.minute,
      speed: 1,
      player: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      hold: false,
      doors: [],
      quality: "medium",
    };
    const restored = decode(encode(s));
    const other = new GameClock();
    Object.assign(other, { day: restored.day, minute: restored.minute });
    expect(studentState(42, other)).toEqual(before);
  });
});
describe("routing and permissions", () => {
  it("reroutes around closed and unauthorized edges", () => {
    const graph = {
      a: [
        { to: "b", cost: 1, closed: true },
        { to: "c", cost: 2 },
      ],
      b: [{ to: "d", cost: 1 }],
      c: [{ to: "d", cost: 2 }],
      d: [],
    };
    expect(shortestPath(graph, "a", "d")).toEqual(["a", "c", "d"]);
    graph.a[1] = { to: "c", cost: 2, closed: true };
    expect(shortestPath(graph, "a", "d")).toEqual([]);
  });
  it("cross-floor routes contain physical elevation changes and reach the destination", () => {
    const a = rooms[0],
      b = rooms[12],
      p = routeBetween(a, b, seat(a, 0), seat(b, 0));
    expect(p.some((v) => v.y === -8)).toBe(true);
    expect(sampleRoute(p, 10000).point).toEqual(seat(b, 0));
  });
  it("denies observers utility and controlled repository access", () => {
    expect(allowed("UTILITY", "observer")).toBe(false);
    expect(allowed("RESTRICTED", "student")).toBe(false);
    expect(allowed("UTILITY", "facilities")).toBe(true);
  });
  it("rejects corrupt saves without partially loading state", () => {
    expect(() => decode("{bad")).toThrow();
    expect(() => decode(JSON.stringify({ version: 22 }))).toThrow();
  });
});
