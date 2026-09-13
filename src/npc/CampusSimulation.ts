import { GameClock } from "../core/GameClock";
import {
  rooms,
  roomById,
  seat,
  floorAt,
  districtAt,
  type Point,
  type Room,
  districts,
  floors,
} from "../campus/plan";
import {
  identity,
  assignment,
  ACTIVE_STUDENTS,
  type StudentState,
} from "./NPCScheduler";
import { routeBetween, distance } from "../navigation/RoutePlanner";
import { LiftController, type LiftState } from "../navigation/LiftController";
import { classroomAction, atSeat } from "./ClassroomController";
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
  liftBank?: string;
  pickup?: number;
  liftTarget?: number;
  arrivedActivity?: string;
  blockedFor?: number;
}
export interface SimulationSave {
  time: number;
  blockKey: string;
  agents: AgentRecord[];
  lifts?: LiftState[];
  closures?: string[];
}
/** Persistent school state is authoritative; meshes are disposable views of it. */
export class CampusSimulation {
  agents: AgentRecord[] = [];
  time = 0;
  blockKey = "";
  lifts = districts.map((d) => new LiftController(d.id));
  closures = new Set<string>();
  private ids = Array.from({ length: ACTIVE_STUDENTS }, (_, i) => identity(i));
  private pendingReplan = false;
  constructor(clock: GameClock, count = ACTIVE_STUDENTS) {
    this.reset(clock, count);
  }
  reset(clock: GameClock, count = this.agents.length || ACTIVE_STUDENTS) {
    this.time = clock.day * 86400 + clock.minute * 60;
    this.blockKey = "";
    this.lifts = districts.map((d) => new LiftController(d.id));
    this.closures.clear();
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
    return structuredClone({
      time: this.time,
      blockKey: this.blockKey,
      agents: this.agents,
      lifts: this.lifts.map((l) => l.snapshot()),
      closures: [...this.closures],
    });
  }
  restore(s: SimulationSave) {
    this.time = s.time;
    this.blockKey = s.blockKey;
    this.agents = structuredClone(s.agents);
    this.lifts = districts.map((d) => new LiftController(d.id));
    for (const state of s.lifts ?? [])
      this.lifts.find((l) => l.state.bank === state.bank)!.restore(state);
    this.closures = new Set(s.closures ?? []);
    // v2 used independent virtual lifts. Continue from its last physical location on a safe landing.
    if (!s.lifts)
      for (const a of this.agents)
        if (a.transport === "lift") {
          const f = floorAt(a.point.y);
          a.point = { x: 3, y: f.y, z: -5 };
          a.liftStage = 0;
          a.transport = "stairs";
          this.plan(a, roomById(a.target)!, this.time, false);
        }
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
    return this.lifts.reduce(
      (n, l) =>
        n +
        l.state.passengers.filter(
          (p) => p.phase === "waiting" || p.phase === "boarding",
        ).length,
      0,
    );
  }
  get lateCount() {
    return this.agents.filter((a) => a.activity === "Late arrival").length;
  }
  get blockedCount() {
    return this.agents.filter((a) => a.activity === "Route blocked").length;
  }
  setClosure(id: string, closed: boolean) {
    if (closed) this.closures.add(id);
    else this.closures.delete(id);
    this.pendingReplan = true;
  }
  private plan(a: AgentRecord, to: Room, release: number, allowLift = true) {
    const from = {
      ...roomById(a.room)!,
      floor: floorAt(a.point.y).id,
      y: floorAt(a.point.y).y,
    };
    const d = districtAt(a.point.x, a.point.z),
      f = floorAt(a.point.y);
    a.target = to.id;
    a.releaseAt = release;
    a.cursor = 1;
    a.wait = 0;
    a.blockedFor = 0;
    a.liftStage = 0;
    a.arrivedActivity = undefined;
    a.transport =
      allowLift && f.id !== to.floor && a.index % 5 === 0 ? "lift" : "stairs";
    if (a.transport === "lift") {
      a.liftBank = d.id;
      a.pickup = f.id;
      a.liftTarget = to.floor;
      const lobby = {
        ...from,
        x: d.x,
        z: d.z,
        district: d.id,
        door: { x: d.x + 1.4, y: f.y, z: d.z - 5 },
      };
      a.path = routeBetween(
        from,
        lobby,
        a.point,
        lobby.door,
        a.index % 2 ? 1.4 : -1.4,
        { closed: this.closures },
      );
    } else
      a.path = routeBetween(
        from,
        to,
        a.point,
        seat(to, a.index % 16),
        a.index % 2 ? 1.4 : -1.4,
        { closed: this.closures },
      );
    if (!a.path.length) {
      a.activity = "Route blocked";
      a.walking = false;
    }
  }
  private intents(clock: GameClock) {
    const b = clock.block,
      p = b.pulse || 1;
    const mealWave =
      b.kind === "MEAL ROTATION"
        ? Math.min(2, Math.floor((clock.minute - b.start) / 12))
        : -1;
    const key = `${clock.day}:${b.start}:${b.kind}:${mealWave}`;
    if (key === this.blockKey && !this.pendingReplan) return;
    const replan = this.pendingReplan;
    this.pendingReplan = false;
    this.blockKey = key;
    for (const a of this.agents) {
      // A transport journey remains intact across a bell change.
      if (a.liftStage > 0) continue;
      const target = assignment(
        a.index,
        clock.cycleDay,
        b.kind === "PASSAGE" ? p + 1 : p,
      );
      const releasing = [
        "TERMINAL RELEASE",
        "AFTER-SCHOOL",
        "EVENING FACILITIES",
        "PRE-ARRIVAL",
      ].includes(b.kind);
      const dining =
        b.kind === "MEAL ROTATION" &&
        ["A", "B", "C"].indexOf(this.ids[a.index].meal) === mealWave;
      if (releasing || dining) {
        const from = {
          ...roomById(a.room)!,
          floor: floorAt(a.point.y).id,
          y: floorAt(a.point.y).y,
        };
        const d = districtAt(a.point.x, a.point.z);
        const endpoint = releasing
          ? { x: -2, y: 0, z: -10 }
          : {
              x:
                [-20, -12, 14, 22][Math.floor(a.index / 4) % 4] +
                (a.index % 2 ? -0.55 : 0.55),
              y: from.y,
              z:
                132 +
                (Math.floor(a.index / 16) % 2) * 16 +
                (a.index % 4 < 2 ? -0.8 : 0.8),
            };
        const dest = {
          ...from,
          floor: releasing ? (1 as const) : from.floor,
          y: releasing ? 0 : from.y,
          x: 0,
          z: releasing ? 0 : 140,
          district: releasing ? "central" : "north",
          door: {
            x: releasing ? -2 : 0,
            y: releasing ? 0 : from.y,
            z: releasing ? -10 : 143,
          },
        };
        a.path = routeBetween(
          from,
          dest,
          a.point,
          endpoint,
          a.index % 2 ? 1.4 : -1.4,
          { closed: this.closures },
        );
        a.cursor = 1;
        a.target = a.room;
        a.releaseAt = this.time + (releasing ? (a.index % 16) * 2 : 0);
        a.transport = "stairs";
        a.liftStage = 0;
        a.arrivedActivity = releasing ? "Released" : "Meal / friends";
      } else if (b.kind === "MEAL ROTATION") {
        if (!atSeat(a.point, roomById(a.room)!, a.index))
          this.plan(a, roomById(a.room)!, this.time, false);
      } else if (replan || target.id !== a.target || !a.path.length) {
        if (target.id !== a.room || !atSeat(a.point, target, a.index))
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
  private move(a: AgentRecord, goal: Point, metres: number) {
    const d = distance(a.point, goal);
    const travel = Math.min(d, metres);
    if (d > 0.001) {
      a.heading = Math.atan2(goal.x - a.point.x, goal.z - a.point.z);
      a.point = {
        x: a.point.x + ((goal.x - a.point.x) / d) * travel,
        y: a.point.y + ((goal.y - a.point.y) / d) * travel,
        z: a.point.z + ((goal.z - a.point.z) / d) * travel,
      };
    }
    a.walking = travel > 0.001;
    return d <= metres + 0.001;
  }
  private transport(a: AgentRecord, dt: number) {
    const l = this.lifts.find((l) => l.state.bank === a.liftBank)!;
    const id = `npc:${a.index}`;
    let p = l.passenger(id);
    if (!p) {
      l.request(
        id,
        a.pickup as any,
        a.liftTarget as any,
        this.ids[a.index].scale > 1.3 ? 2 : 1,
      );
      p = l.passenger(id)!;
    }
    if (p.phase === "waiting") {
      a.activity = "Waiting for lift";
      const queue = l.lobbyPoint(id);
      this.move(a, queue, dt * this.ids[a.index].speed);
      if (distance(a.point, queue) < 0.2) l.beginBoard(id);
    } else if (p.phase === "boarding") {
      a.activity = "Boarding lift";
      if (this.move(a, l.cabinPoint(id), dt * this.ids[a.index].speed))
        l.board(id);
    } else if (p.phase === "riding") {
      a.activity = "Riding lift";
      a.point = l.cabinPoint(id);
      a.walking = false;
    } else if (p.phase === "alighting") {
      a.activity = "Leaving lift";
      const exit = { x: l.district.x + 1.4, y: l.state.y, z: l.district.z - 4 };
      if (this.move(a, exit, dt * this.ids[a.index].speed)) l.finishExit(id);
    } else {
      l.cancel(id);
      a.liftStage = 0;
      a.room = roomById(a.target)!.id;
      this.plan(a, roomById(a.target)!, this.time, false);
    }
  }
  update(clock: GameClock, dt: number, hold = false, observer?: Point) {
    this.time = clock.day * 86400 + clock.minute * 60;
    if (dt <= 0) {
      this.intents(clock);
      if (hold)
        for (const a of this.agents) {
          a.walking = false;
          a.activity = "STILL BELL V";
        }
      return;
    }
    // All block transitions are evaluated in temporal order, including accelerated play.
    const steps = Math.max(1, Math.ceil(Math.min(dt, 60) / 0.25)),
      step = Math.min(dt, 60) / steps;
    const sample = new GameClock();
    const endTime = this.time;
    for (let n = 0; n < steps; n++) {
      const t = endTime - dt + (n + 1) * step;
      this.time = t;
      sample.day = Math.floor(t / 86400);
      sample.minute = (t % 86400) / 60;
      this.intents(sample);
      if (hold) {
        for (const a of this.agents) {
          a.walking = false;
          a.activity = "STILL BELL V";
        }
        continue;
      }
      for (const l of this.lifts) l.update(step);
      const grid = new Map<string, AgentRecord[]>();
      for (const a of this.agents) {
        if (a.activity === "Riding lift" || (!a.path.length && !a.liftStage))
          continue;
        const k = `${Math.round(a.point.y / 8)}:${Math.floor(a.point.x / 1.5)}:${Math.floor(a.point.z / 1.5)}`;
        const list = grid.get(k) ?? [];
        list.push(a);
        grid.set(k, list);
      }
      for (const a of this.agents) {
        a.walking = false;
        if (a.liftStage > 0) {
          this.transport(a, step);
          continue;
        }
        if (a.activity === "Route blocked" && !a.path.length) continue;
        if (!a.path.length || a.cursor >= a.path.length) {
          if (a.transport === "lift" && a.path.length) {
            a.liftStage = 1;
            this.transport(a, step);
            continue;
          }
          a.activity =
            a.arrivedActivity ??
            (sample.block.kind === "ACADEMIC PULSE"
              ? classroomAction(sample, a.index)
              : "Settling");
          continue;
        }
        if (t < a.releaseAt) {
          a.activity = "Packing";
          continue;
        }
        let goal = a.path[a.cursor];
        if (distance(a.point, goal) < 0.04) {
          a.point = { ...goal };
          a.cursor++;
          if (a.cursor >= a.path.length) {
            if (a.transport === "lift") {
              a.liftStage = 1;
              this.transport(a, step);
            } else {
              a.room = a.target;
              a.path = [];
              a.cursor = 0;
              a.activity = a.arrivedActivity ?? "Settling";
            }
            continue;
          }
          goal = a.path[a.cursor];
        }
        const d = distance(a.point, goal),
          dx = (goal.x - a.point.x) / (d || 1),
          dz = (goal.z - a.point.z) / (d || 1);
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
              const x = other.point.x - a.point.x,
                z = other.point.z - a.point.z,
                ahead = x * dx + z * dz,
                lateral = Math.abs(x * dz - z * dx);
              if (
                ahead > 0.02 &&
                ahead < 1.4 &&
                lateral < 0.4 &&
                other.index < a.index
              )
                pace = Math.min(pace, Math.max(0, (ahead - 0.6) / 0.8));
            }
        if (observer && Math.abs(observer.y - a.point.y) < 2) {
          const x = observer.x - a.point.x,
            z = observer.z - a.point.z;
          if (x * dx + z * dz > 0 && Math.hypot(x, z) < 0.9) pace = 0;
        }
        a.blockedFor = pace < 0.05 ? (a.blockedFor ?? 0) + step : 0;
        // Yield at a bottleneck. Diagnose sustained blockage; never jump through occupants.
        this.move(a, goal, this.ids[a.index].speed * step * pace);
        a.activity =
          (a.blockedFor ?? 0) > 10
            ? "Route blocked"
            : pace < 0.5
              ? "Yielding"
              : sample.block.kind === "ACADEMIC PULSE"
                ? "Late arrival"
                : "Walking to " + a.target;
      }
    }
  }
}
