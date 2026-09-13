import { districts, floors, type FloorId, type Point } from "../campus/plan";

export type PassengerPhase =
  "waiting" | "boarding" | "riding" | "alighting" | "arrived";
export interface LiftPassenger {
  id: string;
  from: FloorId;
  to: FloorId;
  size: number;
  phase: PassengerPhase;
  slot: number;
}
export interface LiftState {
  bank: string;
  y: number;
  floor: FloorId;
  target: FloorId;
  phase: "idle" | "closing" | "moving" | "opening" | "open";
  timer: number;
  passengers: LiftPassenger[];
}

/** One physical cabin and FIFO request queue, shared by citizens and observer. */
export class LiftController {
  readonly capacity = 8;
  state: LiftState;
  constructor(bank: string) {
    this.state = {
      bank,
      y: 0,
      floor: 1,
      target: 1,
      phase: "idle",
      timer: 0,
      passengers: [],
    };
  }
  get district() {
    return districts.find((d) => d.id === this.state.bank)!;
  }
  get load() {
    return this.state.passengers
      .filter((p) => ["boarding", "riding", "alighting"].includes(p.phase))
      .reduce((n, p) => n + p.size, 0);
  }
  get doorsOpen() {
    return this.state.phase === "open";
  }
  passenger(id: string) {
    return this.state.passengers.find((p) => p.id === id);
  }
  request(id: string, from: FloorId, to: FloorId, size = 1) {
    if (this.passenger(id)) return;
    if (
      !floors.some((f) => f.id === from) ||
      !floors.some((f) => f.id === to) ||
      size <= 0 ||
      size > this.capacity
    )
      return;
    this.state.passengers.push({
      id,
      from,
      to,
      size,
      phase: "waiting",
      slot: -1,
    });
  }
  cancel(id: string) {
    const p = this.passenger(id);
    if (p && ["waiting", "arrived"].includes(p.phase))
      this.state.passengers = this.state.passengers.filter((p) => p.id !== id);
  }
  beginBoard(id: string) {
    const p = this.passenger(id);
    if (
      !p ||
      p.phase !== "waiting" ||
      !this.doorsOpen ||
      p.from !== this.state.floor ||
      this.load + p.size > this.capacity
    )
      return false;
    const earlier = this.state.passengers.find(
      (q) =>
        q.phase === "waiting" &&
        q.from === p.from &&
        this.load + q.size <= this.capacity,
    );
    if (
      earlier !== p ||
      this.state.passengers.some((q) => q.phase === "alighting")
    )
      return false;
    const used = new Set(
      this.state.passengers
        .filter((q) => ["boarding", "riding", "alighting"].includes(q.phase))
        .map((q) => q.slot),
    );
    p.slot = Array.from({ length: this.capacity }, (_, i) => i).find(
      (i) => !used.has(i),
    )!;
    p.phase = "boarding";
    return true;
  }
  board(id: string) {
    const p = this.passenger(id);
    if (
      p?.phase !== "boarding" ||
      !this.doorsOpen ||
      p.from !== this.state.floor
    )
      return false;
    p.phase = "riding";
    this.state.timer = Math.max(this.state.timer, 1);
    return true;
  }
  finishExit(id: string) {
    const p = this.passenger(id);
    if (p?.phase === "alighting" && this.doorsOpen) p.phase = "arrived";
  }
  cabinPoint(id: string): Point {
    const p = this.passenger(id),
      slot = Math.max(0, p?.slot ?? 0),
      d = this.district;
    return {
      x: d.x + 1.4 + (slot % 3) * 1.5,
      y: this.state.y,
      z: d.z - 9.3 - Math.floor(slot / 3) * 1.5,
    };
  }
  lobbyPoint(id: string): Point {
    const queue = this.state.passengers.filter(
      (p) => p.phase === "waiting" && p.from === this.passenger(id)?.from,
    );
    const i = Math.max(
        0,
        queue.findIndex((p) => p.id === id),
      ),
      d = this.district;
    return {
      x: d.x + 1.2 + (i % 3) * 1.1,
      y:
        floors.find((f) => f.id === this.passenger(id)?.from)?.y ??
        this.state.y,
      z: d.z - 5 + Math.floor(i / 3) * 1.1,
    };
  }
  update(seconds: number) {
    // Bound integration work; callers advance the campus in substeps.
    let remaining = Math.max(0, Math.min(seconds, 60));
    while (remaining > 0) {
      const dt = Math.min(0.1, remaining);
      remaining -= dt;
      const s = this.state;
      if (s.phase === "idle") {
        const next =
          s.passengers.find((p) => p.phase === "riding") ??
          s.passengers.find((p) => p.phase === "waiting");
        if (!next) continue;
        s.target = next.phase === "riding" ? next.to : next.from;
        s.phase = s.target === s.floor ? "opening" : "closing";
        s.timer = 0.6;
      } else if (s.phase === "moving") {
        const y = floors.find((f) => f.id === s.target)!.y;
        s.y += Math.sign(y - s.y) * Math.min(Math.abs(y - s.y), 2.5 * dt);
        if (Math.abs(y - s.y) < 0.001) {
          s.y = y;
          s.floor = s.target;
          s.phase = "opening";
          s.timer = 0.6;
        }
      } else if (s.phase === "open") {
        for (const p of s.passengers)
          if (p.phase === "riding" && p.to === s.floor) p.phase = "alighting";
        // Occupants must physically finish boarding/alighting before doors close.
        if (
          s.passengers.some(
            (p) => p.phase === "boarding" || p.phase === "alighting",
          )
        )
          continue;
        s.timer -= dt;
        if (s.timer <= 0) {
          const rider = s.passengers.find((p) => p.phase === "riding");
          const waiting = s.passengers.find(
            (p) =>
              p.phase === "waiting" &&
              (p.from !== s.floor || this.load + p.size <= this.capacity),
          );
          if (rider || waiting) {
            s.target = rider ? rider.to : waiting!.from;
            if (s.target !== s.floor) {
              s.phase = "closing";
              s.timer = 0.8;
            } else s.timer = 2;
          } else {
            s.phase = "closing";
            s.target = s.floor;
            s.timer = 0.8;
          }
        }
      } else {
        s.timer -= dt;
        if (s.timer <= 0) {
          if (s.phase === "opening") {
            s.phase = "open";
            s.timer = 4;
          } else s.phase = s.target === s.floor ? "idle" : "moving";
        }
      }
    }
  }
  snapshot(): LiftState {
    return structuredClone(this.state);
  }
  restore(state: LiftState) {
    this.state = structuredClone(state);
  }
}
