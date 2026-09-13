import {
  NullEngine,
  Scene,
  TransformNode,
  MeshBuilder,
  Mesh,
  Vector3,
  VertexData,
  type PBRMaterial,
} from "@babylonjs/core";
import { Environment } from "../architecture/Environment";
import { identity, species } from "./NPCScheduler";
export type Gesture =
  | "writing"
  | "reading"
  | "typing"
  | "discussion"
  | "packing"
  | "teaching"
  | "listening";
/** Original articulated citizens. Every mesh and texture is generated in this repository. */
export class Avatar {
  root: TransformNode;
  body: TransformNode;
  head: TransformNode;
  arms: TransformNode[] = [];
  forearms: TransformNode[] = [];
  legs: TransformNode[] = [];
  shins: TransformNode[] = [];
  index: number;
  gesture: Gesture = "writing";
  private seatedBlend = 0;
  private poseTime = 0;
  private initialized = false;
  constructor(scene: Scene, env: Environment, index: number) {
    this.index = index;
    const npc = identity(index),
      kind = species.indexOf(npc.species),
      adult = index >= 30000;
    this.root = new TransformNode(`citizen-${index}`, scene);
    this.root.metadata = { npc: index };
    this.body = new TransformNode("anatomical rig", scene);
    this.body.parent = this.root;
    this.head = new TransformNode("head and gaze", scene);
    this.head.parent = this.body;
    this.head.position.y = 1.56;
    const fur = env.material(
        "fur-" + kind,
        [
          "#a05f35",
          "#787b78",
          "#a69887",
          "#987856",
          "#594b40",
          "#a79c86",
          "#705344",
          "#9a8b75",
        ][kind],
        0.94,
        true,
      ),
      light = env.material(
        "muzzle-" + kind,
        [
          "#d8c6a5",
          "#b5b5a7",
          "#d6c7b5",
          "#bba485",
          "#927a60",
          "#e4d8c1",
          "#b8a185",
          "#c8bb9f",
        ][kind],
        0.95,
        true,
      ),
      shirt = env.material(
        (adult ? "staff-" : "student-") + "fabric-" + npc.clothing,
        (adult
          ? ["#51483c", "#334a50", "#514e46", "#4b4f55", "#6d6255", "#344d58"]
          : ["#354c5b", "#613f42", "#3d5148", "#424c63", "#75684f", "#464b53"])[
          npc.clothing
        ],
        0.9,
        true,
      ),
      pants = env.material(
        "twill-" + (index % 3),
        ["#303b46", "#4b4a43", "#292e33"][index % 3],
        0.9,
        true,
      ),
      eye = env.material("cornea", "#26231e", 0.13),
      black = env.material("shoe-leather", "#252827", 0.45),
      trim = env.material("shirt-trim", "#b6afa0", 0.8);
    const groupParts = new Map<TransformNode, Mesh[]>();
    const add = (
      m: Mesh,
      parent: TransformNode,
      mat: PBRMaterial,
      x: number,
      y: number,
      z: number,
    ) => {
      m.parent = parent;
      m.material = mat;
      m.position.set(x, y, z);
      m.isPickable = false;
      const arr = groupParts.get(parent) ?? [];
      arr.push(m);
      groupParts.set(parent, arr);
      return m;
    };
    const ell = (
      name: string,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      mat: PBRMaterial,
      parent = this.body,
    ) => {
      const m = MeshBuilder.CreateSphere(
        name,
        {
          diameter: 1,
          segments: scene.getEngine() instanceof NullEngine ? 6 : 12,
        },
        scene,
      );
      m.scaling.set(w, h, d);
      return add(m, parent, mat, x, y, z);
    };
    const box = (
      name: string,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      mat: PBRMaterial,
      parent = this.body,
    ) =>
      add(
        MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene),
        parent,
        mat,
        x,
        y,
        z,
      );
    const cone = (
      name: string,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      mat: PBRMaterial,
      parent = this.head,
    ) =>
      add(
        MeshBuilder.CreateCylinder(
          name,
          {
            diameterBottom: w,
            diameterTop: 0.012,
            height: h,
            tessellation: 12,
          },
          scene,
        ),
        parent,
        mat,
        x,
        y,
        z,
      );
    const torso = MeshBuilder.CreateLathe(
      "tailored torso",
      {
        shape: [
          new Vector3(0.155, 0.76, 0),
          new Vector3(0.2, 0.84, 0),
          new Vector3(0.21, 1.02, 0),
          new Vector3(0.25, 1.24, 0),
          new Vector3(0.245, 1.32, 0),
          new Vector3(0.1, 1.4, 0),
        ],
        tessellation: 20,
        cap: Mesh.CAP_ALL,
      },
      scene,
    );
    torso.scaling.z = 0.72;
    add(torso, this.body, shirt, 0, 0, 0);
    ell("neck", 0, 1.43, 0, 0.15, 0.22, 0.17, fur);
    box("placket", 0, 1.15, 0.164, 0.025, 0.41, 0.015, adult ? trim : shirt);
    for (let k = 0; k < 4; k++)
      ell("button", 0, 1.0 + k * 0.09, 0.18, 0.018, 0.018, 0.012, black);
    for (const side of [-1, 1]) {
      const collar = box(
        "collar",
        side * 0.073,
        1.37,
        0.105,
        0.12,
        0.07,
        0.035,
        adult ? trim : shirt,
      );
      collar.rotation.z = side * 0.36;
    }
    ell("cranium", 0, 0.015, -0.015, 0.31, 0.36, 0.3, fur, this.head);
    ell("jaw", 0, -0.11, 0.075, 0.255, 0.19, 0.235, light, this.head);
    if (kind === 5) {
      for (const side of [-1, 1]) {
        ell(
          "facial disk",
          side * 0.076,
          0.02,
          0.137,
          0.18,
          0.25,
          0.065,
          light,
          this.head,
        );
        ell(
          "orbital feather",
          side * 0.081,
          0.045,
          0.165,
          0.094,
          0.115,
          0.03,
          fur,
          this.head,
        );
        ell(
          "owl eye",
          side * 0.081,
          0.045,
          0.187,
          0.036,
          0.043,
          0.02,
          eye,
          this.head,
        );
      }
      const beak = cone(
        "curved beak",
        0,
        -0.066,
        0.205,
        0.07,
        0.15,
        env.material("beak", "#7e7055", 0.6),
      );
      beak.rotation.x = Math.PI / 2;
    } else {
      const muzzleLength = [0.19, 0.19, 0.075, 0.2, 0.12, 0, 0.14, 0.09][kind];
      ell(
        "muzzle bridge",
        0,
        -0.055,
        0.18,
        0.16,
        0.12,
        muzzleLength + 0.06,
        fur,
        this.head,
      );
      ell(
        "muzzle pads",
        0,
        -0.1,
        0.2,
        0.19,
        0.1,
        muzzleLength + 0.05,
        light,
        this.head,
      );
      ell(
        "nose",
        0,
        -0.046,
        0.2 + muzzleLength / 2,
        0.073,
        0.047,
        0.05,
        eye,
        this.head,
      );
      box("mouth line", 0, -0.133, 0.235, 0.11, 0.007, 0.009, fur, this.head);
      for (const side of [-1, 1]) {
        ell(
          "eyelid",
          side * 0.104,
          0.031,
          0.12,
          0.084,
          0.052,
          0.045,
          fur,
          this.head,
        );
        ell(
          "eye",
          side * 0.103,
          0.028,
          0.146,
          0.031,
          0.024,
          0.014,
          eye,
          this.head,
        );
        ell(
          "eye glint",
          side * 0.099,
          0.034,
          0.155,
          0.007,
          0.006,
          0.004,
          light,
          this.head,
        );
        const ear = cone(
          "outer ear",
          side * 0.128,
          kind === 2 ? 0.295 : 0.205,
          -0.015,
          kind === 4 ? 0.105 : 0.13,
          kind === 2 ? 0.32 : kind === 4 ? 0.1 : 0.18,
          fur,
        );
        ear.rotation.z = -side * 0.18;
        const inner = cone(
          "inner ear",
          side * 0.128,
          kind === 2 ? 0.3 : 0.212,
          0.015,
          0.065,
          kind === 2 ? 0.23 : 0.105,
          light,
        );
        inner.rotation.z = -side * 0.18;
        for (let k = 0; k < 3; k++) {
          const tuft = cone(
            "cheek fur",
            side * (0.135 + k * 0.011),
            -0.01 - k * 0.045,
            0.025,
            0.055,
            0.105,
            fur,
          );
          tuft.rotation.z = side * 2.25;
        }
      }
    }
    if (kind === 3)
      for (const side of [-1, 1]) {
        const horn = cone(
          "antler main",
          side * 0.13,
          0.36,
          -0.03,
          0.035,
          0.4,
          fur,
        );
        horn.rotation.z = -side * 0.3;
        for (let k = 0; k < 3; k++) {
          const branch = cone(
            "antler tine",
            side * (0.14 + k * 0.025),
            0.26 + k * 0.09,
            -0.01,
            0.025,
            0.13,
            fur,
          );
          branch.rotation.z = -side * 0.9;
        }
      }
    for (const side of [-1, 1]) {
      const arm = new TransformNode("upper arm", scene);
      arm.parent = this.body;
      arm.position.set(side * 0.245, 1.29, 0);
      ell("shoulder sleeve", 0, -0.11, 0, 0.19, 0.27, 0.2, shirt, arm);
      ell("upper sleeve", 0, -0.2, 0, 0.155, 0.31, 0.16, shirt, arm);
      const fore = new TransformNode("elbow", scene);
      fore.parent = arm;
      fore.position.y = -0.31;
      ell("forearm sleeve", 0, -0.14, 0, 0.135, 0.27, 0.145, shirt, fore);
      box("cuff", 0, -0.26, 0, 0.14, 0.045, 0.15, trim, fore);
      ell("paw palm", 0, -0.32, 0.025, 0.115, 0.13, 0.08, fur, fore);
      for (let j = 0; j < 3; j++)
        ell(
          "digit",
          (j - 1) * 0.03,
          -0.375,
          0.04,
          0.025,
          0.075,
          0.03,
          fur,
          fore,
        );
      this.arms.push(arm);
      this.forearms.push(fore);
      const hip = new TransformNode("hip", scene);
      hip.parent = this.body;
      hip.position.set(side * 0.115, 0.8, 0);
      ell("thigh", 0, -0.2, 0, 0.205, 0.43, 0.22, pants, hip);
      const knee = new TransformNode("knee", scene);
      knee.parent = hip;
      knee.position.y = -0.4;
      ell("lower trouser", 0, -0.16, 0, 0.145, 0.35, 0.16, pants, knee);
      ell("shoe", 0, -0.345, 0.065, 0.18, 0.135, 0.31, black, knee);
      box("shoe sole", 0, -0.395, 0.065, 0.185, 0.04, 0.31, black, knee);
      this.legs.push(hip);
      this.shins.push(knee);
    }
    if (!adult) {
      ell(
        "backpack shell",
        0,
        1.08,
        -0.21,
        0.37,
        0.47,
        0.18,
        env.material(
          "backpack-" + (index % 4),
          ["#575343", "#354651", "#56515c", "#56473d"][index % 4],
          0.85,
          true,
        ),
      );
      box("bag pocket", 0, 1.0, -0.315, 0.27, 0.21, 0.035, pants);
      for (const side of [-1, 1])
        box(
          "shoulder strap",
          side * 0.16,
          1.21,
          -0.11,
          0.037,
          0.37,
          0.045,
          pants,
        );
    } else {
      box(
        "lanyard",
        -0.08,
        1.15,
        0.18,
        0.018,
        0.35,
        0.016,
        env.material("lanyard", "#426b8c"),
      );
      box(
        "staff ID",
        -0.08,
        0.97,
        0.19,
        0.11,
        0.15,
        0.013,
        env.material("badge", "#d5d9d5"),
      );
    }
    if (kind !== 5) {
      const tail = ell(
        "tail",
        0,
        0.73,
        -0.28,
        kind === 2 ? 0.13 : 0.13,
        kind === 2 ? 0.13 : 0.52,
        0.14,
        fur,
      );
      tail.rotation.x = -0.55;
    }
    // Bake geometry by articulated joint and material; retain shared materials across the population.
    for (const [parent, parts] of groupParts) {
      const materials = new Map<number, Mesh[]>();
      for (const p of parts) {
        const arr = materials.get(p.material!.uniqueId) ?? [];
        arr.push(p);
        materials.set(p.material!.uniqueId, arr);
      }
      for (const group of materials.values()) {
        if (group.length < 2) continue;
        const inverse = parent.computeWorldMatrix(true).clone().invert();
        const merged = Mesh.MergeMeshes(group, true, true);
        if (merged) {
          merged.bakeTransformIntoVertices(inverse);
          merged.parent = parent;
          merged.position.setAll(0);
          merged.rotation.setAll(0);
          merged.scaling.setAll(1);
          merged.isPickable = false;
        }
      }
    }
    this.root.scaling.setAll(npc.scale);
  }
  pose(time: number, walking: boolean, seated: boolean, teacher = false) {
    if (!this.initialized) {
      this.seatedBlend = Number(seated);
      this.initialized = true;
    }
    const dt = Math.min(0.1, Math.max(0.016, time - this.poseTime));
    this.poseTime = time;
    this.seatedBlend +=
      (Number(seated) - this.seatedBlend) * Math.min(1, dt * 7);
    const b = this.seatedBlend,
      phase = time * 6.7 + this.index;
    this.body.position.y =
      -0.34 * b +
      (1 - b) *
        (walking
          ? Math.sin(phase * 2) * 0.012
          : Math.sin(time * 1.2 + this.index) * 0.003);
    this.body.rotation.x = b * 0.045;
    for (let i = 0; i < 2; i++) {
      const stride = walking ? Math.sin(phase + i * Math.PI) : 0;
      this.legs[i].rotation.x = (-Math.PI / 2) * b + stride * 0.38 * (1 - b);
      this.shins[i].rotation.x =
        (Math.PI / 2) * b +
        (walking ? Math.max(0, -stride) * 0.5 : 0) * (1 - b);
      this.arms[i].rotation.x =
        -0.15 * (1 - b) - 0.5 * b - stride * 0.32 * (1 - b);
      this.arms[i].rotation.z = (i === 0 ? 1 : -1) * 0.06;
      this.forearms[i].rotation.x = -1.05 * b - 0.1 * (1 - b);
      if (seated) {
        if (this.gesture === "writing")
          this.forearms[i].rotation.y =
            i === 1 ? Math.sin(time * 3 + this.index) * 0.06 : 0;
        if (this.gesture === "discussion" && this.index % 9 === 0 && i === 1) {
          this.arms[i].rotation.x = -2.7;
          this.forearms[i].rotation.x = -0.25;
        }
        if (this.gesture === "packing") {
          this.body.rotation.x = 0.2;
          this.arms[i].rotation.x = -0.6;
          this.forearms[i].rotation.x = -0.7;
        }
      }
      if (teacher && i === 1) {
        this.arms[i].rotation.x =
          -0.4 - Math.max(0, Math.sin(time * 0.38 + this.index)) * 0.9;
        this.forearms[i].rotation.x = -0.4;
      }
    }
    this.head.rotation.y = Math.sin(time * 0.28 + this.index) * 0.1;
    this.head.rotation.x = seated && this.gesture === "writing" ? 0.14 : 0;
  }
}
