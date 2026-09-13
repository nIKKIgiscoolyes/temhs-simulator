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
import {
  floors,
  rooms,
  districts,
  supportRooms,
  seat,
  type District,
  type Room,
} from "../campus/plan";
export interface Door {
  id: string;
  mesh: Mesh;
  open: boolean;
  locked: boolean;
  x: number;
  y: number;
  z: number;
  localZ?: number;
  axis?: "x" | "z";
  pivot?: TransformNode;
}
export class Environment {
  mats = new Map<string, PBRMaterial>();
  doors: Door[] = [];
  sectors: {
    root: TransformNode;
    y: number;
    x: number;
    z: number;
    id: string;
  }[] = [];
  doorStates = new Map<string, boolean>();
  passage = false;
  connections: { root: TransformNode; y: number }[] = [];
  private lastStreaming = 0;
  private stairBarriers: TransformNode[] = [];
  boards: { texture: DynamicTexture; room: Room }[] = [];
  liftDoors: Mesh[] = [];
  constructor(public scene: Scene) {
    for (const floor of floors.slice(0, 3)) this.buildFloor(floor.id);
    this.stairs();
    this.buildConnections();
    this.buildStairInspection();
  }
  private buildStairInspection() {
    for (const p of [
      { x: -2, y: 0, z: 96 },
      { x: -8, y: -8, z: 99 },
    ]) {
      const root = new TransformNode("TMAP inspection barrier", this.scene);
      this.stairBarriers.push(root);
      const gold = this.material("inspection-gold", "#c5a151"),
        dark = this.material("inspection-dark", "#343c3c");
      this.box(
        "closed stair barrier",
        p.x,
        p.y + 0.9,
        p.z,
        4,
        1.8,
        0.18,
        gold,
        root,
      );
      for (let i = -2; i <= 2; i++)
        this.box(
          "barrier stripe",
          p.x + i * 0.7,
          p.y + 0.9,
          p.z + 0.1,
          0.16,
          1.7,
          0.02,
          dark,
          root,
          false,
        );
      this.sign(
        "TMAP / STAIR INSPECTION\nUSE LIFT OR NORTH DISTRICT STAIRS",
        p.x,
        p.y + 2.4,
        p.z,
        5,
        1,
        Math.PI,
        root,
        "#634d28",
      );
      root.setEnabled(false);
    }
  }
  setStairClosure(closed: boolean) {
    for (const root of this.stairBarriers) root.setEnabled(closed);
  }
  material(name: string, color: string, roughness = 0.7, noise = false) {
    if (this.mats.has(name)) return this.mats.get(name)!;
    const m = new PBRMaterial(name, this.scene);
    m.albedoColor = Color3.FromHexString(color);
    m.metadata = { baseColor: Color3.FromHexString(color) };
    m.roughness = roughness;
    m.metallic = 0;
    if (noise) {
      const tex = new DynamicTexture(name + "texture", 256, this.scene, false);
      const c = tex.getContext() as CanvasRenderingContext2D;
      c.fillStyle = color;
      c.fillRect(0, 0, 256, 256);
      let seed = 17;
      const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let i = 0; i < 12000; i++) {
        const v = 70 + Math.floor(random() * 160);
        c.fillStyle = `rgba(${v},${v},${v},${name.includes("terrazzo") ? 0.24 : 0.065})`;
        const size = name.includes("terrazzo")
          ? 1 + random() * 2
          : 0.5 + random();
        c.fillRect(random() * 256, random() * 256, size, size);
      }
      if (name === "oak") {
        for (let i = 0; i < 150; i++) {
          c.strokeStyle = `rgba(66,40,22,${random() * 0.09})`;
          c.beginPath();
          const y = random() * 256;
          c.moveTo(0, y);
          c.bezierCurveTo(70, y - 3, 190, y + 3, 256, y);
          c.stroke();
        }
      }
      if (name.includes("fabric") || name.includes("twill")) {
        c.strokeStyle = "rgba(240,240,220,.035)";
        for (let i = 0; i < 256; i += 3) {
          c.beginPath();
          c.moveTo(i, 0);
          c.lineTo(i, 256);
          c.moveTo(0, i);
          c.lineTo(256, i);
          c.stroke();
        }
      }
      if (name === "concrete") {
        c.strokeStyle = "rgba(60,62,56,.12)";
        c.lineWidth = 1;
        c.strokeRect(0, 0, 256, 128);
        for (let i = 0; i < 20; i++) {
          c.fillStyle = "rgba(60,62,56,.08)";
          c.beginPath();
          c.arc(
            random() * 256,
            random() * 256,
            random() * 1.1,
            0.0,
            Math.PI * 2,
          );
          c.fill();
        }
      }
      tex.update();
      tex.uScale = 3;
      tex.vScale = 3;
      m.albedoColor = Color3.White();
      m.albedoTexture = tex;
    }
    if (name.includes("metal")) {
      m.metallic = 0.65;
      m.roughness = 0.38;
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
    const lines = text.split("\n"),
      size = t.getSize();
    let fontSize = Math.min(
      (1024 / w) * 0.19,
      (size.height / (lines.length + 1)) * 0.8,
    );
    c.font = `600 ${fontSize}px sans-serif`;
    const widest = Math.max(...lines.map((line) => c.measureText(line).width));
    fontSize *= Math.min(1, (1024 * 0.9) / Math.max(1, widest));
    c.font = `600 ${fontSize}px sans-serif`;
    c.textBaseline = "middle";
    lines.forEach((line, i) =>
      c.fillText(
        line,
        512,
        size.height / 2 + (i - (lines.length - 1) / 2) * fontSize * 1.35,
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
  buildFloor(id: number, district: District = districts[0]) {
    const f = floors.find((f) => f.id === id)!;
    const root = new TransformNode(
      "sector-" + id + "-" + district.id,
      this.scene,
    );
    this.sectors.push({
      root,
      y: f.y,
      x: district.x,
      z: district.z,
      id: `${id}:${district.id}`,
    });
    const firstDoor = this.doors.length;
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
      `${id > 0 ? "FLOOR" : "LEVEL"} ${id}  /  ${district.name.toUpperCase()}\nCLASSROOMS AHEAD  ·  STAIRS AT NORTH END`,
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
      door.metadata = { baseX: x, floor: id, district: district.id };
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
    for (const r of rooms.filter(
      (r) => r.floor === id && r.district === district.id,
    ))
      this.classroom(
        {
          ...r,
          x: r.x - district.x,
          z: r.z - district.z,
          door: {
            ...r.door,
            x: r.door.x - district.x,
            z: r.door.z - district.z,
          },
        },
        root,
      );
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
      id: `UTILITY-${id}-${district.id}`,
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
        // Root transforms are applied after local kit assembly.
      }
    }
    root.position.set(district.x, 0, district.z);
    for (const d of this.doors.slice(firstDoor)) {
      d.localZ = d.z;
      d.x += district.x;
      d.z += district.z;
      this.setDoor(d.id, this.doorStates.get(d.id) ?? this.passage);
    }
    for (const m of root.getChildMeshes()) m.computeWorldMatrix(true);
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
    const pivot = new TransformNode("door hinge " + r.id, this.scene);
    pivot.metadata = { swing: r.x < 0 ? -1 : 1 };
    pivot.parent = root;
    pivot.position.set(r.door.x, y + 1.9, r.z - 1.6);
    door.parent = pivot;
    door.position.set(0, 0, 1.6);
    this.doors.push({
      id: r.id,
      pivot,
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
    this.roomDetails(r, root);
    this.focalRoom(r, root);
    this.box(
      "teaching counter",
      r.x + Math.sign(r.x) * 5.7,
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
        r.x + Math.sign(r.x) * 4.85,
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
        r.x + Math.sign(r.x) * 4.8,
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
      const { x, z } = seat(r, i);
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
  roomDetails(r: Room, root: TransformNode) {
    const y = r.y,
      modern = r.era === 2021,
      wood = this.mats.get("oak")!,
      metal = this.mats.get("metal")!,
      white = this.mats.get("white")!,
      olive = this.mats.get("olive")!;
    const wallMat = this.material("acoustic felt", "#8d938f", 0.98, true),
      rust = this.material("repair terrazzo", "#b5afa2", 0.66, true);
    for (const z of [r.z - 11.7, r.z + 11.7]) {
      this.box(
        "institutional skirting",
        r.x,
        y + 0.12,
        z,
        15,
        0.22,
        0.05,
        metal,
        root,
        false,
      );
      this.box(
        "picture rail",
        r.x,
        y + 3.8,
        z,
        15,
        0.045,
        0.055,
        wood,
        root,
        false,
      );
    }
    for (let k = 0; k < 6; k++)
      this.box(
        "acoustic wall panel",
        r.x - 6.4,
        y + 2.9,
        r.z - 8 + k * 3,
        0.13,
        1.8,
        2.7,
        wallMat,
        root,
        false,
      );
    this.box(
      "teacher desk",
      r.x - 3.6,
      y + 0.86,
      r.z - 9.5,
      2.4,
      0.12,
      1.05,
      wood,
      root,
    );
    this.box(
      "teacher pedestal",
      r.x - 4.3,
      y + 0.42,
      r.z - 9.5,
      0.65,
      0.8,
      0.85,
      metal,
      root,
    );
    this.box(
      "teacher monitor",
      r.x - 3.7,
      y + 1.2,
      r.z - 9.7,
      0.65,
      0.38,
      0.06,
      metal,
      root,
      false,
    );
    this.box(
      "environment sensor",
      r.x + 5.3,
      y + 2.2,
      r.z - 11.7,
      0.22,
      0.32,
      0.07,
      white,
      root,
      false,
    );
    this.sign(
      "AIR / NORMAL",
      r.x + 5.3,
      y + 2.2,
      r.z - 11.64,
      0.2,
      0.12,
      Math.PI,
      root,
      "#345a52",
    );
    for (let i = 0; i < 16; i++) {
      const { x, z } = seat(r, i);
      const bottle = MeshBuilder.CreateCylinder(
        "water bottle",
        { diameter: 0.085, height: 0.24, tessellation: 10 },
        this.scene,
      );
      bottle.position.set(x + 0.58, y + 1.02, z - 0.6);
      bottle.material = this.material(
        "bottle-" + (i % 3),
        ["#4f6d67", "#9c8e76", "#697788"][i % 3],
        0.4,
      );
      bottle.parent = root;
      this.box(
        "pencil",
        x + 0.1,
        y + 0.919,
        z - 0.5,
        0.14,
        0.008,
        0.008,
        this.material("pencil", "#b3a16a"),
        root,
        false,
      );
      if (r.subject === "Technology") {
        this.box(
          "student display",
          x,
          y + 1.24,
          z - 0.68,
          0.85,
          0.52,
          0.06,
          metal,
          root,
          false,
        );
        this.box(
          "display screen",
          x,
          y + 1.24,
          z - 0.642,
          0.75,
          0.42,
          0.012,
          this.material("screen blue", "#6399a6", 0.3),
          root,
          false,
        );
        this.box(
          "display foot",
          x,
          y + 0.99,
          z - 0.68,
          0.08,
          0.2,
          0.1,
          metal,
          root,
          false,
        );
        this.box(
          "keyboard",
          x,
          y + 0.925,
          z - 0.28,
          0.66,
          0.025,
          0.21,
          metal,
          root,
          false,
        );
      }
      if (r.subject === "Chemistry") {
        this.box(
          "lab safety tray",
          x + 0.6,
          y + 0.94,
          z - 0.4,
          0.5,
          0.04,
          0.45,
          metal,
          root,
          false,
        );
        for (let k = 0; k < 3; k++)
          this.box(
            "reagent vessel",
            x + 0.45 + k * 0.12,
            y + 1.06,
            z - 0.4,
            0.08,
            0.2,
            0.08,
            this.material("lab glass", "#a4c9c4", 0.15),
            root,
            false,
          );
      }
      if (r.subject === "Art") {
        this.box(
          "drawing board",
          x,
          y + 0.95,
          z - 0.4,
          0.9,
          0.04,
          0.6,
          wood,
          root,
          false,
        );
        this.box(
          "sketch paper",
          x,
          y + 0.98,
          z - 0.4,
          0.7,
          0.01,
          0.5,
          white,
          root,
          false,
        );
      }
      if (r.subject === "Mathematics")
        this.box(
          "calculator",
          x - 0.55,
          y + 0.92,
          z - 0.5,
          0.12,
          0.025,
          0.19,
          metal,
          root,
          false,
        );
      if (r.subject === "Civic memory" || r.subject === "History") {
        this.box(
          "source folio",
          x,
          y + 0.925,
          z - 0.6,
          0.6,
          0.012,
          0.4,
          rust,
          root,
          false,
        );
        this.box(
          "archival box",
          r.x + Math.sign(r.x) * 5.7,
          y + 1.28,
          r.z - 8 + (i % 6) * 3,
          0.7,
          0.33,
          0.5,
          this.material("archive board", "#b1a17e", 0.96, true),
          root,
          false,
        );
      }
    }
    if (!modern) {
      for (let k = 0; k < 3; k++) {
        const pipe = MeshBuilder.CreateCylinder(
          "retrofitted service pipe",
          { diameter: 0.1 + k * 0.03, height: 23, tessellation: 10 },
          this.scene,
        );
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(r.x - 6 + k * 0.24, y + 4.45, r.z);
        pipe.material = metal;
        pipe.parent = root;
      }
      this.box(
        "repaired floor inset",
        r.x + 6,
        y + 0.012,
        r.z + 7,
        2,
        0.015,
        3,
        rust,
        root,
        false,
      );
      this.sign(
        "TMAP / INSPECTED 2026",
        r.x - 4.5,
        y + 2.6,
        r.z + 11.77,
        2.2,
        0.35,
        0,
        root,
      );
    }
    const posterSubject =
      r.subject === "Biology"
        ? "ECOSYSTEMS / FIELD NOTES"
        : r.subject === "Mathematics"
          ? "SHOW YOUR REASONING"
          : r.subject === "Civic memory"
            ? "PROVENANCE · CONTEXT · SILENCE"
            : "READ · QUESTION · DISCUSS";
    this.sign(
      posterSubject,
      r.x + 2.8,
      y + 2.7,
      r.z + 11.77,
      4,
      0.8,
      0,
      root,
      "#546966",
    );
    const planter = this.box(
      "planter",
      r.x + Math.sign(r.x) * 5.5,
      y + 0.3,
      r.z + 10,
      0.65,
      0.6,
      0.65,
      olive,
      root,
    );
    for (let k = 0; k < 8; k++) {
      const leaf = MeshBuilder.CreateSphere(
        "plant leaf",
        { diameter: 1, segments: 5 },
        this.scene,
      );
      leaf.scaling.set(0.12, 0.8, 0.06);
      leaf.rotation.z = Math.sin(k) * 0.6;
      leaf.rotation.y = k;
      leaf.position.set(
        planter.position.x + Math.cos(k) * 0.14,
        y + 0.8,
        planter.position.z + Math.sin(k) * 0.14,
      );
      leaf.material = this.material("foliage", "#455e40");
      leaf.parent = root;
    }
  }
  focalRoom(r: Room, root: TransformNode) {
    const wall = this.mats.get("white")!,
      wood = this.mats.get("oak")!,
      metal = this.mats.get("metal")!;
    if (r.id === "F1-101") {
      this.sign(
        "CIVIC SEMINAR / DISCUSSION & EVIDENCE",
        r.x,
        r.y + 3.8,
        r.z + 11.75,
        10,
        0.8,
        0,
        root,
        "#3f6265",
      );
      for (const x of [-4, 0, 4]) {
        this.box(
          "seminar acoustic cloud",
          r.x + x,
          r.y + 4.7,
          r.z + 3,
          2.6,
          0.18,
          11,
          wood,
          root,
          false,
        );
        this.box(
          "project display rail",
          r.x + x,
          r.y + 2.7,
          r.z + 11.6,
          3,
          1.1,
          0.06,
          wall,
          root,
          false,
        );
      }
      for (const x of [-4, 4])
        this.box(
          "collaboration bench",
          r.x + x,
          r.y + 0.45,
          r.z + 9.4,
          3,
          0.2,
          0.6,
          wood,
          root,
        );
    } else if (r.id === "B1-104") {
      this.sign(
        "BIOMEDICAL LAB / OBSERVE · RECORD · EXPLAIN",
        r.x,
        r.y + 3.8,
        r.z + 11.7,
        11,
        0.8,
        0,
        root,
        "#405b54",
      );
      for (const x of [-3, 3]) {
        this.box(
          "lab preparation island",
          r.x + x,
          r.y + 0.9,
          r.z + 8.5,
          3,
          1.8,
          1.2,
          wall,
          root,
        );
        this.box(
          "lab durable surface",
          r.x + x,
          r.y + 1.85,
          r.z + 8.5,
          3.2,
          0.1,
          1.4,
          metal,
          root,
        );
        this.box(
          "lab basin",
          r.x + x,
          r.y + 1.91,
          r.z + 8.5,
          0.6,
          0.04,
          0.45,
          metal,
          root,
          false,
        );
      }
      this.box(
        "1978 utility riser",
        r.x - 7,
        r.y + 2.6,
        r.z + 9,
        0.3,
        5.2,
        0.3,
        metal,
        root,
      );
      this.sign(
        "TMAP / VENTILATION UPGRADE 2026",
        r.x,
        r.y + 2.6,
        r.z + 11.7,
        5,
        0.6,
        0,
        root,
        "#526453",
      );
    } else if (r.id === "B2-102") {
      this.sign(
        "CIVIC MEMORY / PROVENANCE · CONTEXT · OMISSIONS",
        r.x,
        r.y + 3.8,
        r.z + 11.7,
        11,
        0.8,
        0,
        root,
        "#665342",
      );
      for (const x of [-4, 0, 4]) {
        this.box(
          "archival consultation table",
          r.x + x,
          r.y + 0.78,
          r.z + 8.8,
          2.8,
          0.12,
          1.2,
          wood,
          root,
        );
        for (const side of [-1, 1])
          this.box(
            "consultation table base",
            r.x + x + side,
            r.y + 0.38,
            r.z + 8.8,
            0.1,
            0.76,
            0.7,
            metal,
            root,
            false,
          );
        this.box(
          "document cradle",
          r.x + x,
          r.y + 0.9,
          r.z + 8.8,
          0.65,
          0.1,
          0.5,
          wall,
          root,
          false,
        );
        this.sign(
          "SOURCE / FACSIMILE",
          r.x + x,
          r.y + 1,
          r.z + 8.5,
          1,
          0.25,
          Math.PI,
          root,
          "#665342",
        );
      }
    }
  }
  stairs() {
    const concrete = this.mats.get("concrete")!,
      metal = this.mats.get("metal")!;
    for (const district of districts)
      for (const high of [8, 0, -8, -16, -24]) {
        const startMesh = this.scene.meshes.length;
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
        const stairMeshes = this.scene.meshes.slice(startMesh);
        for (const m of stairMeshes) {
          m.position.x += district.x;
          m.position.z += district.z;
        }
        for (const material of [concrete, metal]) {
          const group = stairMeshes.filter(
            (m) => m instanceof Mesh && m !== ramp && m.material === material,
          ) as Mesh[];
          if (group.length) {
            const merged = Mesh.MergeMeshes(group, true, true);
            if (merged) merged.checkCollisions = false;
          }
        }
      }
  }
  buildConnections() {
    const concrete = this.mats.get("concrete")!,
      metal = this.mats.get("metal")!,
      wood = this.mats.get("oak")!,
      white = this.mats.get("white")!;
    for (const f of floors) {
      const root = new TransformNode("campus connectors " + f.id, this.scene);
      this.connections.push({ root, y: f.y });
      const floor = this.material(
          f.era === 2021 ? "terrazzo-light" : "terrazzo-old",
          f.era === 2021 ? "#c5c8bc" : "#ae9e87",
          0.4,
          true,
        ),
        wall = f.era === 2021 ? white : concrete;
      // Continuous bypass beside the stair wells, joining central/north/far-north districts.
      this.box("north spine", 4, f.y - 0.15, 211, 6, 0.3, 234, floor, root);
      for (const z of [140, 290]) {
        this.box("connector canopy", 4, f.y + 5.5, z, 10, 0.2, 38, wall, root);
        for (let k = -1; k <= 1; k++)
          this.box(
            "connector light",
            4,
            f.y + 5.1,
            z + k * 10,
            4,
            0.08,
            0.16,
            this.mats.get("led")!,
            root,
            false,
          );
      }
      this.box(
        "east west concourse",
        0,
        f.y - 0.15,
        140,
        204,
        0.3,
        10,
        floor,
        root,
      );
      this.box("concourse canopy", 0, f.y + 5.5, 140, 204, 0.3, 10, wall, root);
      for (let x = -96; x <= 96; x += 12) {
        this.box(
          "concourse LED",
          x,
          f.y + 5,
          140,
          4,
          0.08,
          0.2,
          this.mats.get("led")!,
          root,
          false,
        );
        if (Math.abs(x) > 26) {
          for (const side of [-1, 1]) {
            if (Math.abs(Math.abs(x) - 48) < 14) continue;
            this.box(
              "concourse side",
              x,
              f.y + 2.5,
              140 + side * 5,
              12,
              5,
              0.2,
              wall,
              root,
            );
          }
        }
      }
      this.box("commons floor", 0, f.y - 0.15, 140, 60, 0.3, 24, floor, root);
      this.box("commons ceiling", 0, f.y + 5.5, 140, 60, 0.3, 24, wall, root);
      for (const x of [-20, -12, 14, 22])
        for (const z of [132, 148]) {
          this.box("commons table", x, f.y + 0.82, z, 2, 0.1, 1.1, wood, root);
          this.box(
            "table base",
            x,
            f.y + 0.4,
            z,
            0.1,
            0.8,
            0.1,
            metal,
            root,
            false,
          );
          for (const side of [-1, 1]) {
            this.box(
              "commons bench",
              x,
              f.y + 0.45,
              z + side * 0.8,
              2,
              0.12,
              0.45,
              wood,
              root,
            );
          }
        }
      this.sign(
        `LEVEL ${f.id} / CENTRAL CONCOURSE\nWEST ←   |   NORTH ↑   |   EAST →`,
        0,
        f.y + 3.6,
        135.1,
        11,
        1.2,
        Math.PI,
        root,
      );
      this.sign("NORTH EXTENSION  ↑", 4, f.y + 3.7, 282, 7, 0.8, Math.PI, root);
      for (const r of supportRooms.filter((s) => s.floor === f.id)) {
        const front = r.front,
          back = r.z < 140 ? 111 : 169;
        this.box(
          r.name + " floor",
          r.x,
          f.y - 0.15,
          r.z,
          24,
          0.3,
          24,
          floor,
          root,
        );
        this.box(
          "support ceiling",
          r.x,
          f.y + 4.5,
          r.z,
          24,
          0.2,
          24,
          wall,
          root,
        );
        this.box(
          "support rear wall",
          r.x,
          f.y + 2.2,
          back,
          24,
          4.4,
          0.2,
          wall,
          root,
        );
        for (const side of [-1, 1]) {
          this.box(
            "support side",
            r.x + side * 12,
            f.y + 2.2,
            r.z,
            0.2,
            4.4,
            24,
            wall,
            root,
          );
          this.box(
            "support front",
            r.x + side * 6.8,
            f.y + 2.2,
            front,
            10.4,
            4.4,
            0.2,
            wall,
            root,
          );
        }
        const door = this.box(
          r.id + " door",
          r.x,
          f.y + 1.9,
          front,
          3.2,
          3.8,
          0.12,
          wood,
          root,
        );
        this.doors.push({
          id: r.id,
          mesh: door,
          open: false,
          locked: false,
          x: r.x,
          y: f.y,
          z: front,
          localZ: front,
          axis: "x",
        });
        this.sign(
          r.name.toUpperCase(),
          r.x,
          f.y + 3.9,
          front + (r.z < 140 ? 0.15 : -0.15),
          5,
          0.5,
          r.z < 140 ? Math.PI : 0,
          root,
        );
        if (r.name === "Restrooms") {
          for (let j = 0; j < 4; j++) {
            this.box(
              "stall partition",
              r.x - 8 + j * 4,
              f.y + 1.1,
              r.z,
              0.12,
              2.2,
              6,
              metal,
              root,
            );
            this.box(
              "ceramic fixture",
              r.x - 6 + j * 4,
              f.y + 0.45,
              r.z - 2,
              0.7,
              0.7,
              0.9,
              white,
              root,
            );
            this.box(
              "wash basin",
              r.x - 6 + j * 4,
              f.y + 0.9,
              r.z + 7,
              1,
              0.25,
              0.6,
              white,
              root,
            );
          }
        } else {
          for (let j = 0; j < 6; j++) {
            const x = r.x + ((j % 3) - 1) * 6,
              z = r.z + (j < 3 ? -5 : 5);
            this.box("work table", x, f.y + 0.85, z, 3, 0.1, 1.5, wood, root);
            this.box(
              "office chair",
              x,
              f.y + 0.5,
              z + 1,
              0.7,
              0.1,
              0.7,
              this.mats.get("upholstery")!,
              root,
              false,
            );
            this.box(
              "office chair back",
              x,
              f.y + 0.9,
              z + 1.3,
              0.7,
              0.8,
              0.1,
              this.mats.get("upholstery")!,
              root,
              false,
            );
            this.box(
              "document stack",
              x + 0.5,
              f.y + 0.93,
              z,
              0.5,
              0.06,
              0.4,
              white,
              root,
              false,
            );
            if (r.name.includes("Archive"))
              this.box(
                "reading box",
                x - 0.8,
                f.y + 1.05,
                z,
                0.6,
                0.4,
                0.5,
                this.material("archive board", "#b1a17e"),
                root,
                false,
              );
            else
              this.box(
                "office terminal",
                x,
                f.y + 1.15,
                z - 0.3,
                0.8,
                0.5,
                0.08,
                metal,
                root,
                false,
              );
          }
        }
      }
      const groups = new Map<number, Mesh[]>();
      for (const m of root.getChildMeshes()) {
        if (
          !(m instanceof Mesh) ||
          m.material instanceof StandardMaterial ||
          this.doors.some((d) => d.mesh === m)
        )
          continue;
        const list = groups.get(m.material!.uniqueId) ?? [];
        list.push(m);
        groups.set(m.material!.uniqueId, list);
      }
      for (const group of groups.values()) {
        const merged = Mesh.MergeMeshes(group, true, true);
        if (merged) {
          merged.parent = root;
          merged.checkCollisions = true;
        }
      }
    }
  }
  update(y: number, x = 0, z = 28) {
    for (const link of this.connections)
      link.root.setEnabled(Math.abs(link.y - y) < 12);
    for (const sector of this.sectors)
      sector.root.setEnabled(
        Math.abs(sector.y - y) < 12 &&
          Math.hypot(sector.x - x, sector.z + 43 - z) < 180,
      );
    this.lastStreaming++;
    if (this.lastStreaming % 12 !== 1) return;
    for (const f of floors)
      for (const d of districts) {
        const near =
          Math.abs(f.y - y) < 10 && Math.hypot(d.x - x, d.z + 43 - z) < 135;
        const id = `${f.id}:${d.id}`;
        if (near && !this.sectors.some((s) => s.id === id)) {
          this.buildFloor(f.id, d);
          return;
        }
      }
    for (const sector of [...this.sectors])
      if (
        Math.abs(sector.y - y) > 17 ||
        Math.hypot(sector.x - x, sector.z + 43 - z) > 225
      ) {
        const descendants = new Set(sector.root.getChildMeshes());
        const textures = new Set(
          [...descendants].map(
            (m) => (m.material as StandardMaterial)?.diffuseTexture,
          ),
        );
        for (const m of descendants)
          if (m.material instanceof StandardMaterial)
            m.material.dispose(true, true);
        this.doors = this.doors.filter((d) => !descendants.has(d.mesh));
        this.boards = this.boards.filter((b) => !textures.has(b.texture));
        this.liftDoors = this.liftDoors.filter((d) => !descendants.has(d));
        sector.root.dispose();
        this.sectors = this.sectors.filter((s) => s !== sector);
      }
  }
  setDoor(id: string, open: boolean) {
    const d = this.doors.find((d) => d.id === id);
    if (d?.locked) return;
    this.doorStates.set(id, open);
    if (!d) return;
    d.open = open;
    if (d.pivot)
      d.pivot.rotation.y =
        (Number(open) * d.pivot.metadata.swing * Math.PI) / 2;
    else if (d.axis === "x") d.mesh.position.x = d.x + (open ? 3.3 : 0);
    else d.mesh.position.z = (d.localZ ?? d.z) + (open ? 3.3 : 0);
    d.mesh.checkCollisions = !open;
  }
}
