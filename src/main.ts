import {
  Engine,
  NullEngine,
  PointLight,
  DefaultRenderingPipeline,
  Scene,
  UniversalCamera,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  TransformNode,
  Ray,
} from "@babylonjs/core";
import { Environment } from "./architecture/Environment";
import { GameClock, lessonPhase } from "./core/GameClock";
import { EventBus } from "./core/EventBus";
import { loadLocal, saveLocal, type Save } from "./core/SaveSystem";
import {
  floors,
  floorAt,
  rooms,
  districts,
  districtAt,
  type FloorId,
} from "./campus/plan";
import { Atmosphere } from "./audio/Atmosphere";
import { CampusSimulation } from "./npc/CampusSimulation";
import {
  TeacherController,
  isSeatedActivity,
  atSeat,
} from "./npc/ClassroomController";
import { StaffController } from "./npc/StaffController";
import { Wayfinding } from "./ui/Wayfinding";
import { AvatarPool } from "./rendering/AvatarPool";
import { Avatar } from "./npc/Avatar";
import {
  ACTIVE_STUDENTS,
  identity,
  studentState,
  upcoming,
} from "./npc/NPCScheduler";
import "./ui/style.css";
import { CompatibilityRenderer } from "./rendering/CompatibilityRenderer";
const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const ui = document.querySelector<HTMLDivElement>("#ui")!;
ui.innerHTML = `<div class="hud"><div class="top"><div class="brand"><div class="eyebrow">Living campus · September 2026</div><strong>TEMHS</strong><small>Travis Elementary Middle High School</small></div><div class="clock"><div id="time" class="time">08:52</div><small id="block">Academic Pulse 1</small><small id="date">Cycle day 1 / 13</small></div></div><div id="notice" class="notice"><span class="eyebrow">Campus operations</span><div id="announcement">Instruction is in progress. Passage follows this Pulse.</div></div><div class="reticle"></div><div id="hint" class="hint hidden"></div><div id="panel" class="panel hidden"></div><div id="debug" class="debug hidden"></div><div class="bottom"><div class="location"><strong id="location">Level -2 · Deep academic core</strong><span id="activity">Observer · 1978 architecture</span></div><button data-panel="map"><span class="key">M</span>Map</button><button data-panel="schedule"><span class="key">T</span>Schedule</button><button data-panel="settings">Controls</button><button id="pause">Pause</button></div><div id="welcome" class="welcome"><div class="eyebrow">TEMHS / Living campus alpha 0.3</div><h1>A school in motion.</h1><p>Begin inside the deep academic core. Observe a lesson, follow the next Passage, and travel up to the 2021 civic floor.</p><button id="enter">Enter campus</button><small>WASD to walk · Mouse to look · E to interact<br>Desktop keyboard and mouse recommended<br>Six levels · Five districts · Original articulated characters</small></div></div>`;
const $ = (id: string) => document.getElementById(id)!;
try {
  start();
} catch (error) {
  ui.innerHTML = `<div class="error"><h1>The simulator could not start.</h1><p>WebGL2 is required. Enable hardware acceleration and reload.</p><pre></pre></div>`;
  ui.querySelector("pre")!.textContent = String(error);
}
function start() {
  const gpu = Engine.IsSupported;
  const engine = gpu
    ? new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
    : new NullEngine({
        renderWidth: 960,
        renderHeight: 540,
        textureSize: 512,
        deterministicLockstep: false,
        lockstepMaxSteps: 4,
      });
  const compatibility = gpu ? null : new CompatibilityRenderer(canvas);
  if (!gpu) {
    const badge = document.createElement("div");
    badge.className = "renderer-badge";
    badge.textContent =
      "Compatibility preview · simplified lighting · WebGL unavailable";
    document.querySelector(".hud")!.append(badge);
  }
  const scene = new Scene(engine);
  const atmosphere = new Atmosphere();
  scene.clearColor = new Color4(0.49, 0.63, 0.69, 1);
  scene.collisionsEnabled = true;
  const camera = new UniversalCamera(
    "observer",
    new Vector3(-14, -14.3, 28),
    scene,
  );
  camera.minZ = 0.08;
  camera.maxZ = 220;
  camera.fov = 1.14;
  camera.rotation.y = Math.PI;
  camera.inputs.clear();
  scene.activeCamera = camera;
  const hemi = new HemisphericLight(
    "institutional ambient",
    new Vector3(0.2, 1, 0.3),
    scene,
  );
  hemi.intensity = 1.1;
  hemi.groundColor = new Color3(0.48, 0.46, 0.4);
  const sun = new DirectionalLight(
    "daylight",
    new Vector3(-0.5, -1, 0.35),
    scene,
  );
  sun.intensity = 0.4;
  scene.imageProcessingConfiguration.exposure = 1.15;
  scene.imageProcessingConfiguration.contrast = 1.08;
  const roomLights = gpu
    ? Array.from({ length: 4 }, (_, i) => {
        const l = new PointLight(
          "local ceiling light " + i,
          new Vector3(0, 0, 0),
          scene,
        );
        l.diffuse = new Color3(1, 0.95, 0.84);
        l.intensity = 0.75;
        l.range = 18;
        return l;
      })
    : [];
  if (gpu) {
    const pipeline = new DefaultRenderingPipeline(
      "restrained interior",
      true,
      scene,
      [camera],
    );
    pipeline.fxaaEnabled = true;
    pipeline.samples = 1;
  }
  const env = new Environment(scene);
  const player = MeshBuilder.CreateBox(
    "observer collider",
    { width: 0.7, height: 1.7, depth: 0.7 },
    scene,
  );
  player.isVisible = false;
  player.ellipsoid = new Vector3(0.35, 0.85, 0.35);
  player.position.set(-14, -15.15, 28);
  const clock = new GameClock();
  clock.paused = true;
  const simulation = new CampusSimulation(clock);
  const wayfinding = new Wayfinding();
  const bus = new EventBus<string>();
  let hold = false,
    quality = "medium",
    panel = "",
    started = false,
    debug = false,
    lastBlock = "",
    lastUI = 0,
    lastBoard = "",
    autoSave = 0,
    walkTime = 0;
  let verticalSpeed = 0;
  let yaw = Math.PI,
    pitch = 0;
  const keys = new Set<string>();
  const avatarPool = new AvatarPool(scene, env);
  let avatars = new Map<number, Avatar>();
  const teacherControllers = new Map(
    rooms.map((r) => [r.id, new TeacherController(r)]),
  );
  const teachers = new Map<
    string,
    { avatar: Avatar; room: (typeof rooms)[number] }
  >();
  const staff = floors
    .flatMap((f, i) => [
      { index: 31000 + i * 3, role: "Custodian", floor: f.id, z: 36 },
      { index: 31001 + i * 3, role: "Campus supervisor", floor: f.id, z: 140 },
      {
        index: 31002 + i * 3,
        role: f.id < 0 ? "Facilities technician" : "Student services",
        floor: f.id,
        z: 157,
      },
    ])
    .map((s) => ({
      ...s,
      avatar: new Avatar(scene, env, s.index),
      controller: new StaffController(s.index, s.role, s.floor, s.z),
    }));
  let elevator: { bank: string } | null = null;
  let liftDistrict: (typeof districts)[number] = districts[0];
  const cabin = new TransformNode("moving lift cabin", scene);
  const cabinMat = env.mats.get("metal")!;
  env.box("cabin floor", 3, -0.15, -11, 6, 0.3, 6, cabinMat, cabin);
  env.box("cabin back", 3, 2.5, -14, 6, 5, 0.2, cabinMat, cabin);
  env.box("cabin side", 0, 2.5, -11, 0.2, 5, 6, cabinMat, cabin);
  env.box("cabin side", 6, 2.5, -11, 0.2, 5, 6, cabinMat, cabin);
  const cabinFront = env.box(
    "cabin front",
    3,
    2.5,
    -8,
    6,
    5,
    0.2,
    cabinMat,
    cabin,
  );
  cabin.setEnabled(false);
  function announce(message: string) {
    $("announcement").textContent = message;
  }
  bus.on(announce);
  function unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
    keys.clear();
  }
  function hidePanel() {
    panel = "";
    $("panel").classList.add("hidden");
  }
  function showPanel(which: string) {
    unlock();
    panel = which;
    const p = $("panel");
    p.classList.remove("hidden");
    p.innerHTML =
      '<button class="close" id="close-panel" aria-label="Close panel">×</button>';
    const f = floorAt(player.position.y - 0.85);
    if (which === "map") {
      p.innerHTML += `<div class="eyebrow">Campus wayfinding</div><h2>${f.name}</h2><svg class="map" viewBox="-130 -25 260 440" aria-label="Current floor map"><path d="M4 90 V330 M-102 140 H102" stroke="#829387" stroke-width="6" fill="none"/>${districts.map((d) => `<rect class="corridor" x="${d.x - 6}" y="${d.z}" width="12" height="130"/><text x="${d.x - 24}" y="${d.z - 8}" font-size="7">${d.name}</text>`).join("")}${rooms
        .filter((r) => r.floor === f.id)
        .map(
          (r) =>
            `<rect class="room" x="${r.x - 8}" y="${r.z - 11}" width="16" height="22"/>`,
        )
        .join("")}<polyline points="${wayfinding.path
        .filter((p) => Math.abs(p.y - f.y) < 0.1)
        .map((p) => `${p.x},${p.z}`)
        .join(
          " ",
        )}" fill="none" stroke="#c5a151" stroke-width="2"/><circle class="you" cx="${player.position.x}" cy="${player.position.z}" r="3"/></svg><p>Five districts per level, connected by the north spine and east–west concourse. Each district has stairs at its north end and a lift at its south end.</p><div class="row"><span>Playable levels</span><span>2 · 1 · -1 · -2 · -3 · -4</span></div><p>${simulation.closures.size ? "TMAP detour: Central stairs between Floor 1 and Level -1 are closed." : "Campus routes open."}</p><label for="route-room">Find a classroom</label><select id="route-room">${rooms.map((r) => `<option value="${r.id}" ${wayfinding.destination === r.id ? "selected" : ""}>${r.id} · ${r.subject} · ${r.wing}</option>`).join("")}</select><button id="route-start">Show walking route</button><label for="visit-floor">Observer destination</label><select id="visit-floor">${floors.map((l) => `<option value="${l.id}" ${l.id === f.id ? "selected" : ""}>${l.id}: ${l.name}</option>`).join("")}</select><select id="visit-district" aria-label="Destination district">${districts.map((d) => `<option value="${d.id}">${d.name}</option>`).join("")}</select><button id="visit">Move observer to destination</button><p class="muted">Observer travel leaves student journeys unchanged. Levels -5 through -30 are outside this build.</p>`;
    } else if (which === "schedule") {
      p.innerHTML += `<div class="eyebrow">13-day master clock</div><h2>Cycle day ${clock.cycleDay}</h2>${upcoming(
        clock,
      )
        .map(
          (b) =>
            `<div class="row"><span>${String(Math.floor(b.start / 60)).padStart(2, "0")}:${String(b.start % 60).padStart(2, "0")}</span><span>${b.label}</span></div>`,
        )
        .join(
          "",
        )}<p>Meal groups rotate separately. Northward Release staggers movement. Still Bell V holds classrooms.</p><p class="muted">Bell times are editable development defaults, not established TEMHS canon.</p><div class="actions"><button id="next">Next block</button><button id="hold">${hold ? "Release" : "Activate"} Still Bell V</button></div>`;
    } else if (which === "settings") {
      p.innerHTML += `<div class="eyebrow">Observer controls</div><h2>Explore TEMHS</h2><div class="row"><span>Walk / brisk walk</span><span>WASD / Shift</span></div><div class="row"><span>Look / release mouse</span><span>Mouse / Esc</span></div><div class="row"><span>Alternative look</span><span>Arrow keys</span></div><div class="row"><span>Door, lift, citizen</span><span>E</span></div><div class="row"><span>Diagnostics</span><span>F3</span></div><div class="row"><label for="speed">Clock speed</label><select id="speed"><option value="1">Real time</option><option value="10">10×</option><option value="60">60×</option></select></div><div class="row"><label for="quality">Graphics</label><select id="quality"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div><div class="actions"><button id="audio">Enable ambience</button><button id="save">Save</button><button id="load">Load save</button><button id="tour">Guided Passage</button><button id="tmapping">${simulation.closures.size ? "Reopen central stairs" : "TMAP stair detour"}</button></div><p class="muted">Saves stay in this browser. Original articulated animal models. Saves include journeys and queues. Compatibility mode uses reduced detail.</p>`;
    } else if (which === "lift") {
      p.innerHTML += `<div class="eyebrow">Central passenger lift</div><h2>Select destination</h2><div class="lift">${[2, 1, -1, -2, -3, -4].map((id) => `<button data-floor="${id}" ${!floors.some((f) => f.id === id) ? "disabled" : ""}>${id}</button>`).join("")}</div><p>Levels -5 through -30 require authorized transfer and are outside this build.</p>`;
    }
    $("close-panel").onclick = hidePanel;
    if ($("route-start"))
      $("route-start").onclick = () => {
        const id = ($("route-room") as HTMLSelectElement).value;
        const ok = wayfinding.setDestination(
          id,
          {
            x: player.position.x,
            y: player.position.y - 0.85,
            z: player.position.z,
          },
          simulation.closures,
        );
        bus.emit(
          ok
            ? `Walking route to ${id} is shown in gold on the map.`
            : "No route is available. Ask campus staff for directions.",
        );
        showPanel("map");
      };
    if ($("next"))
      $("next").onclick = () => {
        clock.next();
        simulation.update(clock, 0, hold);
        showPanel("schedule");
      };
    if ($("hold"))
      $("hold").onclick = () => {
        hold = !hold;
        bus.emit(
          hold
            ? "Still Bell V: remain in assigned rooms. Instruction continues."
            : "Still Bell V cleared. Follow posted Passage routes.",
        );
        showPanel("schedule");
      };
    if ($("speed")) {
      ($("speed") as HTMLSelectElement).value = String(clock.speed);
      $("speed").onchange = () =>
        (clock.speed = Number(($("speed") as HTMLSelectElement).value));
    }
    if ($("quality")) {
      ($("quality") as HTMLSelectElement).value = quality;
      $("quality").onchange = () => {
        quality = ($("quality") as HTMLSelectElement).value;
        engine.setHardwareScalingLevel(
          quality === "low" ? 1.8 : quality === "high" ? 1 : 1.25,
        );
      };
    }
    if ($("audio"))
      $("audio").onclick = async () => {
        const enabled = await atmosphere.toggle();
        $("audio").textContent = enabled ? "Mute ambience" : "Enable ambience";
      };
    if ($("save"))
      $("save").onclick = () => {
        try {
          saveLocal(snapshot());
          bus.emit("Campus state saved in this browser.");
        } catch {
          bus.emit("Save unavailable: browser storage could not be written.");
        }
      };
    if ($("load"))
      $("load").onclick = () => {
        try {
          const s = loadLocal();
          if (s) {
            applySave(s);
            hidePanel();
            bus.emit("Saved campus state restored.");
          } else bus.emit("No saved campus state exists yet.");
        } catch (e) {
          bus.emit(String(e));
        }
      };
    if ($("tmapping"))
      $("tmapping").onclick = () => {
        const closed = !simulation.closures.has("stairs:central:0");
        simulation.setClosure("stairs:central:0", closed);
        env.setStairClosure(closed);
        if (wayfinding.destination)
          wayfinding.setDestination(
            wayfinding.destination,
            {
              x: player.position.x,
              y: player.position.y - 0.85,
              z: player.position.z,
            },
            simulation.closures,
          );
        bus.emit(
          closed
            ? "TMAP inspection: Floor 1 / Level -1 central stair closed. Use the lift or another district stair."
            : "Central stair inspection complete. Normal routes restored.",
        );
        showPanel("settings");
      };
    if ($("tour"))
      $("tour").onclick = () => {
        clock.minute = 534.7;
        simulation.reset(clock);
        elevator = null;
        env.setStairClosure(false);
        clock.speed = 10;
        clock.paused = false;
        hold = false;
        player.position.set(-14, -15.15, 28);
        yaw = Math.PI;
        hidePanel();
        bus.emit(
          "Observe closure, then follow students through Passage. The north stairs reach the civic floor.",
        );
      };
    const visit = p.querySelector<HTMLButtonElement>("#visit");
    if (visit)
      visit.onclick = () => {
        if (elevator) {
          bus.emit("Finish the lift journey before observer travel.");
          return;
        }
        const level = floors.find(
          (l) =>
            l.id ===
            Number(
              (p.querySelector("#visit-floor") as HTMLSelectElement).value,
            ),
        )!;
        const district = districts.find(
          (d) =>
            d.id ===
            (p.querySelector("#visit-district") as HTMLSelectElement).value,
        )!;
        env.update(level.y, district.x, district.z + 28);
        if (!env.sectors.some((s) => s.id === `${level.id}:${district.id}`))
          env.buildFloor(level.id, district);
        player.position.set(district.x, level.y + 0.85, district.z + 28);
        yaw = 0;
        pitch = 0;
        hidePanel();
      };
    p.querySelectorAll<HTMLButtonElement>("[data-floor]").forEach(
      (b) =>
        (b.onclick = () => {
          const target = floors.find((f) => f.id === Number(b.dataset.floor))!;
          if (target.id === f.id) {
            hidePanel();
            return;
          }
          const l = simulation.lifts.find(
            (l) => l.state.bank === liftDistrict.id,
          )!;
          l.request("observer", f.id, target.id);
          elevator = { bank: liftDistrict.id };
          hidePanel();
          bus.emit(
            `Waiting for the ${liftDistrict.name} lift to ${target.id}.`,
          );
        }),
    );
  }
  function snapshot(): Save {
    return {
      version: 3,
      simulation: simulation.snapshot(),
      teachers: [...teacherControllers.values()].map((t) => t.snapshot()),
      staff: staff.map((s) => s.controller.snapshot()),
      seed: 20260907,
      day: clock.day,
      minute: clock.minute,
      speed: clock.speed,
      player: {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
      },
      rotation: { x: pitch, y: yaw, z: 0 },
      hold,
      doors: [...env.doorStates.entries()]
        .filter(([, open]) => open)
        .map(([id]) => id),
      quality,
    };
  }
  function applySave(s: Save) {
    clock.day = s.day;
    clock.minute = s.minute;
    clock.speed = s.speed;
    player.position.copyFromFloats(s.player.x, s.player.y, s.player.z);
    verticalSpeed = 0;
    const restoredFloor = floorAt(s.player.y - 0.85),
      restoredDistrict = districtAt(s.player.x, s.player.z);
    if (
      !env.sectors.some(
        (sector) => sector.id === `${restoredFloor.id}:${restoredDistrict.id}`,
      )
    )
      env.buildFloor(restoredFloor.id, restoredDistrict);
    env.update(restoredFloor.y, s.player.x, s.player.z);
    pitch = s.rotation.x;
    yaw = s.rotation.y;
    hold = s.hold;
    if (s.simulation) simulation.restore(s.simulation);
    else simulation.reset(clock);
    for (const r of rooms)
      teacherControllers.set(r.id, new TeacherController(r));
    for (const record of s.teachers ?? [])
      teacherControllers.get(record.room)!.restore(record);
    for (const s of staff) {
      s.controller = new StaffController(s.index, s.role, s.floor, s.z);
      const record = saveStaff(s.index);
      if (record) s.controller.restore(record);
    }
    function saveStaff(index: number) {
      return s.staff?.find((record) => record.index === index);
    }
    const riddenLift = simulation.lifts.find((l) => l.passenger("observer"));
    elevator = riddenLift ? { bank: riddenLift.state.bank } : null;
    env.setStairClosure(simulation.closures.has("stairs:central:0"));
    lastBlock = `${clock.day}-${clock.block.start}-${hold}`;
    env.passage = clock.block.kind === "PASSAGE" && !hold;
    wayfinding.destination = "";
    wayfinding.path = [];
    quality = s.quality;
    env.doorStates.clear();
    for (const id of s.doors) env.doorStates.set(id, true);
    for (const d of env.doors) env.setDoor(d.id, s.doors.includes(d.id));
    engine.setHardwareScalingLevel(
      quality === "low" ? 1.8 : quality === "high" ? 1 : 1.25,
    );
  }
  $("enter").onclick = () => {
    started = true;
    clock.paused = false;
    $("welcome").classList.add("hidden");
    canvas.requestPointerLock()?.catch(() => {});
  };
  document
    .querySelectorAll<HTMLButtonElement>("[data-panel]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          panel === b.dataset.panel
            ? hidePanel()
            : showPanel(b.dataset.panel!)),
    );
  $("pause").onclick = () => {
    clock.paused = !clock.paused;
    $("pause").textContent = clock.paused ? "Resume" : "Pause";
  };
  canvas.onclick = () => {
    if (started && !panel) canvas.requestPointerLock()?.catch(() => {});
  };
  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === canvas) {
      yaw += e.movementX * 0.002;
      pitch = Math.max(-1.4, Math.min(1.4, pitch + e.movementY * 0.002));
    }
  });
  document.addEventListener("keydown", (e) => {
    if ((e.target as HTMLElement).tagName === "SELECT") return;
    keys.add(e.code);
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "F3",
        "Space",
      ].includes(e.code)
    )
      e.preventDefault();
    if (e.repeat) return;
    if (e.code === "KeyM") panel === "map" ? hidePanel() : showPanel("map");
    if (e.code === "KeyT")
      panel === "schedule" ? hidePanel() : showPanel("schedule");
    if (e.code === "F3") {
      debug = !debug;
      $("debug").classList.toggle("hidden", !debug);
    }
    if (e.code === "Escape") hidePanel();
    if (e.code === "KeyE" && started && !elevator) interact();
  });
  document.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());
  function lineOfSight(
    point: { x: number; y: number; z: number },
    limit: number,
  ) {
    const target = new Vector3(point.x, point.y + 1.2, point.z),
      origin = camera.position;
    const delta = target.subtract(origin),
      distance = delta.length();
    if (distance > limit) return false;
    const hit = scene.pickWithRay(
      new Ray(origin, delta.normalize(), Math.max(0, distance - 0.45)),
      (m) => m.checkCollisions && m.isEnabled() && m !== player,
    );
    return !hit?.hit;
  }
  function nearby() {
    const f = floorAt(player.position.y - 0.85);
    const bank = districts.find(
      (d) =>
        Math.hypot(player.position.x - d.x - 3, player.position.z - d.z + 8) <
        7,
    );
    if (bank && lineOfSight({ x: bank.x + 3, y: f.y, z: bank.z - 6 }, 8)) {
      liftDistrict = bank;
      return { kind: "lift", label: `E · Use ${bank.name} lift` };
    }
    const door = env.doors.find(
      (d) =>
        Math.abs(d.y - f.y) < 1 &&
        Math.hypot(d.x - player.position.x, d.z - player.position.z) < 4 &&
        lineOfSight(d, 4.5),
    );
    if (door)
      return {
        kind: "door",
        label: door.locked
          ? "E · Utility / access restricted"
          : `E · ${door.open ? "Close" : "Open"} ${door.id}`,
        door,
      };
    let nearest: { a: Avatar; distance: number } | undefined;
    for (const a of avatars.values()) {
      const d = Vector3.Distance(a.root.position, player.position);
      if (
        d < 3.5 &&
        lineOfSight(a.root.position, 4) &&
        (!nearest || d < nearest.distance)
      )
        nearest = { a, distance: d };
    }
    if (nearest)
      return {
        kind: "npc",
        label: "E · Speak with " + identity(nearest.a.index).name,
        npc: nearest.a.index,
      };
    return null;
  }
  function interact() {
    const n = nearby();
    if (!n) return;
    if (n.kind === "lift") {
      showPanel("lift");
    } else if (n.door) {
      if (n.door.locked)
        bus.emit("Utility access is limited to infrastructure personnel.");
      else if (hold) bus.emit("Still Bell V: classroom doors remain closed.");
      else env.setDoor(n.door.id, !n.door.open);
    } else if (n.npc !== undefined) {
      const npc = identity(n.npc),
        state = simulation.state(n.npc);
      bus.emit(
        `${npc.name} · ${npc.species}, grade ${npc.grade}: “${state.walking ? `I’m heading to ${state.destination.id} for ${state.destination.subject}.` : hold ? "We are staying here until Still Bell V clears." : `We’re working on ${state.room.subject.toLowerCase()} this Pulse.`}”`,
      );
    }
  }
  let cachedStates = Array.from({ length: ACTIVE_STUDENTS }, (_, i) =>
    studentState(i, clock),
  );
  let simTick = 0;
  engine.setHardwareScalingLevel(1.25);
  engine.runRenderLoop(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1);
    const simStart = clock.day * 86400 + clock.minute * 60;
    clock.tick(dt, hold);
    const simElapsed = clock.day * 86400 + clock.minute * 60 - simStart;
    simulation.update(clock, simElapsed, hold, {
      x: player.position.x,
      y: player.position.y - 0.85,
      z: player.position.z,
    });
    if (!clock.paused && simElapsed > 0) walkTime += dt;
    for (const controller of teacherControllers.values())
      controller.update(clock, simElapsed, hold);
    const f = floorAt(player.position.y - 0.85);
    if (started && !panel && !elevator) {
      if (keys.has("ArrowLeft")) yaw -= dt * 1.5;
      if (keys.has("ArrowRight")) yaw += dt * 1.5;
      if (keys.has("ArrowUp")) pitch = Math.max(-1.4, pitch - dt);
      if (keys.has("ArrowDown")) pitch = Math.min(1.4, pitch + dt);
      const forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
        side = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
      const norm = Math.hypot(forward, side) || 1;
      const speed = keys.has("ShiftLeft") ? 2.7 : 1.4;
      verticalSpeed = Math.max(-20, verticalSpeed - 9.81 * dt);
      const beforeY = player.position.y;
      player.moveWithCollisions(
        new Vector3(
          ((Math.sin(yaw) * forward + Math.cos(yaw) * side) * speed * dt) /
            norm,
          verticalSpeed * dt,
          ((Math.cos(yaw) * forward - Math.sin(yaw) * side) * speed * dt) /
            norm,
        ),
      );
      if (
        Math.abs(player.position.y - beforeY) <
        Math.abs(verticalSpeed * dt) * 0.5
      )
        verticalSpeed = 0;
      if (player.position.y < -37) {
        player.position.set(0, -15.15, 82);
        bus.emit("Observer returned to the nearest safe route.");
      }
    }
    if (elevator) {
      const l = simulation.lifts.find((l) => l.state.bank === elevator!.bank)!;
      const p = l.passenger("observer");
      const moveTo = (point: { x: number; y: number; z: number }) => {
        const goal = new Vector3(point.x, point.y + 0.85, point.z),
          delta = goal.subtract(player.position),
          distance = delta.length();
        if (distance > 0.01)
          player.position.addInPlace(
            delta.scale(Math.min(distance, simElapsed * 1.4) / distance),
          );
        return distance < 0.08;
      };
      if (p?.phase === "waiting") {
        if (moveTo(l.lobbyPoint("observer"))) l.beginBoard("observer");
      } else if (p?.phase === "boarding") {
        if (moveTo(l.cabinPoint("observer"))) l.board("observer");
      } else if (p?.phase === "riding") {
        const point = l.cabinPoint("observer");
        player.position.set(point.x, point.y + 0.85, point.z);
      } else if (p?.phase === "alighting") {
        const floor = floors.find((f) => f.id === p.to)!;
        if (!env.sectors.some((s) => s.id === `${floor.id}:${l.district.id}`))
          env.buildFloor(floor.id, l.district);
        if (moveTo({ x: l.district.x + 1.4, y: floor.y, z: l.district.z - 4 }))
          l.finishExit("observer");
      } else {
        l.cancel("observer");
        elevator = null;
        bus.emit("Lift arrived. Continue into the academic corridor.");
      }
      cabin.setEnabled(
        p?.phase === "riding" ||
          p?.phase === "boarding" ||
          p?.phase === "alighting",
      );
      cabin.position.set(l.district.x, l.state.y, l.district.z);
      cabinFront.setEnabled(!l.doorsOpen);
      verticalSpeed = 0;
    } else cabin.setEnabled(false);
    camera.position.copyFrom(player.position).addInPlaceFromFloats(0, 0.83, 0);
    camera.rotation.set(pitch, yaw, 0);
    env.update(player.position.y - 0.85, player.position.x, player.position.z);
    sun.intensity = f.id > 0 ? 0.5 : 0.05;
    const nearRooms = rooms
      .filter((r) => r.floor === f.id)
      .sort(
        (a, b) =>
          Math.hypot(a.x - player.position.x, a.z - player.position.z) -
          Math.hypot(b.x - player.position.x, b.z - player.position.z),
      );
    roomLights.forEach((light, i) => {
      const r = nearRooms[i];
      light.position.set(r.x, r.y + 4.3, r.z);
    });
    atmosphere.update(
      f.era === 1978,
      clock.block.kind === "PASSAGE",
      keys.has("KeyW") ||
        keys.has("KeyA") ||
        keys.has("KeyS") ||
        keys.has("KeyD"),
    );
    for (const d of env.liftDoors) {
      const l = simulation.lifts.find(
        (l) => l.state.bank === d.metadata.district,
      )!;
      const open = l.doorsOpen && l.state.floor === d.metadata.floor;
      d.position.x =
        d.metadata.baseX + (open ? (d.metadata.baseX < 3 ? -2.9 : 2.9) : 0);
      d.checkCollisions = !open;
    }

    const blockKey = `${clock.day}-${clock.block.start}-${hold}`;
    if (blockKey !== lastBlock) {
      env.passage = clock.block.kind === "PASSAGE" && !hold;
      lastBlock = blockKey;
      if (started) atmosphere.bell();
      for (const d of env.doors)
        if (!d.locked)
          env.setDoor(d.id, clock.block.kind === "PASSAGE" && !hold);
      if (!hold)
        bus.emit(
          clock.block.kind === "PASSAGE"
            ? "Passage begins. Northward Release: allow earlier cohorts to clear intersections."
            : clock.block.kind === "MEAL ROTATION"
              ? "Meal rotations in progress. Follow your assigned group."
              : `${clock.block.label}. ${lessonPhase(clock) === "PACKING" ? "Prepare for Passage." : "Instruction and campus operations continue."}`,
        );
    }
    for (const d of env.doors) {
      if (d.locked || hold) continue;
      const passing = simulation.agents.some(
        (a) =>
          a.path.length > 0 &&
          Math.abs(a.point.y - d.y) < 0.5 &&
          Math.hypot(a.point.x - d.x, a.point.z - d.z) < 2.8,
      );
      if (passing && !d.open) env.setDoor(d.id, true);
    }
    simTick += dt;
    if (simTick > 0.07) {
      simTick = 0;
      cachedStates = simulation.agents.map((_, i) => simulation.state(i));
      const limit = !gpu
        ? 14
        : quality === "low"
          ? 64
          : quality === "high"
            ? 160
            : 112;
      const visible = cachedStates
        .map((s, i) => ({
          s,
          i,
          d: Math.hypot(
            s.point.x - player.position.x,
            s.point.z - player.position.z,
          ),
        }))
        .filter(
          (o) =>
            Math.abs(o.s.point.y - f.y) < 5 &&
            o.d < (avatars.has(o.i) ? 90 : 75) &&
            o.s.activity !== "Released" &&
            o.s.activity !== "Riding lift",
        )
        .sort((a, b) => a.d - b.d)
        .slice(0, limit);
      const wanted = new Set(visible.map((v) => v.i));
      for (const [i, a] of avatars)
        if (!wanted.has(i)) {
          avatarPool.release(a);
          avatars.delete(i);
        }
      for (const o of visible) {
        if (!avatars.has(o.i)) avatars.set(o.i, avatarPool.acquire(o.i));
        const a = avatars.get(o.i)!;
        a.root.position.set(o.s.point.x, o.s.point.y, o.s.point.z);
        a.root.rotation.y = o.s.heading;
      }
    }
    for (const [i, a] of avatars) {
      const s = simulation.state(i);
      a.root.position.set(s.point.x, s.point.y, s.point.z);
      a.root.rotation.y = s.heading;
      a.gesture =
        s.activity === "Discussing"
          ? "discussion"
          : s.activity === "Packing"
            ? "packing"
            : s.activity === "Typing"
              ? "typing"
              : s.activity === "Reading"
                ? "reading"
                : s.activity === "Writing"
                  ? "writing"
                  : "listening";
      const seated =
        isSeatedActivity(s.activity) ||
        (s.activity === "STILL BELL V" && atSeat(s.point, s.room, i));
      a.pose(walkTime, s.walking, seated, false);
    }

    for (const r of rooms) {
      const active =
        Math.abs(r.y - f.y) < 5 &&
        Math.hypot(r.x - player.position.x, r.z - player.position.z) <
          (gpu ? 45 : 19);
      if (active && !teachers.has(r.id))
        teachers.set(r.id, {
          avatar: new Avatar(scene, env, 30000 + rooms.indexOf(r)),
          room: r,
        });
    }
    for (const t of teachers.values()) {
      const active =
        Math.abs(t.room.y - f.y) < 5 &&
        Math.hypot(t.room.x - player.position.x, t.room.z - player.position.z) <
          (gpu ? 45 : 19);
      t.avatar.root.setEnabled(active);
      if (!active) {
        t.avatar.root.dispose();
        teachers.delete(t.room.id);
        continue;
      }
      if (active) {
        const controller = teacherControllers.get(t.room.id)!;

        t.avatar.root.position.set(
          controller.point.x,
          controller.point.y,
          controller.point.z,
        );
        t.avatar.root.rotation.y = controller.heading;
        t.avatar.pose(walkTime, controller.walking, false, true);
      }
    }
    for (const s of staff) {
      s.controller.update(
        simElapsed,
        clock.block.kind === "PASSAGE",
        simulation.closures.size > 0,
      );
      const state = s.controller.state;
      s.avatar.root.setEnabled(
        s.floor === f.id &&
          Math.hypot(
            player.position.x - state.point.x,
            player.position.z - state.point.z,
          ) < (gpu ? 65 : 25),
      );
      s.avatar.root.position.set(state.point.x, state.point.y, state.point.z);
      s.avatar.root.rotation.y = state.heading;
      s.avatar.pose(
        walkTime,
        state.walking,
        false,
        !state.walking && s.role !== "Custodian",
      );
    }
    lastUI += dt;
    if (started) autoSave += dt;
    if (lastUI > 0.25) {
      lastUI = 0;
      $("time").textContent = clock.time;
      $("block").textContent = hold ? "Still Bell V" : clock.block.label;
      $("date").textContent =
        `${clock.date} · Cycle day ${clock.cycleDay} / 13`;
      $("location").textContent =
        `${f.id > 0 ? "Floor" : "Level"} ${f.id} · ${f.name}`;
      $("activity").textContent =
        `Observer · ${f.era} architecture · ${lessonPhase(clock).toLowerCase()}`;
      $("pause").textContent = clock.paused ? "Resume" : "Pause";
      if (wayfinding.destination) {
        const position = {
          x: player.position.x,
          y: player.position.y - 0.85,
          z: player.position.z,
        };
        wayfinding.update(position);
        const next = wayfinding.next,
          distance = wayfinding.remaining(position);
        $("activity").textContent = next
          ? `${wayfinding.destination} · ${Math.round(distance)} m remaining · next waypoint Level ${floorAt(next.y).id}`
          : `Arrived at ${wayfinding.destination}`;
      }
      const n = nearby();
      $("hint").textContent = n?.label ?? "";
      $("hint").classList.toggle("hidden", !n || !!panel || !started);
      if (debug)
        $("debug").textContent =
          `${Math.round(engine.getFps())} FPS · ${quality}\nRendered: ${avatars.size} · Offscreen slice: ${ACTIVE_STUDENTS - avatars.size}\nIdentity capacity: 30,000 · Slice schedules: ${ACTIVE_STUDENTS}\nFloor ${f.id} · ${env.sectors.filter((s) => s.root.isEnabled()).length} loaded sectors\n${clock.block.kind} · ${lessonPhase(clock)}\nCycle ${clock.cycleDay} · Pulse ${clock.block.pulse}\nLift queue: ${simulation.queueCount} · Late arrivals: ${simulation.lateCount} · Blocked: ${simulation.blockedCount}\nActive meshes: ${scene.getActiveMeshes().length}\nTriangles: ${Math.round(scene.getActiveIndices() / 3)}\nPosition: ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}`;
      const boardKey = lessonPhase(clock);
      if (`${boardKey}:${env.boards.length}` !== lastBoard) {
        lastBoard = `${boardKey}:${env.boards.length}`;
        for (const { texture, room } of env.boards) {
          const c = texture.getContext() as CanvasRenderingContext2D;
          c.fillStyle = "#172c2c";
          c.fillRect(0, 0, 1024, texture.getSize().height);
          c.textAlign = "left";
          c.fillStyle = "#d5be80";
          c.font = "26px sans-serif";
          c.fillText(room.subject.toUpperCase(), 45, 48);
          c.fillStyle = "#edf3e9";
          c.font = "38px sans-serif";
          c.fillText(boardKey, 45, 111);
          c.font = "24px sans-serif";
          const content: Record<string, string> = {
            Biology: "How do ecosystems respond to change?",
            "English & literature":
              "Annotate a claim and its supporting evidence.",
            Mathematics: "Explain two methods for the same problem.",
            "Civic memory": "Compare provenance, context and omissions.",
            "Biomedical science": "Build an evidence-based explanation.",
            History: "Whose perspective survives in this record?",
            Technology: "Design, test and explain your algorithm.",
            Chemistry: "Balance matter and track the reaction.",
            Art: "Study proportion, light and material.",
            Seminar: "Discuss the evidence and challenge a claim.",
          };
          c.fillText(content[room.subject], 45, 173);
          c.font = "20px sans-serif";
          c.fillText("QUESTION  →  EVIDENCE  →  INTERPRETATION", 45, 235);
          texture.update();
        }
      }
    }
    if (autoSave > 30 && started) {
      autoSave = 0;
      try {
        saveLocal(snapshot());
      } catch {
        /* Manual save reports storage errors. */
      }
    }
    scene.render();
    compatibility?.render(scene, camera, performance.now());
  });
  window.addEventListener("resize", () => engine.resize());
}
