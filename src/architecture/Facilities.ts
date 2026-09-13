import { TransformNode, Mesh } from "@babylonjs/core";
import type { Environment } from "./Environment";
import { facilities } from "../campus/plan";
export function buildFacilities(env: Environment) {
  const wall = env.material("facility-paint", "#e2e5de", 0.85),
    floor = env.material("facility-floor", "#b9c8c5", 0.68, true),
    wood = env.material("oak", "#b99a72", 0.65, true),
    steel = env.material("facility-steel", "#41565d", 0.55),
    fabric = env.material("facility-fabric", "#426d79", 0.95),
    paper = env.material("facility-paper", "#ede7d5", 0.95),
    led = env.mats.get("led")!;
  for (const f of facilities) {
    const root = new TransformNode(f.id, env.scene);
    root.position.y = f.y;
    env.connections.push({ root, y: f.y });
    const box = (
      n: string,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      m = wood,
      collision = true,
    ) => env.box(n, x, y, z, w, h, d, m, root, collision);
    box("facility floor", 150, -0.2, 140, 60, 0.4, 40, floor);
    box("facility ceiling", 150, 5.6, 140, 60, 0.3, 40, wall);
    box("facility rear", 180, 2.8, 140, 0.3, 5.6, 40, wall);
    for (const z of [120, 160])
      box("facility side", 150, 2.8, z, 60, 5.6, 0.3, wall);
    for (const z of [128.5, 151.5])
      box("facility entrance wall", 120, 2.8, z, 0.3, 5.6, 17, wall);
    box("facility entrance lintel", 120, 4.9, 140, 0.3, 1.4, 6, wall);
    box("facility link floor", 111, -0.2, 140, 18, 0.4, 6, floor);
    box("facility link ceiling", 111, 5.6, 140, 18, 0.3, 6, wall);
    for (const z of [137, 143])
      box("facility link wall", 111, 2.8, z, 18, 5.6, 0.2, wall);
    env.sign(f.name.toUpperCase(), 119.8, 3.7, 140, 5, 0.75, Math.PI / 2, root);
    env.sign(
      f.name.toUpperCase() + "\nTEMHS / EAST FACILITIES",
      179.8,
      3.5,
      140,
      10,
      1.4,
      Math.PI / 2,
      root,
    );
    for (const x of [128, 144, 160, 176])
      for (const z of [125, 135, 145, 155]) {
        box("fixture housing", x, 5.25, z, 3, 0.12, 0.65, steel, false);
        box("fixture diffuser", x, 5.16, z, 2.8, 0.04, 0.5, led, false);
      }
    const chair = (x: number, z: number) => {
      box("upholstered seat", x, 0.48, z, 0.62, 0.12, 0.62, fabric);
      box("chair back", x, 0.9, z + 0.28, 0.62, 0.7, 0.08, fabric);
      for (const dx of [-0.25, 0.25])
        for (const dz of [-0.25, 0.25])
          box(
            "chair leg",
            x + dx,
            0.22,
            z + dz,
            0.045,
            0.44,
            0.045,
            steel,
            false,
          );
    };
    const table = (x: number, z: number, w = 3, d = 1.4) => {
      box("worktop", x, 0.85, z, w, 0.1, d);
      for (const dx of [-w / 2 + 0.15, w / 2 - 0.15])
        for (const dz of [-d / 2 + 0.15, d / 2 - 0.15])
          box("table leg", x + dx, 0.4, z + dz, 0.08, 0.8, 0.08, steel, false);
    };
    if (f.kind === "gym") {
      box("maple court", 149, 0.015, 139, 44, 0.025, 28, wood, false);
      const line = env.material("court-line", "#f2f0df");
      for (const z of [125, 153])
        box("court boundary", 149, 0.032, z, 44, 0.01, 0.09, line, false);
      for (const x of [127, 149, 171])
        box("court marking", x, 0.032, 139, 0.09, 0.01, 28, line, false);
      for (const x of [126, 172]) {
        box("backboard post", x, 1.65, 139, 0.16, 3.3, 0.16, steel);
        box("backboard", x, 3.2, 139, 0.12, 1.1, 1.8, paper);
      }
      for (const z of [155, 158])
        box("changing partition", 168, 1.5, z, 20, 3, 0.14, wall);
      for (let x = 160; x < 178; x += 1)
        box("changing locker", x, 1, 159, 0.8, 2, 0.55, fabric);
      box("gym bench", 139, 0.5, 157, 14, 0.15, 0.65);
    } else if (f.kind === "library") {
      for (const x of [146, 153, 160, 167])
        for (const z of [125, 155]) {
          box("bookcase", x, 1.1, z, 4.5, 2.2, 0.6, wood);
          for (let k = 0; k < 9; k++)
            for (const y of [0.5, 1.1, 1.7])
              box(
                "book spine",
                x - 2 + k * 0.48,
                y,
                z - 0.34,
                0.32,
                0.4,
                0.16,
                env.material(
                  "book-" + k,
                  ["#59747a", "#8c6756", "#8d9568"][k % 3],
                ),
                false,
              );
        }
      for (const x of [136, 149, 162])
        for (const z of [132, 148]) {
          table(x, z);
          chair(x - 0.8, z + 1.2);
          chair(x + 0.8, z + 1.2);
        }
      table(172, 139, 4);
      box("library terminal", 172, 1.12, 139, 0.8, 0.45, 0.12, steel, false);
    } else if (f.kind === "dining") {
      box("serving counter", 173, 0.6, 140, 3, 1.2, 26, steel);
      for (const z of [129, 135, 145, 151]) {
        box("serving tray", 171.4, 1.23, z, 0.65, 0.04, 1.5, paper, false);
        env.sign(
          "TODAY / FRESH LUNCH",
          171.3,
          2.5,
          z,
          2.3,
          0.6,
          Math.PI / 2,
          root,
        );
      }
      for (const x of [134, 145, 156])
        for (const z of [128, 136, 144, 152]) {
          table(x, z, 5, 1.5);
          for (const dx of [-1.5, 0, 1.5]) {
            chair(x + dx, z + 1.2);
            chair(x + dx, z - 1.2);
          }
        }
    } else if (f.kind === "science") {
      for (const x of [134, 148, 162])
        for (const z of [128, 152]) {
          table(x, z, 7, 2.5);
          for (const dx of [-2, 0, 2]) {
            chair(x + dx, z + 2);
            box(
              "workstation screen",
              x + dx,
              1.2,
              z,
              0.7,
              0.5,
              0.09,
              steel,
              false,
            );
          }
        }
      box("demonstration station", 174, 0.5, 139, 3, 1, 12, steel);
    } else {
      table(138, 140, 8, 2);
      box("reception desk front", 138, 0.48, 141, 8, 0.85, 0.12, fabric);
      for (const x of [129, 132, 135, 138])
        for (const z of [126, 154]) chair(x, z);
      for (const z of [128, 152]) {
        table(164, z, 5);
        chair(164, z + 1.2);
        box("consultation screen", 164, 1.1, z, 0.8, 0.5, 0.1, steel, false);
      }
      env.sign(
        f.kind === "reception"
          ? "WELCOME TO TEMHS\nReception · Visitor information"
          : "STUDENT SERVICES\nAdvising · Support · Appointments",
        150,
        3.2,
        120.2,
        10,
        1.5,
        Math.PI,
        root,
      );
    }
    // Merge static batches without changing collision semantics or sign textures.
    for (const collision of [true, false])
      for (const mat of new Set(root.getChildMeshes().map((m) => m.material))) {
        const batch = root
          .getChildMeshes()
          .filter(
            (m) =>
              m instanceof Mesh &&
              m.material === mat &&
              m.checkCollisions === collision &&
              m.name !== "sign",
          ) as Mesh[];
        if (batch.length < 2) continue;
        const merged = Mesh.MergeMeshes(batch, true, true);
        if (merged) {
          merged.parent = root;
          merged.position.y = -f.y;
          merged.checkCollisions = collision;
          merged.receiveShadows = true;
        }
      }
  }
}
