import {
  Scene,
  TransformNode,
  MeshBuilder,
  Mesh,
  Vector3,
  type PBRMaterial,
} from "@babylonjs/core";
import { Environment } from "../architecture/Environment";
import { identity, species } from "./NPCScheduler";
export class Avatar {
  root: TransformNode;
  body: TransformNode;
  arms: TransformNode[] = [];
  legs: TransformNode[] = [];
  head: TransformNode;
  index = -1;
  constructor(scene: Scene, env: Environment, index: number) {
    this.root = new TransformNode("citizen", scene);
    this.body = new TransformNode("rig", scene);
    this.body.parent = this.root;
    this.head = new TransformNode("head", scene);
    this.head.parent = this.body;
    this.head.position.y = 1.53;
    this.rebuild(scene, env, index);
  }
  rebuild(scene: Scene, env: Environment, index: number) {
    this.index = index;
    const npc = identity(index),
      kind = species.indexOf(npc.species);
    this.root.metadata = { npc: index };
    const fur = env.material(
      "fur-" + kind,
      [
        "#b06a36",
        "#77766e",
        "#ad9f84",
        "#907354",
        "#675346",
        "#b7af99",
        "#755b47",
        "#93816b",
      ][kind],
      0.92,
    );
    const muzzle = env.material(
      "muzzle-" + kind,
      [
        "#d6c7a9",
        "#aaa695",
        "#d2c5aa",
        "#ae9873",
        "#8d7960",
        "#e3d9ba",
        "#b2a181",
        "#c6bda5",
      ][kind],
    );
    const cloth = env.material(
      "clothing-" + npc.clothing,
      ["#304b5a", "#623a3a", "#3d5147", "#48516a", "#5e5449", "#51545a"][
        npc.clothing
      ],
    );
    const trousers = env.material("trousers", "#2c3033");
    const black = env.material("eyes", "#161b19", 0.3);
    const meshes: Mesh[] = [];
    const box = (
      name: string,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      mat: PBRMaterial,
      parent: TransformNode,
    ) => {
      const m = MeshBuilder.CreateBox(
        name,
        { width: w, height: h, depth: d },
        scene,
      );
      m.position.set(x, y, z);
      m.material = mat;
      m.parent = parent;
      m.isPickable = false;
      meshes.push(m);
      return m;
    };
    const sphere = (
      name: string,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      mat: PBRMaterial,
      parent: TransformNode,
    ) => {
      const m = MeshBuilder.CreateSphere(
        name,
        { diameter: 1, segments: 6 },
        scene,
      );
      m.scaling.set(w, h, d);
      m.position.set(x, y, z);
      m.material = mat;
      m.parent = parent;
      m.isPickable = false;
      meshes.push(m);
      return m;
    };
    sphere("clothed torso", 0.49, 0.65, 0.3, 0, 1.05, 0, cloth, this.body);
    sphere("animal head", 0.34, 0.4, 0.35, 0, 0, 0, fur, this.head);
    sphere("animal muzzle", 0.24, 0.14, 0.28, 0, -0.08, 0.2, muzzle, this.head);
    sphere("nose", 0.08, 0.065, 0.06, 0, -0.045, 0.34, black, this.head);
    for (const s of [-1, 1]) {
      sphere(
        "eye",
        0.045,
        0.047,
        0.04,
        s * 0.11,
        0.025,
        0.157,
        black,
        this.head,
      );
      if (kind === 5) {
        sphere(
          "owl facial disk",
          0.16,
          0.23,
          0.055,
          s * 0.087,
          0.03,
          0.18,
          muzzle,
          this.head,
        );
        sphere(
          "owl eye",
          0.046,
          0.052,
          0.04,
          s * 0.087,
          0.035,
          0.22,
          black,
          this.head,
        );
      } else {
        const ear = MeshBuilder.CreateCylinder(
          "ear",
          {
            diameterTop: kind === 4 ? 0.1 : 0,
            diameterBottom: 0.15,
            height: kind === 2 ? 0.34 : 0.18,
            tessellation: 5,
          },
          scene,
        );
        ear.position.set(s * 0.13, kind === 2 ? 0.3 : 0.2, 0);
        ear.rotation.z = s * -0.25;
        ear.material = fur;
        ear.parent = this.head;
        meshes.push(ear);
      }
      const arm = new TransformNode("arm", scene);
      arm.parent = this.body;
      arm.position.set(s * 0.29, 1.25, 0);
      sphere("sleeve", 0.16, 0.42, 0.17, 0, -0.18, 0, cloth, arm);
      sphere("paw", 0.14, 0.16, 0.14, 0, -0.43, 0, fur, arm);
      this.arms.push(arm);
      const leg = new TransformNode("leg", scene);
      leg.parent = this.body;
      leg.position.set(s * 0.14, 0.75, 0);
      box("trouser leg", 0.17, 0.62, 0.19, 0, -0.31, 0, trousers, leg);
      box("shoe", 0.2, 0.12, 0.31, 0, -0.66, 0.045, black, leg);
      this.legs.push(leg);
      if (kind === 3) {
        const antler = box(
          "antler",
          0.03,
          0.38,
          0.03,
          s * 0.13,
          0.37,
          -0.04,
          fur,
          this.head,
        );
        antler.rotation.z = s * -0.3;
        const branch = box(
          "antler branch",
          0.15,
          0.025,
          0.03,
          s * 0.21,
          0.43,
          -0.04,
          fur,
          this.head,
        );
        branch.rotation.z = s * 0.4;
      }
    }
    if (kind === 5) {
      const beak = MeshBuilder.CreateCylinder(
        "beak",
        { diameterTop: 0, diameterBottom: 0.12, height: 0.18, tessellation: 4 },
        scene,
      );
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, -0.065, 0.28);
      beak.material = env.material("beak", "#8d784e");
      beak.parent = this.head;
    } else {
      const tail = sphere(
        "tail",
        kind === 2 ? 0.13 : 0.13,
        kind === 2 ? 0.13 : 0.5,
        0.15,
        0,
        0.66,
        -0.22,
        fur,
        this.body,
      );
      tail.rotation.x = -0.4;
    }
    box(
      "backpack",
      0.31,
      0.4,
      0.17,
      0,
      1.07,
      -0.23,
      env.material("bag", "#393c35"),
      this.body,
    );
    this.root.scaling.setAll(npc.scale);
  }
  pose(time: number, walking: boolean, seated: boolean, teacher = false) {
    const phase = time * 7 + this.index;
    this.body.position.y = seated
      ? -0.3
      : walking
        ? Math.sin(phase * 2) * 0.02
        : 0;
    for (let i = 0; i < 2; i++) {
      this.legs[i].rotation.x = seated
        ? -Math.PI / 2
        : walking
          ? Math.sin(phase + i * Math.PI) * 0.42
          : 0;
      this.arms[i].rotation.x = walking
        ? -Math.sin(phase + i * Math.PI) * 0.35
        : seated
          ? -0.85 + Math.sin(time * 2 + this.index) * 0.07
          : teacher
            ? -0.4 - Math.max(0, Math.sin(time * 0.6 + i)) * 0.8
            : 0;
    }
    this.head.rotation.y = Math.sin(time * 0.4 + this.index) * 0.13;
  }
}
