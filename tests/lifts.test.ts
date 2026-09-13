import { it, expect } from "vitest";
import { LiftController } from "../src/navigation/LiftController";
import { floors } from "../src/campus/plan";

it("services both NPC and observer in one finite-capacity cabin with landing interlocks", () => {
  const l = new LiftController("central");
  for (let i = 0; i < 12; i++)
    l.request("npc:" + i, 1, -2, i % 3 === 0 ? 2 : 1);
  l.request("observer", -1, 2);
  const completed = new Set<string>();
  let maximum = 0;
  for (let t = 0; t < 1200; t++) {
    l.update(0.1);
    for (const p of [...l.state.passengers]) {
      if (p.phase === "waiting" && l.beginBoard(p.id)) l.board(p.id);
      if (p.phase === "alighting") {
        expect(l.state.floor).toBe(p.to);
        expect(l.doorsOpen).toBe(true);
        l.finishExit(p.id);
      }
      if (p.phase === "arrived") {
        completed.add(p.id);
        l.cancel(p.id);
      }
    }
    maximum = Math.max(maximum, l.load);
    expect(l.load).toBeLessThanOrEqual(8);
    if (l.doorsOpen)
      expect(l.state.y).toBe(floors.find((f) => f.id === l.state.floor)!.y);
    if (l.state.phase === "moving") expect(l.doorsOpen).toBe(false);
  }
  expect(maximum).toBeGreaterThan(1);
  expect(completed.size).toBe(13);
});
it("keeps doors open until physical boarding/alighting finishes and resumes a saved trip", () => {
  const l = new LiftController("east");
  l.request("observer", 1, -4);
  for (let t = 0; t < 20; t++) l.update(0.1);
  expect(l.beginBoard("observer")).toBe(true);
  l.update(20);
  expect(l.doorsOpen).toBe(true);
  expect(l.state.y).toBe(0);
  l.board("observer");
  l.update(8);
  const restored = new LiftController("east");
  restored.restore(l.snapshot());
  for (let t = 0; t < 100; t++) {
    l.update(0.1);
    restored.update(0.1);
  }
  expect(restored.snapshot()).toEqual(l.snapshot());
  expect(l.passenger("observer")?.phase).toBe("alighting");
  l.update(10);
  expect(l.doorsOpen).toBe(true);
  l.finishExit("observer");
  l.cancel("observer");
  l.update(8);
  expect(l.doorsOpen).toBe(false);
});
