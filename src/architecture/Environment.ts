import {
  Scene,
  MeshBuilder,
  Mesh,
  PBRMaterial,
  Color3,
  DynamicTexture,
  Vector3,
  TransformNode,
  StandardMaterial,
} from "@babylonjs/core";
import { floors, rooms, type Room } from "../campus/plan";
export interface Door {
  id: string;
  mesh: Mesh;
  open: boolean;
  locked: boolean;
  x: number;
  y: number;
  z: number;
}
export class Environment {
  mats = new Map<string, PBRMaterial>();
  doors: Door[] = [];
  sectors: { root: TransformNode; y: number }[] = [];
  boards: { texture: DynamicTexture; room: Room }[] = [];
  liftDoors: Mesh[] = [];
  constructor(public scene: Scene) {
    for (const floor of floors) this.buildFloor(floor.id);
    this.stairs();
  }
  material(name: string, color: string, roughness = 0.7, noise = false) {
    if (this.mats.has(name)) return this.mats.get(name)!;
    const m = new PBRMaterial(name, this.scene);
    m.albedoColor = Color3.FromHexString(color);
    m.roughness = roughness;
    m.metallic = 0;
    if (noise) {
      const tex = new DynamicTexture(name + "texture", 256, this.scene, false);
      const c = tex.getContext();
      c.fillStyle = color;
      c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 9000; i++) {
        const v = (i * 73) % 255;
        c.fillStyle = `rgba(${v},${v},${v},${name.includes("terrazzo") ? 0.3 : 0.09})`;
        c.fillRect(
          (i * 137) % 256,
          (i * 59 + Math.floor(i / 256) * 3) % 256,
          name.includes("terrazzo") ? 2 : 1,
          2,
        );
      }
      tex.update();
      tex.uScale = 3;
      tex.vScale = 3;
      m.albedoColor = Color3.White();
      m.albedoTexture = tex;
    }
    this.mats.set(name, m);
    return m;
  }
  box(
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: PBRMaterial,
    parent?: TransformNode,
    collision = true,
  ) {
    const m = MeshBuilder.CreateBox(
      name,
      { width: w, height: h, depth: d },
      this.scene,
    );
    m.position.set(x, y, z);
    m.material = mat;
    m.checkCollisions = collision;
    m.parent = parent ?? null;
    return m;
  }
  sign(
    text: string,
    x: number,
    y: number,
    z: number,
    w = 3,
    h = 0.8,
    rotation = 0,
    parent?: TransformNode,
    color = "#172f35",
  ) {
    const t = new DynamicTexture(
      "sign-" + text,
      { width: 1024, height: Math.round((1024 * h) / w) },
      this.scene,
      false,
    );
    const c = t.getContext() as CanvasRenderingContext2D;
    c.fillStyle = color;
    c.fillRect(0, 0, t.getSize().width, t.getSize().height);
    c.fillStyle = "#edf4ed";
    c.textAlign = "center";
    c.font = `600 ${Math.floor((1024 / w) * 0.19)}px sans-serif`;
    const lines = text.split("\n");
    lines.forEach((line, i) =>
      c.fillText(
        line,
        512,
        t.getSize().height / 2 +
          (((i - (lines.length - 1) / 2) * 1024) / w) * 0.3,
      ),
    );
    t.update();
    const m = new StandardMaterial("sign", this.scene);
    m.diffuseTexture = t;
    m.emissiveColor = Color3.White();
    m.disableLighting = true;
    const plane = MeshBuilder.CreatePlane(
      "sign",
      { width: w, height: h, sideOrientation: Mesh.DOUBLESIDE },
      this.scene,
    );
    plane.position.set(x, y, z);
    plane.rotation.y = rotation;
    plane.material = m;
    plane.parent = parent ?? null;
    return t;
  }
  buildFloor(id: number) {
    const f = floors.find((f) => f.id === id)!;
    const root = new TransformNode("sector-" + id, this.scene);
    this.sectors.push({ root, y: f.y });
    const y = f.y;
    const modern = f.era === 2021;
    const concrete = this.material("concrete", "#a29b8a", 0.9, true),
      paint = this.material("plaster", "#d5d6cb"),
      wood = this.material("oak", "#b28a57", 0.6, true),
      dark = this.material("metal", "#3d4543", 0.5),
      floor = this.material(
        modern ? "terrazzo-light" : "terrazzo-old",
        modern ? "#c5c8bc" : "#ae9e87",
        0.4,
        true,
      ),
      accent = this.material("tile-rust", "#78563c", 0.55, true),
      white = this.material("white", "#e4e8df"),
      olive = this.material("olive", "#626953"),
      blue = this.material("upholstery", "#314e61");
    this.box("corridor slab", 0, y - 0.2, 43, 12, 0.4, 108, floor, root);
    this.box("landing", -4, y - 0.2, 127, 12, 0.4, 5, floor, root);
    this.box("return connector", -8, y - 0.2, 111, 4, 0.4, 32, floor, root);
    this.box(
      "ceiling",
      0,
      y + 5.5,
      43,
      12,
      0.3,
      108,
      modern ? white : concrete,
      root,
    );
    this.box(
      "left circulation wall",
      -6.2,
      y + 2.5,
      43,
      0.4,
      5,
      108,
      modern ? paint : concrete,
      root,
    );
    this.box(
      "right circulation wall",
      6.2,
      y + 2.5,
      43,
      0.4,
      5,
      108,
      modern ? paint : concrete,
      root,
    );
    // Corridor walls are segmented below around real room openings.
    for (const mesh of [...root.getChildMeshes()])
      if (mesh.name.includes("circulation wall")) mesh.dispose();
    for (const side of [-1, 1]) {
      let last = -11;
      for (const z of [18, 45, 72]) {
        this.box(
          "corridor wall",
          side * 6.2,
          y + 2.5,
          (last + z - 1.7) / 2,
          0.4,
          5,
          z - 1.7 - last,
          modern ? paint : concrete,
          root,
        );
        this.box(
          "door lintel",
          side * 6.2,
          y + 4.4,
          z,
          0.4,
          1.2,
          3.4,
          modern ? paint : concrete,
          root,
        );
        last = z + 1.7;
      }
      this.box(
        "corridor wall",
        side * 6.2,
        y + 2.5,
        (last + 97) / 2,
        0.4,
        5,
        97 - last,
        modern ? paint : concrete,
        root,
      );
    }
    for (let z = -3; z < 95; z += 9) {
      this.box(
        "floor route inlay",
        0,
        y + 0.015,
        z,
        0.22,
        0.018,
        8.5,
        modern ? blue : accent,
        root,
        false,
      );
      if (!modern) {
        for (const x of [-4, 0, 4])
          this.box("waffle rib", x, y + 5.1, z, 0.28, 0.65, 9, concrete, root);
        this.box(
          "waffle crossbeam",
          0,
          y + 5.1,
          z,
          12,
          0.65,
          0.28,
          concrete,
          root,
        );
        this.box(
          "service conduit",
          5.7,
          y + 4.5,
          z,
          0.08,
          0.08,
          9,
          dark,
          root,
          false,
        );
      } else {
        this.box("acoustic baffle", 0, y + 5, z, 9, 0.3, 1, wood, root, false);
      }
      const light = this.material("led", "#f4f0de");
      light.emissiveColor = new Color3(0.85, 0.86, 0.76);
      this.box(
        "linear LED",
        -2.5,
        y + 4.8,
        z,
        0.2,
        0.08,
        3.2,
        light,
        root,
        false,
      );
      this.box(
        "linear LED",
        2.5,
        y + 4.8,
        z,
        0.2,
        0.08,
        3.2,
        light,
        root,
        false,
      );
      if (z > 9) {
        for (const side of [-1, 1]) {
          for (let k = 0; k < 4; k++) {
            const zz = z + k * 0.45;
            if ([18, 45, 72].some((d) => Math.abs(zz - d) < 2)) continue;
            this.box(
              "locker",
              side * 5.8,
              y + 1.1,
              zz,
              0.45,
              2.2,
              0.42,
              modern ? blue : olive,
              root,
            );
            this.box(
              "locker handle",
              side * 5.55,
              y + 1.2,
              zz,
              0.035,
              0.2,
              0.035,
              dark,
              root,
              false,
            );
          }
        }
      }
    }
    this.sign(
      `${id > 0 ? "FLOOR" : "LEVEL"} ${id}  /  ${f.wing.toUpperCase()}\nCLASSROOMS AHEAD  ·  STAIRS AT NORTH END`,
      0,
      y + 3.7,
      10,
      8,
      1.2,
      Math.PI,
      root,
    );
    this.sign(
      "CENTRAL LIFT  ←   |   -5 THROUGH -30: AUTHORIZED TRANSFER",
      0,
      y + 3.6,
      -5,
      9,
      1,
      0,
      root,
    );
    this.box("lift rear wall", 3, y + 2.5, -14, 6, 5, 0.3, dark, root);
    this.box("lift side", 0.1, y + 2.5, -11, 0.2, 5, 6, dark, root);
    this.box("lift side", 5.9, y + 2.5, -11, 0.2, 5, 6, dark, root);
    this.box("lift floor", 3, y - 0.15, -11, 6, 0.3, 6, dark, root);
    for (const x of [1.55, 4.45]) {
      const door = this.box(
        "lift doors",
        x,
        y + 2,
        -8,
        2.9,
        4,
        0.15,
        dark,
        root,
      );
      this.liftDoors.push(door);
      door.metadata = { baseX: x, floor: id };
    }
    this.sign("E  ·  CALL LIFT", 3, y + 2.2, -7.88, 2, 0.4, Math.PI, root);
    this.sign(
      "TMAP / OCCUPIED & INSPECTED\nINSTRUCTION CONTINUES",
      5.95,
      y + 2.8,
      6,
      3,
      1,
      -Math.PI / 2,
      root,
    );
    this.box("noticeboard", -5.94, y + 2.5, 6, 0.12, 1.6, 3, wood, root);
    this.sign(
      "THE EAGLE  /  SEPTEMBER\nCLUBS · STUDENT NOTICES",
      -5.84,
      y + 2.5,
      6,
      2.7,
      0.8,
      Math.PI / 2,
      root,
      "#4b5750",
    );
    for (const r of rooms.filter((r) => r.floor === id))
      this.classroom(r, root);
    this.box(
      "utility sealed door",
      -6,
      y + 1.8,
      91,
      0.2,
      3.6,
      2.5,
      olive,
      root,
    );
    this.doors.push({
      id: `UTILITY-${id}`,
      mesh: root.getChildMeshes().at(-1) as Mesh,
      open: false,
      locked: true,
      x: -6,
      y,
      z: 91,
    });
    this.sign(
      "UTILITY · AUTHORIZED STAFF",
      -5.85,
      y + 2.6,
      91,
      2,
      0.5,
      Math.PI / 2,
      root,
    );
    // Merge immutable meshes by material; doors, signage and dynamic boards remain independent.
    const groups = new Map<string, Mesh[]>();
    for (const m of root.getChildMeshes()) {
      if (
        !(m instanceof Mesh) ||
        m.material instanceof StandardMaterial ||
        this.doors.some((d) => d.mesh === m) ||
        this.liftDoors.includes(m)
      )
        continue;
      const key = m.material!.uniqueId + "-" + m.checkCollisions;
      const list = groups.get(key) ?? [];
      list.push(m);
      groups.set(key, list);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const collision = group[0].checkCollisions;
      const merged = Mesh.MergeMeshes(group, true, true);
      if (merged) {
        merged.parent = root;
        merged.checkCollisions = collision;
        merged.freezeWorldMatrix();
      }
    }
  }
  classroom(r: Room, root: TransformNode) {
    const y = r.y,
      modern = r.era === 2021;
    const concrete = this.mats.get("concrete")!,
      wood = this.mats.get("oak")!,
      dark = this.mats.get("metal")!,
      white = this.mats.get("white")!,
      floor = this.mats.get(modern ? "terrazzo-light" : "terrazzo-old")!,
      olive = this.mats.get("olive")!,
      blue = this.mats.get("upholstery")!;
    this.box("room floor", r.x, y - 0.15, r.z, 16, 0.3, 24, floor, root);
    this.box(
      "room ceiling",
      r.x,
      y + 5.5,
      r.z,
      15.2,
      0.3,
      24,
      modern ? white : concrete,
      root,
    );
    for (const z of [r.z - 12, r.z + 12])
      this.box(
        "room boundary",
        r.x,
        y + 2.6,
        z,
        15.2,
        5.2,
        0.3,
        modern ? white : concrete,
        root,
      );
    if (modern) {
      const glass = this.material("glazing", "#aad0d3", 0.15);
      glass.alpha = 0.22;
      this.box(
        "window wall",
        r.x + Math.sign(r.x) * 7.6,
        y + 2.6,
        r.z,
        0.1,
        5.2,
        24,
        glass,
        root,
      );
      for (let z = r.z - 12; z < r.z + 13; z += 4)
        this.box(
          "window mullion",
          r.x + Math.sign(r.x) * 7.6,
          y + 2.6,
          z,
          0.22,
          5.2,
          0.1,
          dark,
          root,
        );
      for (const z of [r.z - 10, r.z + 10])
        this.box("wood slats", r.x, y + 5, z, 14, 0.35, 1.6, wood, root, false);
    } else {
      this.box(
        "outer concrete wall",
        r.x + Math.sign(r.x) * 7.6,
        y + 2.6,
        r.z,
        0.3,
        5.2,
        24,
        concrete,
        root,
      );
      for (let z = r.z - 11; z < r.z + 12; z += 4) {
        this.box(
          "coffer transverse",
          r.x,
          y + 5.1,
          z,
          15,
          0.55,
          0.23,
          concrete,
          root,
        );
        for (const x of [-5, 0, 5])
          this.box(
            "coffer rib",
            r.x + x,
            y + 5.1,
            z,
            0.23,
            0.55,
            4,
            concrete,
            root,
          );
      }
      const column = MeshBuilder.CreateCylinder(
        "round concrete column",
        { diameter: 1.25, height: 5.4, tessellation: 20 },
        this.scene,
      );
      column.position.set(r.x + Math.sign(r.x) * 5.9, y + 2.7, r.z + 4);
      column.material = concrete;
      column.parent = root;
      column.checkCollisions = true;
    }
    for (const dz of [-7, 0, 7]) {
      const light = this.mats.get("led")!;
      this.box(
        "room LED",
        r.x,
        y + 4.8,
        r.z + dz,
        6,
        0.08,
        0.2,
        light,
        root,
        false,
      );
    }
    const door = this.box(
      "classroom door",
      r.door.x,
      y + 1.9,
      r.z,
      0.12,
      3.8,
      3.2,
      wood,
      root,
    );
    this.doors.push({
      id: r.id,
      mesh: door,
      open: false,
      locked: false,
      x: r.door.x,
      y,
      z: r.z,
    });
    this.sign(
      `${r.id}\n${r.subject.toUpperCase()}`,
      r.door.x + (r.x < 0 ? 0.18 : -0.18),
      y + 2.5,
      r.z - 3,
      2,
      0.9,
      r.x < 0 ? Math.PI / 2 : -Math.PI / 2,
      root,
    );
    const tex = this.sign(
      r.subject.toUpperCase() + "\nTODAY: EVIDENCE & EXPLANATION",
      r.x,
      y + 2.9,
      r.z - 11.8,
      8,
      2.8,
      Math.PI,
      root,
      "#172c2c",
    );
    this.boards.push({ texture: tex, room: r });
    this.box(
      "teaching counter",
      r.x + 5.7,
      y + 0.55,
      r.z,
      1.6,
      1.1,
      21,
      wood,
      root,
    );
    for (let k = 0; k < 8; k++) {
      this.box(
        "cabinet division",
        r.x + 4.85,
        y + 0.55,
        r.z - 9 + k * 2.5,
        0.04,
        1,
        0.035,
        dark,
        root,
        false,
      );
      this.box(
        "cabinet handle",
        r.x + 4.8,
        y + 0.7,
        r.z - 8 + k * 2.5,
        0.05,
        0.03,
        0.3,
        dark,
        root,
        false,
      );
    }
    for (let i = 0; i < 16; i++) {
      const x = r.x + ((i % 4) - 1.5) * 2.65,
        z = r.z - 6 + Math.floor(i / 4) * 2.6;
      this.box("desktop", x, y + 0.85, z - 0.6, 1.7, 0.08, 0.85, wood, root);
      for (const dx of [-0.68, 0.68])
        for (const dz of [-0.3, 0.3])
          this.box(
            "desk leg",
            x + dx,
            y + 0.4,
            z - 0.6 + dz,
            0.045,
            0.8,
            0.045,
            dark,
            root,
            false,
          );
      this.box(
        "chair seat",
        x,
        y + 0.46,
        z + 0.25,
        0.6,
        0.07,
        0.6,
        modern ? blue : olive,
        root,
        false,
      );
      this.box(
        "chair back",
        x,
        y + 0.83,
        z + 0.55,
        0.6,
        0.65,
        0.065,
        modern ? blue : olive,
        root,
        false,
      );
      this.box(
        "chair base",
        x,
        y + 0.22,
        z + 0.25,
        0.08,
        0.44,
        0.08,
        dark,
        root,
        false,
      );
      this.box(
        "paper",
        x + 0.25,
        y + 0.9,
        z - 0.55,
        0.4,
        0.01,
        0.3,
        white,
        root,
        false,
      );
      this.box(
        "notebook",
        x - 0.3,
        y + 0.9,
        z - 0.65,
        0.35,
        0.035,
        0.3,
        blue,
        root,
        false,
      );
      if (i % 3 === 0) {
        const laptop = this.box(
          "laptop",
          x,
          y + 1.1,
          z - 0.85,
          0.52,
          0.35,
          0.025,
          dark,
          root,
          false,
        );
        laptop.rotation.x = -0.2;
      }
      this.box(
        "backpack",
        x + 0.8,
        y + 0.3,
        z + 0.15,
        0.35,
        0.6,
        0.24,
        blue,
        root,
        false,
      );
      if (r.subject === "Biology" || r.subject === "Biomedical science") {
        this.box(
          "microscope base",
          x + 0.55,
          y + 0.94,
          z - 0.65,
          0.18,
          0.1,
          0.2,
          dark,
          root,
          false,
        );
        this.box(
          "microscope stem",
          x + 0.55,
          y + 1.12,
          z - 0.7,
          0.05,
          0.3,
          0.05,
          white,
          root,
          false,
        );
      }
    }
    if (r.subject === "Civic memory" || r.subject === "History") {
      for (let k = 0; k < 4; k++) {
        this.box(
          "archive cabinet",
          r.x - 6,
          y + 1.1,
          r.z + 4 + k * 1.7,
          1,
          2.2,
          1.4,
          olive,
          root,
        );
        for (let j = 0; j < 4; j++)
          this.box(
            "archive handle",
            r.x - 5.45,
            y + 0.3 + j * 0.5,
            r.z + 4 + k * 1.7,
            0.06,
            0.035,
            0.25,
            dark,
            root,
            false,
          );
      }
    }
  }
  stairs() {
    const concrete = this.mats.get("concrete")!,
      metal = this.mats.get("metal")!;
    for (const high of [0, -8]) {
      const angle = Math.atan2(8, 28);
      const ramp = this.box(
        "accessible stair collision",
        -2,
        high - 4 - 0.15,
        111,
        4,
        0.3,
        Math.hypot(28, 8),
        concrete,
      );
      ramp.rotation.x = angle;
      ramp.visibility = 0;
      for (let i = 0; i < 40; i++)
        this.box(
          "stair tread",
          -2,
          high - i * 0.2 - 0.1,
          97 + i * 0.7,
          4,
          0.2,
          0.7,
          concrete,
          undefined,
          false,
        );
      for (const x of [-4.2, 0.2]) {
        const rail = this.box(
          "handrail",
          x,
          high - 3,
          111,
          0.08,
          0.08,
          Math.hypot(28, 8),
          metal,
          undefined,
          false,
        );
        rail.rotation.x = angle;
        for (let i = 0; i < 8; i++)
          this.box(
            "rail post",
            x,
            high - i - 0.2,
            97 + i * 3.5,
            0.06,
            1.1,
            0.06,
            metal,
            undefined,
            false,
          );
      }
    }
  }
  update(y: number) {
    for (const s of this.sectors) s.root.setEnabled(Math.abs(s.y - y) < 12);
  }
  setDoor(id: string, open: boolean) {
    const d = this.doors.find((d) => d.id === id);
    if (!d || d.locked) return;
    d.open = open;
    d.mesh.position.z = d.z + (open ? 3.3 : 0);
    d.mesh.checkCollisions = !open;
  }
}
