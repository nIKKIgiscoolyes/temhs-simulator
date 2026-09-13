import { lessonPhase, type GameClock } from "../core/GameClock";
import { seat, type Point, type Room } from "../campus/plan";
import { distance } from "../navigation/RoutePlanner";
export type ClassroomAction =
  | "Settling"
  | "Listening"
  | "Discussing"
  | "Reading"
  | "Writing"
  | "Typing"
  | "Packing";
export function classroomAction(
  clock: GameClock,
  index: number,
): ClassroomAction {
  switch (lessonPhase(clock)) {
    case "SETTLE":
      return "Settling";
    case "DISCUSSION":
      return index % 4 === 0 ? "Discussing" : "Listening";
    case "INDIVIDUAL WORK":
      return ["Reading", "Writing", "Typing"][index % 3] as ClassroomAction;
    case "PACKING":
      return "Packing";
    default:
      return "Listening";
  }
}
export function isSeatedActivity(activity: string) {
  return [
    "Learning",
    "Listening",
    "Discussing",
    "Reading",
    "Writing",
    "Typing",
    "Settling",
    "Independent study",
    "Meal / friends",
  ].includes(activity);
}
export function atSeat(point: Point, room: Room, index: number) {
  return distance(point, seat(room, index % 16)) < 0.45;
}

export interface TeacherRecord {
  room: string;
  point: Point;
  heading: number;
  walking: boolean;
  action: string;
  mode: string;
  path: Point[];
  cursor: number;
}
/** Teacher routes use the furniture aisles and advance even when their mesh is unloaded. */
export class TeacherController {
  point: Point;
  heading = 0;
  walking = false;
  action = "Teaching";
  private mode = "";
  private path: Point[] = [];
  private cursor = 0;
  constructor(public room: Room) {
    this.point = { x: room.x, y: room.y, z: room.z - 9 };
  }
  snapshot(): TeacherRecord {
    return structuredClone({
      room: this.room.id,
      point: this.point,
      heading: this.heading,
      walking: this.walking,
      action: this.action,
      mode: this.mode,
      path: this.path,
      cursor: this.cursor,
    });
  }
  restore(s: TeacherRecord) {
    this.point = { ...s.point };
    this.heading = s.heading;
    this.walking = s.walking;
    this.action = s.action;
    this.mode = s.mode;
    this.path = structuredClone(s.path);
    this.cursor = s.cursor;
  }
  update(clock: GameClock, dt: number, hold: boolean) {
    const r = this.room,
      phase = lessonPhase(clock),
      side = r.door.x < r.x ? -1 : 1;
    const mode = hold
      ? "hold"
      : ["PACKING", "PASSAGE"].includes(phase)
        ? "release"
        : phase === "INDIVIDUAL WORK"
          ? "circulate"
          : "teach";
    const front = { x: r.x, y: r.y, z: r.z - 9 },
      aisle = { x: r.x + side * 5.4, y: r.y, z: r.z - 9 };
    if (
      mode !== this.mode ||
      (mode === "circulate" && this.cursor >= this.path.length)
    ) {
      this.mode = mode;
      this.cursor = 0;
      const approach = [{ x: this.point.x, y: r.y, z: front.z }, aisle];
      this.path =
        mode === "circulate"
          ? [...approach, { ...aisle, z: r.z + 7 }, aisle, front]
          : mode === "release" || mode === "hold"
            ? [
                ...approach,
                { ...aisle, z: r.door.z + 1.8 },
                { x: r.door.x - side * 1.3, y: r.y, z: r.door.z + 1.8 },
              ]
            : [...approach, front];
    }
    this.action =
      mode === "hold"
        ? "Supervising Still Bell V"
        : mode === "release"
          ? "Supervising release"
          : mode === "circulate"
            ? "Checking student work"
            : phase === "DISCUSSION"
              ? "Leading discussion"
              : "Teaching";
    this.walking = false;
    let budget = Math.max(0, dt) * 1.1;
    while (budget > 0 && this.cursor < this.path.length) {
      const goal = this.path[this.cursor],
        d = distance(this.point, goal),
        travel = Math.min(d, budget);
      budget -= travel;
      if (d > 0.001) {
        this.heading = Math.atan2(goal.x - this.point.x, goal.z - this.point.z);
        this.point = {
          x: this.point.x + ((goal.x - this.point.x) / d) * travel,
          y: r.y,
          z: this.point.z + ((goal.z - this.point.z) / d) * travel,
        };
        this.walking = true;
      }
      if (d <= travel + 0.001) this.cursor++;
      else break;
    }
    if (!this.walking)
      this.heading = mode === "release" ? (side * Math.PI) / 2 : 0;
  }
}
