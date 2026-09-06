import {
  Engine,
  Scene,
  UniversalCamera,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  TransformNode,
} from "@babylonjs/core";
import { Environment } from "./architecture/Environment";
import { GameClock, lessonPhase } from "./core/GameClock";
import { EventBus } from "./core/EventBus";
import { loadLocal, saveLocal, type Save } from "./core/SaveSystem";
import { floors, floorAt, rooms, type FloorId } from "./campus/plan";
import { Avatar } from "./npc/Avatar";
import {
  ACTIVE_STUDENTS,
  identity,
  studentState,
  upcoming,
} from "./npc/NPCScheduler";
import "./ui/style.css";
const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const ui = document.querySelector<HTMLDivElement>("#ui")!;
ui.innerHTML = `<div class="hud"><div class="top"><div class="brand"><div class="eyebrow">Living campus · September 2026</div><strong>TEMHS</strong><small>Travis Elementary Middle High School</small></div><div class="clock"><div id="time" class="time">08:52</div><small id="block">Academic Pulse 1</small><small id="date">Cycle day 1 / 13</small></div></div><div id="notice" class="notice"><span class="eyebrow">Campus operations</span><div id="announcement">Instruction is in progress. Passage follows this Pulse.</div></div><div class="reticle"></div><div id="hint" class="hint hidden"></div><div id="panel" class="panel hidden"></div><div id="debug" class="debug hidden"></div><div class="bottom"><div class="location"><strong id="location">Level -2 · Deep academic core</strong><span id="activity">Observer · 1978 architecture</span></div><button data-panel="map"><span class="key">M</span>Map</button><button data-panel="schedule"><span class="key">T</span>Schedule</button><button data-panel="settings">Controls</button><button id="pause">Pause</button></div><div id="welcome" class="welcome"><div class="eyebrow">TEMHS / Development build 0.1</div><h1>A school in motion.</h1><p>Begin inside the deep academic core. Observe a lesson, follow the next Passage, and travel up to the 2021 civic floor.</p><button id="enter">Enter campus</button><small>WASD to walk · Mouse to look · E to interact<br>Desktop keyboard and mouse recommended<br>Alpha vertical slice · Simplified character assets</small></div></div>`;
const $ = (id: string) => document.getElementById(id)!;
try {
  start();
} catch (error) {
  ui.innerHTML = `<div class="error"><h1>The simulator could not start.</h1><p>WebGL2 is required. Enable hardware acceleration and reload.</p><pre></pre></div>`;
  ui.querySelector("pre")!.textContent = String(error);
}
function start() {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
  });
  const scene = new Scene(engine);
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
  let yaw = Math.PI,
    pitch = 0;
  const keys = new Set<string>();
  let avatars = new Map<number, Avatar>();
  const teachers = rooms.map((r, i) => {
    const a = new Avatar(scene, env, 30000 + i);
    a.root.position.set(r.x, r.y, r.z - 9.5);
    a.root.rotation.y = 0;
    return { avatar: a, room: r };
  });
  const staff = [
    { index: 31000, role: "Custodian", floor: -2, z: 36 },
    { index: 31001, role: "Facilities technician", floor: -1, z: 90 },
    { index: 31002, role: "Campus administrator", floor: 1, z: 8 },
  ].map((s) => ({ ...s, avatar: new Avatar(scene, env, s.index) }));
  let elevator: { from: number; to: number; t: number } | null = null;
  let liftOpen = false;
  const cabin = new TransformNode("moving lift cabin", scene);
  const cabinMat = env.mats.get("metal")!;
  env.box("cabin floor", 3, -0.15, -11, 6, 0.3, 6, cabinMat, cabin);
  env.box("cabin back", 3, 2.5, -14, 6, 5, 0.2, cabinMat, cabin);
  env.box("cabin side", 0, 2.5, -11, 0.2, 5, 6, cabinMat, cabin);
  env.box("cabin side", 6, 2.5, -11, 0.2, 5, 6, cabinMat, cabin);
  env.box("cabin front", 3, 2.5, -8, 6, 5, 0.2, cabinMat, cabin);
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
      p.innerHTML += `<div class="eyebrow">Campus wayfinding</div><h2>${f.id > 0 ? "Floor" : "Level"} ${f.id}</h2><svg class="map" viewBox="0 0 220 280" aria-label="Current floor map"><rect class="corridor" x="94" y="15" width="32" height="245"/>${rooms
        .filter((r) => r.floor === f.id)
        .map(
          (r) =>
            `<rect class="room" x="${r.x < 0 ? 25 : 126}" y="${35 + r.z * 1.8 - 17}" width="69" height="37"/><text x="${r.x < 0 ? 30 : 132}" y="${35 + r.z * 1.8}">${r.id}</text>`,
        )
        .join(
          "",
        )}<text x="88" y="274">STAIRS</text><text x="90" y="12">LIFT</text><circle class="you" cx="${110 + player.position.x * 3.5}" cy="${35 + player.position.z * 1.8}" r="4"/></svg><p>${f.name}. The central lift is at the south end; stairs are at the north end.</p><div class="row"><span>Playable in this build</span><span>1 · -1 · -2</span></div><div class="row"><span>Planned next</span><span>2 · -3 · -4</span></div><p class="muted">Fixed development section. The full campus extends beyond these boundaries; deeper levels are unavailable.</p>`;
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
      p.innerHTML += `<div class="eyebrow">Observer controls</div><h2>Explore TEMHS</h2><div class="row"><span>Walk / brisk walk</span><span>WASD / Shift</span></div><div class="row"><span>Look / release mouse</span><span>Mouse / Esc</span></div><div class="row"><span>Alternative look</span><span>Arrow keys</span></div><div class="row"><span>Door, lift, citizen</span><span>E</span></div><div class="row"><span>Diagnostics</span><span>F3</span></div><div class="row"><label for="speed">Clock speed</label><select id="speed"><option value="1">Real time</option><option value="10">10×</option><option value="60">60×</option></select></div><div class="row"><label for="quality">Graphics</label><select id="quality"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div><div class="actions"><button id="save">Save</button><button id="load">Load save</button><button id="tour">Guided Passage</button></div><p class="muted">Saves stay in this browser. Simplified animal rigs and the limited section are alpha development content.</p>`;
    } else if (which === "lift") {
      p.innerHTML += `<div class="eyebrow">Central passenger lift</div><h2>Select destination</h2><div class="lift">${[2, 1, -1, -2, -3, -4].map((id) => `<button data-floor="${id}" ${!floors.some((f) => f.id === id) ? "disabled" : ""}>${id}</button>`).join("")}</div><p>Levels -5 through -30 require authorized transfer and are outside this build.</p>`;
    }
    $("close-panel").onclick = hidePanel;
    if ($("next"))
      $("next").onclick = () => {
        clock.next();
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
    if ($("tour"))
      $("tour").onclick = () => {
        clock.minute = 534.7;
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
    p.querySelectorAll<HTMLButtonElement>("[data-floor]").forEach(
      (b) =>
        (b.onclick = () => {
          const target = floors.find((f) => f.id === Number(b.dataset.floor))!;
          if (target.id === f.id) {
            hidePanel();
            setLiftOpen(true);
            return;
          }
          elevator = { from: f.y, to: target.y, t: 0 };
          player.position.set(3, f.y + 0.85, -11);
          setLiftOpen(false);
          cabin.position.y = f.y;
          cabin.setEnabled(true);
          hidePanel();
          bus.emit(
            `Lift travelling to ${target.id > 0 ? "Floor" : "Level"} ${target.id}.`,
          );
        }),
    );
  }
  function setLiftOpen(open: boolean) {
    liftOpen = open;
    for (const d of env.liftDoors) {
      const base = d.metadata.baseX;
      d.position.x = base + (open ? (base < 3 ? -2.9 : 2.9) : 0);
      d.checkCollisions = !open;
    }
  }
  function snapshot(): Save {
    return {
      version: 1,
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
      doors: env.doors.filter((d) => d.open).map((d) => d.id),
      quality,
    };
  }
  function applySave(s: Save) {
    clock.day = s.day;
    clock.minute = s.minute;
    clock.speed = s.speed;
    player.position.copyFromFloats(s.player.x, s.player.y, s.player.z);
    pitch = s.rotation.x;
    yaw = s.rotation.y;
    hold = s.hold;
    quality = s.quality;
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
  function nearby() {
    const f = floorAt(player.position.y - 0.85);
    if (Math.hypot(player.position.x - 3, player.position.z + 8) < 7)
      return { kind: "lift", label: "E · Call / use central lift" };
    const door = env.doors.find(
      (d) =>
        Math.abs(d.y - f.y) < 1 &&
        Math.hypot(d.x - player.position.x, d.z - player.position.z) < 4,
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
      if (d < 3.5 && (!nearest || d < nearest.distance))
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
      setLiftOpen(true);
      showPanel("lift");
    } else if (n.door) {
      if (n.door.locked)
        bus.emit("Utility access is limited to infrastructure personnel.");
      else if (hold) bus.emit("Still Bell V: classroom doors remain closed.");
      else env.setDoor(n.door.id, !n.door.open);
    } else if (n.npc !== undefined) {
      const npc = identity(n.npc),
        state = studentState(n.npc, clock, hold);
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
    clock.tick(dt, hold);
    if (!clock.paused) walkTime += dt;
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
      player.moveWithCollisions(
        new Vector3(
          ((Math.sin(yaw) * forward + Math.cos(yaw) * side) * speed * dt) /
            norm,
          -0.14,
          ((Math.cos(yaw) * forward - Math.sin(yaw) * side) * speed * dt) /
            norm,
        ),
      );
      if (player.position.y < -20) {
        player.position.set(0, -15.15, 82);
        bus.emit("Observer returned to the nearest safe route.");
      }
    }
    if (elevator) {
      elevator.t += dt;
      const t = Math.min(1, elevator.t / 4),
        smooth = t * t * (3 - 2 * t);
      player.position.y =
        elevator.from + (elevator.to - elevator.from) * smooth + 0.85;
      cabin.position.y = player.position.y - 0.85;
      if (t === 1) {
        elevator = null;
        cabin.setEnabled(false);
        setLiftOpen(true);
        bus.emit("Lift doors open. Exit toward the academic corridor.");
      }
    }
    camera.position.copyFrom(player.position).addInPlaceFromFloats(0, 0.83, 0);
    camera.rotation.set(pitch, yaw, 0);
    env.update(player.position.y - 0.85);
    sun.intensity = f.id > 0 ? 0.5 : 0.05;
    const blockKey = `${clock.day}-${clock.block.start}-${hold}`;
    if (blockKey !== lastBlock) {
      lastBlock = blockKey;
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
    simTick += dt;
    if (simTick > 0.07) {
      simTick = 0;
      cachedStates = cachedStates.map((_, i) => studentState(i, clock, hold));
      const limit = quality === "low" ? 48 : quality === "high" ? 112 : 80;
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
            o.d < 80 &&
            o.s.activity !== "Released",
        )
        .sort((a, b) => a.d - b.d)
        .slice(0, limit);
      const wanted = new Set(visible.map((v) => v.i));
      for (const [i, a] of avatars)
        if (!wanted.has(i)) {
          a.root.dispose();
          avatars.delete(i);
        }
      for (const o of visible) {
        if (!avatars.has(o.i)) avatars.set(o.i, new Avatar(scene, env, o.i));
        const a = avatars.get(o.i)!;
        a.root.position.set(o.s.point.x, o.s.point.y, o.s.point.z);
        a.root.rotation.y = o.s.heading;
      }
    }
    for (const [i, a] of avatars) {
      const s = cachedStates[i];
      a.pose(walkTime, s.walking, !s.walking && s.activity !== "Locker stop");
    }
    for (const t of teachers) {
      const active = Math.abs(t.room.y - f.y) < 5;
      t.avatar.root.setEnabled(active);
      if (active) {
        const phase = lessonPhase(clock);
        t.avatar.root.position.x =
          t.room.x +
          (phase === "INDIVIDUAL WORK"
            ? Math.sin(walkTime * 0.2) * 3
            : Math.sin(walkTime * 0.1) * 0.5);
        t.avatar.pose(walkTime, false, false, true);
      }
    }
    for (const s of staff) {
      const sf = floors.find((f) => f.id === s.floor)!;
      s.avatar.root.setEnabled(sf.id === f.id);
      const passage = clock.block.kind === "PASSAGE";
      s.avatar.root.position.set(
        s.role === "Custodian" ? (passage ? 4.8 : 3.5) : -4,
        sf.y,
        s.z +
          (s.role === "Custodian" && !passage
            ? Math.sin(walkTime * 0.035) * 15
            : 0),
      );
      s.avatar.pose(
        walkTime,
        s.role === "Custodian" && !passage,
        false,
        s.role !== "Custodian",
      );
    }
    lastUI += dt;
    autoSave += dt;
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
      const n = nearby();
      $("hint").textContent = n?.label ?? "";
      $("hint").classList.toggle("hidden", !n || !!panel || !started);
      if (debug)
        $("debug").textContent =
          `${Math.round(engine.getFps())} FPS · ${quality}\nRendered: ${avatars.size} · Offscreen slice: ${ACTIVE_STUDENTS - avatars.size}\nIdentity capacity: 30,000 · Slice schedules: ${ACTIVE_STUDENTS}\nFloor ${f.id} · ${env.sectors.filter((s) => s.root.isEnabled()).length} loaded sectors\n${clock.block.kind} · ${lessonPhase(clock)}\nCycle ${clock.cycleDay} · Pulse ${clock.block.pulse}\nActive meshes: ${scene.getActiveMeshes().length}\nTriangles: ${Math.round(scene.getActiveIndices() / 3)}\nPosition: ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}`;
      const boardKey = lessonPhase(clock);
      if (boardKey !== lastBoard) {
        lastBoard = boardKey;
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
          };
          c.fillText(content[room.subject], 45, 173);
          c.font = "20px sans-serif";
          c.fillText("QUESTION  →  EVIDENCE  →  INTERPRETATION", 45, 235);
          texture.update();
        }
      }
    }
    if (autoSave > 30 && started && !elevator) {
      autoSave = 0;
      try {
        saveLocal(snapshot());
      } catch {
        /* Manual save reports storage errors. */
      }
    }
    scene.render();
  });
  window.addEventListener("resize", () => engine.resize());
}
