/** CPU scene inspection only; does not establish WebGL lighting or performance parity. */
import { NullEngine, Scene, UniversalCamera, Vector3 } from "@babylonjs/core";
import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { Environment } from "../src/architecture/Environment";
import { Avatar } from "../src/npc/Avatar";
import { CompatibilityRenderer } from "../src/rendering/CompatibilityRenderer";
import { rooms, seat } from "../src/campus/plan";
Object.assign(globalThis, {
  OffscreenCanvas: class {
    constructor(w: number, h: number) {
      return createCanvas(w, h);
    }
  },
});
mkdirSync("test-results/scenes", { recursive: true });
for (const id of ["F1-101", "B1-104", "B2-102"]) {
  const engine = new NullEngine(),
    scene = new Scene(engine),
    env = new Environment(scene);
  const room = rooms.find((r) => r.id === id)!;
  const canvas = createCanvas(960, 540);
  const renderer = new CompatibilityRenderer(
    canvas as unknown as HTMLCanvasElement,
  );
  const camera = new UniversalCamera(
    "inspection",
    new Vector3(room.x, room.y + 1.7, room.z + 10),
    scene,
  );
  camera.fov = 1.14;
  camera.minZ = 0.08;
  camera.rotation.y = Math.PI;
  scene.activeCamera = camera;
  env.update(room.y, room.x, room.z);
  for (let i = 0; i < 16; i++) {
    const a = new Avatar(scene, env, i),
      p = seat(room, i);
    a.root.position.set(p.x, p.y, p.z);
    a.root.rotation.y = Math.PI;
    a.gesture = i % 3 ? "writing" : "reading";
    a.pose(1, false, true);
  }
  const teacher = new Avatar(scene, env, 30000);
  teacher.root.position.set(room.x, room.y, room.z - 9);
  teacher.pose(1, false, false, true);
  scene.render();
  renderer.render(scene, camera, 1000);
  writeFileSync(`test-results/scenes/${id}.png`, canvas.toBuffer("image/png"));
  scene.dispose();
  engine.dispose();
}
console.log(
  "Wrote three CPU inspection images to test-results/scenes. GPU acceptance remains separate.",
);
