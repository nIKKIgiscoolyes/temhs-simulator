import { afterAll, beforeAll, describe, it, expect, vi } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { NullEngine, Scene, Vector3, Ray } from "@babylonjs/core";
import { Environment } from "../src/architecture/Environment";
import { Avatar } from "../src/npc/Avatar";
import { GameClock, blocks } from "../src/core/GameClock";
let engine: NullEngine, scene: Scene, env: Environment;
beforeAll(() => {
  vi.stubGlobal(
    "OffscreenCanvas",
    class {
      constructor(w: number, h: number) {
        return createCanvas(w, h);
      }
    },
  );
  engine = new NullEngine();
  scene = new Scene(engine);
  env = new Environment(scene);
  for (const m of scene.meshes) m.computeWorldMatrix(true);
});
afterAll(() => {
  scene.dispose();
  engine.dispose();
  vi.unstubAllGlobals();
});
describe("non-browser Babylon scene structure", () => {
  it("builds three sectors and eighteen real classroom doors", () => {
    expect(env.sectors).toHaveLength(3);
    expect(env.doors.filter((d) => /^[FB]\d-/.test(d.id))).toHaveLength(18);
    expect(env.doors.filter((d) => d.id.startsWith("SUP-"))).toHaveLength(24);
    expect(env.boards).toHaveLength(18);
    expect(scene.meshes.length).toBeLessThan(700);
  });
  it("opens classroom collision and never opens utility doors", () => {
    env.setDoor("B2-101", true);
    const d = env.doors.find((d) => d.id === "B2-101")!;
    expect(d.mesh.checkCollisions).toBe(false);
    expect(d.mesh.position.z).not.toBe(d.z);
    env.setDoor("UTILITY--2-central", true);
    expect(env.doors.find((d) => d.id === "UTILITY--2-central")!.open).toBe(
      false,
    );
  });
  it("has a floor directly below the player start", () => {
    const hit = scene.pickWithRay(
      new Ray(new Vector3(-14, -14, 28), Vector3.Down(), 4),
      (m) => m.checkCollisions,
    );
    expect(hit?.hit).toBe(true);
    expect(hit?.pickedPoint?.y).toBeCloseTo(-16, 1);
  });
  it("replaces visual representation without changing identity metadata", () => {
    const a = new Avatar(scene, env, 42);
    expect(a.root.metadata.npc).toBe(42);
    a.pose(1, true, false);
    expect(a.arms).toHaveLength(2);
    a.root.dispose();
    const restored = new Avatar(scene, env, 42);
    expect(restored.root.metadata.npc).toBe(42);
    restored.root.dispose();
  });
  it("holds the clock at Passage so students cannot reset into their next room", () => {
    const c = new GameClock();
    const passage = blocks.find((b) => b.kind === "PASSAGE")!;
    c.minute = passage.start - 0.1;
    c.tick(60, true);
    expect(c.minute).toBe(passage.start);
    c.tick(1000, true);
    expect(c.minute).toBe(passage.start);
    c.tick(60, false);
    expect(c.minute).toBe(passage.start + 1);
  });
});

it("streams the deep extension, preserves door state, and has a traversable floor", () => {
  env.setDoor("B4-501", true);
  for (let i = 0; i < 200; i++) env.update(-32, 0, 328);
  expect(env.sectors.some((s) => s.id === "-4:far-north")).toBe(true);
  expect(env.sectors.some((s) => s.id === "1:central")).toBe(false);
  expect(env.doors.find((d) => d.id === "B4-501")?.open).toBe(true);
  for (const m of scene.meshes) m.computeWorldMatrix(true);
  const hit = scene.pickWithRay(
    new Ray(new Vector3(0, -30, 328), Vector3.Down(), 4),
    (m) => m.checkCollisions && m.isEnabled(),
  );
  expect(hit?.pickedPoint?.y).toBeCloseTo(-32, 1);
});
