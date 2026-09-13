import { TransformNode, Mesh, PBRMaterial } from "@babylonjs/core";
import type { Environment } from "./Environment";
import { districts, floors } from "../campus/plan";
/** Permanent envelope: independent of classroom streaming and floor visibility. */
export function buildStairCores(env: Environment) {
  const wall = env.material("core-painted-masonry", "#d6ded8", 0.88, true);
  const trim = env.material("core-sage", "#587b78", 0.75);
  const floor = env.material("core-floor", "#babfb7", 0.72, true);
  const metal = env.material("core-rail", "#354b51", 0.55);
  for (const d of districts) {
    const root = new TransformNode("permanent-stair-core-" + d.id, env.scene);
    root.position.set(d.x, 0, d.z);
    for (const x of [-10.25, 1.25])
      env.box("core enclosing side", x, -9, 112, 0.4, 46, 36, wall, root);
    env.box("core enclosing back", -4.5, -9, 130, 11.9, 46, 0.4, wall, root);
    env.box("core roof", -4.5, 13.8, 112, 11.9, 0.4, 36, wall, root);
    env.box("core foundation", -4.5, -32.4, 112, 11.9, 0.4, 36, wall, root);
    for (const f of floors) {
      env.box(
        "permanent return floor",
        -8,
        f.y - 0.2,
        111,
        4,
        0.4,
        32,
        floor,
        root,
      );
      env.box(
        "permanent stair landing",
        -4,
        f.y - 0.2,
        126.8,
        12,
        0.4,
        4.8,
        floor,
        root,
      );
      env.box(
        "core entrance lintel",
        -4.5,
        f.y + 4.8,
        94.4,
        11.8,
        1.4,
        0.35,
        wall,
        root,
      );
      env.box(
        "core entrance pier",
        -5,
        f.y + 2,
        94.4,
        1.4,
        4,
        0.35,
        wall,
        root,
      );
      env.box(
        "landing accent",
        -4.5,
        f.y + 1.1,
        129.75,
        11,
        0.5,
        0.05,
        trim,
        root,
        false,
      );
      env.sign(
        `LEVEL ${f.id}  /  ${d.name.toUpperCase()}\nSTAIRS · KEEP LEFT`,
        -4.5,
        f.y + 2.6,
        129.7,
        5,
        0.8,
        0,
        root,
      );
      // Guard the return aisle's drop edge; leave the landing and south approach open.
      env.box("return guard", -5.9, f.y + 0.6, 111, 0.12, 1.2, 24, metal, root);
      env.box(
        "core luminaire housing",
        -7.5,
        f.y + 3.6,
        124,
        2.8,
        0.14,
        0.6,
        metal,
        root,
        false,
      );
      env.box(
        "core luminaire",
        -7.5,
        f.y + 3.51,
        124,
        2.6,
        0.04,
        0.42,
        env.mats.get("led")!,
        root,
        false,
      );
    }
    for (const collision of [true, false])
      for (const mat of new Set(root.getChildMeshes().map((m) => m.material))) {
        if (!(mat instanceof PBRMaterial)) continue;
        const batch = root
          .getChildMeshes()
          .filter(
            (m) =>
              m instanceof Mesh &&
              m.material === mat &&
              m.checkCollisions === collision,
          ) as Mesh[];
        if (batch.length < 2) continue;
        const merged = Mesh.MergeMeshes(batch, true, true);
        if (merged) {
          merged.parent = root;
          merged.position.set(-d.x, 0, -d.z);
          merged.checkCollisions = collision;
          merged.receiveShadows = true;
        }
      }
  }
}
