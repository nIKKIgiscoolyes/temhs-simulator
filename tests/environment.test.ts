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

it("keeps representative classroom and cross-floor routes clear of solid architecture", async () => {
  const { routeBetween, distance } =
    await import("../src/navigation/RoutePlanner");
  const { roomById, seat } = await import("../src/campus/plan");
  for (const f of [1, -1, -2])
    if (!env.sectors.some((s) => s.id === `${f}:central`)) env.buildFloor(f);
  for (const sector of env.sectors) sector.root.setEnabled(true);
  for (const d of env.doors) if (!d.locked) env.setDoor(d.id, true);
  env.setStairClosure(false);
  for (const m of scene.meshes) m.computeWorldMatrix(true);
  const collisions: string[] = [];
  for (const [from, to] of [
    ["F1-101", "F1-102"],
    ["F1-101", "B1-101"],
    ["B1-104", "B2-102"],
  ]) {
    const a = roomById(from)!,
      b = roomById(to)!,
      path = routeBetween(a, b, seat(a, 0), seat(b, 0));
    for (let i = 1; i < path.length; i++) {
      const start = new Vector3(
          path[i - 1].x,
          path[i - 1].y + 0.85,
          path[i - 1].z,
        ),
        end = new Vector3(path[i].x, path[i].y + 0.85, path[i].z);
      const delta = end.subtract(start),
        len = delta.length();
      if (len < 0.05) continue;
      const hit = scene.pickWithRay(
        new Ray(start, delta.normalize(), Math.max(0, len - 0.03)),
        (m) => m.checkCollisions && m.isEnabled(),
      );
      if (hit?.hit)
        collisions.push(
          `${from}->${to} segment ${i} ${JSON.stringify(path[i - 1])}->${JSON.stringify(path[i])} ${hit.pickedMesh?.name}`,
        );
    }
  }
  expect(collisions).toEqual([]);
});

it("encloses every stair core and supports body-width traversal through facilities", async () => {
  const { districts, floors, facilities } = await import("../src/campus/plan");
  for (const m of scene.meshes) m.computeWorldMatrix(true);
  for (const d of districts)
    for (const f of floors) {
      const origin = new Vector3(d.x - 2, f.y + 1.5, d.z + 110);
      for (const dir of [
        new Vector3(-1, 0, 0),
        new Vector3(1, 0, 0),
        new Vector3(0, 0, 1),
      ]) {
        const hit = scene.pickWithRay(
          new Ray(origin, dir, 24),
          (m) => m.checkCollisions && m.isEnabled(),
        );
        expect(hit?.hit, `stair enclosure ${d.id}/${f.id}`).toBe(true);
      }
    }
  for (const f of facilities) {
    const root = env.connections.find((c) => c.root.name === f.id)!.root;
    root.setEnabled(true);
    for (const lateral of [-0.55, 0, 0.55]) {
      const hit = scene.pickWithRay(
        new Ray(
          new Vector3(103, f.y + 1.2, 140 + lateral),
          new Vector3(1, 0, 0),
          62,
        ),
        (m) => m.checkCollisions && m.isEnabled(),
      );
      expect(hit?.hit, `facility clearance ${f.id}`).toBe(false);
    }
    expect(
      scene.pickWithRay(
        new Ray(new Vector3(150, f.y + 1, 140), Vector3.Down(), 2),
        (m) => m.checkCollisions && m.isEnabled(),
      )?.hit,
    ).toBe(true);
  }
});
