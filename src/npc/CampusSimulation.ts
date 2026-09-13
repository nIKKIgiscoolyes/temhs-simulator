import { GameClock } from "../core/GameClock";
import {
  rooms,
  roomById,
  seat,
  type Point,
  type Room,
  districts,
} from "../campus/plan";
import {
  identity,
  assignment,
  ACTIVE_STUDENTS,
  type StudentState,
} from "./NPCScheduler";
import { routeBetween, distance } from "../navigation/RoutePlanner";
export interface AgentRecord {
  index: number;
  point: Point;
  heading: number;
  room: string;
  target: string;
  path: Point[];
  cursor: number;
  releaseAt: number;
  activity: string;
  walking: boolean;
  wait: number;
  transport: "stairs" | "lift";
  liftStage: number;
}
export interface SimulationSave {
  time: number;
  blockKey: string;
  agents: AgentRecord[];
}
/** Persistent locomotion is independent of renderer visibility and survives sector disposal. */
export class CampusSimulation {
  agents: AgentRecord[] = [];
  time = 0;
  blockKey = "";
  private ids = Array.from({ length: ACTIVE_STUDENTS }, (_, i) => identity(i));
  constructor(clock: GameClock, count = ACTIVE_STUDENTS) {
    this.reset(clock, count);
  }
  reset(clock: GameClock, count = this.agents.length || ACTIVE_STUDENTS) {
    this.time = clock.day * 86400 + clock.minute * 60;
    this.blockKey = "";
    this.agents = Array.from({ length: count }, (_, index) => {
      const r = assignment(index, clock.cycleDay, clock.block.pulse || 1);
      return {
        index,
        point: seat(r, index % 16),
        heading: Math.PI,
        room: r.id,
        target: r.id,
        path: [],
        cursor: 0,
        releaseAt: this.time,
        activity: "Learning",
        walking: false,
        wait: 0,
        transport: "stairs",
        liftStage: 0,
      };
    });
  }
  snapshot(): SimulationSave {
    return {
      time: this.time,
      blockKey: this.blockKey,
      agents: this.agents.map((a) => ({
        ...a,
        point: { ...a.point },
        path: a.path.map((p) => ({ ...p })),
      })),
    };
  }
  restore(s: SimulationSave) {
    this.time = s.time;
    this.blockKey = s.blockKey;
    this.agents = s.agents.map((a) => ({
      ...a,
      point: { ...a.point },
      path: a.path.map((p) => ({ ...p })),
    }));
  }
  state(index: number): StudentState {
    const a = this.agents[index];
    return {
      point: a.point,
      heading: a.heading,
      room: roomById(a.room)!,
      destination: roomById(a.target)!,
      activity: a.activity,
      walking: a.walking,
    };
  }
  get queueCount() {
    return this.agents.filter((a) => a.activity === "Waiting for lift").length;
  }
  get lateCount() {
    return this.agents.filter((a) => a.activity === "Late arrival").length;
  }
  private plan(a: AgentRecord, to: Room, release: number) {
    const from = roomById(a.room)!;
    a.target = to.id;
    a.releaseAt = release;
    a.transport =
      from.floor !== to.floor && a.index % 5 === 0 ? "lift" : "stairs";
    a.path = routeBetween(
      from,
      to,
      a.point,
      seat(to, a.index % 16),
      a.index % 2 ? 1.4 : -1.4,
    );
    a.cursor = 1;
    a.wait = 0;
    a.liftStage = 0;
    if (a.transport === "lift") {
      const central = {
        ...from,
        x: 0,
        z: 0,
        district: "central",
        door: { x: 0, y: from.y, z: 0 },
      };
      const targetCentral = {
        ...central,
        floor: to.floor,
        y: to.y,
        door: { x: 0, y: to.y, z: 0 },
      };
      const approach = routeBetween(
        from,
        central,
        a.point,
        { x: 3, y: from.y, z: -6 },
        a.index % 2 ? 1.4 : -1.4,
      );
      const depart = routeBetween(
        targetCentral,
        to,
        { x: 3, y: to.y, z: -6 },
        seat(to, a.index % 16),
        a.index % 2 ? 1.4 : -1.4,
      );
      a.path = [
        ...approach,
        { x: 3, y: from.y, z: -11 },
        { x: 3, y: to.y, z: -11 },
        ...depart,
      ];
    }
  }
  update(clock: GameClock, dt: number, hold = false, observer?: Point) {
    this.time = clock.day * 86400 + clock.minute * 60;
    const block = clock.block;
    const mealWave =
      block.kind === "MEAL ROTATION"
        ? Math.min(2, Math.floor((clock.minute - block.start) / 12))
        : -1;
    const key = `${clock.day}:${block.start}:${block.kind}:${mealWave}`;
    if (this.blockKey !== key) {
      this.blockKey = key;
      for (const a of this.agents) {
        const b = clock.block;
        const p = b.pulse || 1;
        const target = assignment(
          a.index,
          clock.cycleDay,
          b.kind === "PASSAGE" ? p + 1 : p,
        );
        const release = [
          "TERMINAL RELEASE",
          "AFTER-SCHOOL",
          "EVENING FACILITIES",
          "PRE-ARRIVAL",
        ].includes(b.kind);
        if (
          release ||
          (b.kind === "MEAL ROTATION" &&
            Math.floor(a.index / 16) % 3 === mealWave)
        ) {
          const from = roomById(a.room)!;
          const d = districts.find((d) => d.id === from.district)!;
          const endpoint = release
            ? { x: d.x + 1.4, y: from.y, z: d.z - 17 }
            : {
                x:
                  (a.index % 2 ? -1 : 1) *
                  (12 + (Math.floor(a.index / 2) % 2) * 8),
                y: from.y,
                z: 132 + (Math.floor(a.index / 4) % 2) * 16,
              };
          const destination = {
            ...from,
            x: release ? d.x : 0,
            z: release ? d.z : 140,
            district: release ? d.id : "north",
            door: { x: release ? d.x : 0, y: from.y, z: release ? d.z : 143 },
          };
          a.path = routeBetween(
            from,
            destination,
            a.point,
            endpoint,
            a.index % 2 ? 1.4 : -1.4,
          );
          a.cursor = 1;
          a.target = a.room;
          a.releaseAt = this.time + (release ? (a.index % 16) * 2 : 0);
          a.transport = "stairs";
          a.liftStage = 0;
        } else if (b.kind === "MEAL ROTATION") {
          this.plan(a, roomById(a.room)!, this.time);
        } else if (target.id !== a.target || !a.path.length) {
          if (
            target.id !== a.room ||
            Math.hypot(
              a.point.x - seat(target, a.index % 16).x,
              a.point.z - seat(target, a.index % 16).z,
            ) > 1
          )
            this.plan(
              a,
              target,
              this.time +
                (b.kind === "PASSAGE"
                  ? (a.index % 16) * 1.1 + (Math.floor(a.index / 16) % 3) * 4
                  : 0),
            );
        }
      }
    }
    if (dt <= 0) return;
    const steps = Math.max(1, Math.ceil(dt / 0.35)),
      step = dt / steps;
    for (let n = 0; n < steps; n++) {
      const grid = new Map<string, AgentRecord[]>();
      const cell = (p: Point) =>
        `${Math.round(p.y / 8)}:${Math.floor(p.x / 1.5)}:${Math.floor(p.z / 1.5)}`;
      for (const a of this.agents) {
        const k = cell(a.point),
          bucket = grid.get(k) ?? [];
        bucket.push(a);
        grid.set(k, bucket);
      }
      for (const a of this.agents) {
        a.walking = false;
        if (hold) {
          a.activity = "STILL BELL V";
          continue;
        }
        if (!a.path.length || a.cursor >= a.path.length) {
          a.activity = [
            "TERMINAL RELEASE",
            "AFTER-SCHOOL",
            "EVENING FACILITIES",
            "PRE-ARRIVAL",
          ].includes(block.kind)
            ? "Released"
            : block.kind === "MEAL ROTATION"
              ? Math.floor(a.index / 16) % 3 === mealWave
                ? "Meal / friends"
                : "Independent study"
              : block.kind === "ACADEMIC PULSE"
                ? "Learning"
                : "Settling";
          continue;
        }
        if (this.time < a.releaseAt) {
          a.activity = "Packing";
          continue;
        }
        if (
          a.transport === "lift" &&
          a.path[a.cursor]?.z === -11 &&
          a.path[a.cursor]?.y === a.point.y &&
          a.point.z >= -6.1 &&
          a.liftStage === 0
        ) {
          a.activity = "Waiting for lift";
          a.wait += step;
          const batch = Math.floor((a.index % 16) / 6);
          if (a.wait < 3 + batch * 4) continue;
          a.liftStage = 1;
        }
        let goal = a.path[a.cursor],
          d = distance(a.point, goal);
        if (d < 0.04) {
          a.point = { ...goal };
          a.cursor++;
          if (a.cursor === a.path.length) {
            a.room = a.target;
            a.path = [];
            a.activity = "Settling";
            continue;
          }
          goal = a.path[a.cursor];
          d = distance(a.point, goal);
        }
        if (
          a.transport === "lift" &&
          goal.z === -11 &&
          a.point.z === -11 &&
          goal.y !== a.point.y
        ) {
          a.activity = "Riding lift";
          const move = Math.min(d, step * 2);
          a.point.y += Math.sign(goal.y - a.point.y) * move;
          continue;
        }
        const speed = this.ids[a.index].speed;
        const direction = {
          x: (goal.x - a.point.x) / (d || 1),
          z: (goal.z - a.point.z) / (d || 1),
        };
        let pace = 1;
        const gx = Math.floor(a.point.x / 1.5),
          gz = Math.floor(a.point.z / 1.5),
          level = Math.round(a.point.y / 8);
        for (let ix = -1; ix <= 1; ix++)
          for (let iz = -1; iz <= 1; iz++)
            for (const other of grid.get(`${level}:${gx + ix}:${gz + iz}`) ??
              []) {
              if (
                other.index === a.index ||
                Math.abs(other.point.y - a.point.y) > 0.5
              )
                continue;
              const dx = other.point.x - a.point.x,
                dz = other.point.z - a.point.z,
                sep = Math.hypot(dx, dz);
              const ahead = dx * direction.x + dz * direction.z;
              const lateral = Math.abs(dx * direction.z - dz * direction.x);
              if (
                ahead > 0.05 &&
                ahead < 1.2 &&
                lateral < 0.36 &&
                other.index < a.index
              )
                pace = Math.min(pace, Math.max(0.12, (sep - 0.38) / 0.9));
            }
        if (observer && Math.abs(observer.y - a.point.y) < 2) {
          const dx = observer.x - a.point.x,
            dz = observer.z - a.point.z;
          if (
            dx * direction.x + dz * direction.z > 0 &&
            Math.hypot(dx, dz) < 0.9
          )
            pace = 0.05;
        }
        const travel = Math.min(d, speed * step * pace);
        a.point = {
          x: a.point.x + direction.x * travel,
          y: a.point.y + ((goal.y - a.point.y) / (d || 1)) * travel,
          z: a.point.z + direction.z * travel,
        };
        a.heading = Math.atan2(direction.x, direction.z);
        a.walking = travel > 0.001;
        a.activity =
          clock.block.kind === "ACADEMIC PULSE"
            ? "Late arrival"
            : pace < 0.5
              ? "Yielding"
              : "Walking to " + a.target;
      }
    }
  }
}
