/** CPU inspection only. These captures cannot establish GPU visual acceptance. */
import { NullEngine, Scene, UniversalCamera, Vector3 } from "@babylonjs/core";
import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { Environment } from "../src/architecture/Environment";
import { CompatibilityRenderer } from "../src/rendering/CompatibilityRenderer";
import { facilities } from "../src/campus/plan";
Object.assign(globalThis, {
  OffscreenCanvas: class {
    constructor(w: number, h: number) {
      return createCanvas(w, h);
    }
  },
});
const engine = new NullEngine(),
  scene = new Scene(engine),
  env = new Environment(scene),
  canvas = createCanvas(640, 360),
  renderer = new CompatibilityRenderer(canvas as unknown as HTMLCanvasElement),
  camera = new UniversalCamera("inspection", new Vector3(), scene);
camera.fov = 1.14;
camera.minZ = 0.08;
scene.activeCamera = camera;
mkdirSync("test-results/scenes", { recursive: true });
const views = [
  { id: "stairwell", x: -2, y: -14.3, z: 98, yaw: 0 },
  { id: "corridor", x: 0, y: -14.3, z: 12, yaw: 0 },
  ...facilities.map((f) => ({
    id: f.id,
    x: 123,
    y: f.y + 1.7,
    z: 140,
    yaw: Math.PI / 2,
  })),
];
let time = 1000;
for (const v of views) {
  camera.position.set(v.x, v.y, v.z);
  camera.rotation.set(0, v.yaw, 0);
  env.update(v.y - 0.85, v.x, v.z);
  scene.render();
  renderer.render(scene, camera, (time += 1000));
  writeFileSync(
    "test-results/scenes/" + v.id + ".png",
    canvas.toBuffer("image/png"),
  );
  console.log(v.id);
}
scene.dispose();
engine.dispose();
