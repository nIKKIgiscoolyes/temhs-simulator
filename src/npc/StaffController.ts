import { floors, type FloorId, type Point } from "../campus/plan";
import { distance } from "../navigation/RoutePlanner";
export interface StaffRecord {
  index: number;
  point: Point;
  heading: number;
  walking: boolean;
  action: string;
  stop: number;
  wait: number;
}
/** Small, purposeful campus jobs. Geometry visibility does not control their progress. */
export class StaffController {
  state: StaffRecord;
  constructor(
    public index: number,
    public role: string,
    public floor: FloorId,
    public z: number,
  ) {
    this.state = {
      index,
      point: {
        x: role === "Custodian" ? 3.5 : -4,
        y: floors.find((f) => f.id === floor)!.y,
        z,
      },
      heading: 0,
      walking: false,
      action: "On duty",
      stop: 0,
      wait: 0,
    };
  }
  update(dt: number, passage: boolean, inspection: boolean) {
    const s = this.state,
      y = s.point.y;
    let goal: Point;
    s.walking = false;
    if (this.role === "Custodian") {
      s.action = passage
        ? "Keeping Passage clear"
        : s.wait > 0
          ? "Cleaning corridor"
          : "Moving to cleaning area";
      goal = passage
        ? { x: 4.8, y, z: this.z }
        : { x: 3.5, y, z: [36, 58, 82][s.stop % 3] };
    } else if (this.role === "Facilities technician") {
      s.action =
        inspection && [1, -1].includes(this.floor)
          ? "Inspecting stair boundary"
          : "Checking ventilation";
      goal =
        inspection && this.floor === -1
          ? { x: -4.5, y, z: 94 }
          : { x: -4.5, y, z: 91 };
      // Reach the inspection point along the spine and corridor, not across classrooms.
      if (s.point.z > 95) goal = { x: 4, y, z: s.point.z > 140 ? 140 : 94 };
    } else {
      s.action =
        this.role === "Campus supervisor"
          ? "Supervising the concourse"
          : "Assisting students";
      goal = { x: -4, y, z: this.z };
    }
    if (s.wait > 0 && !passage) {
      s.wait = Math.max(0, s.wait - dt);
      return;
    }
    const d = distance(s.point, goal),
      move = Math.min(d, Math.max(0, dt));
    if (d > 0.001) {
      s.heading = Math.atan2(goal.x - s.point.x, goal.z - s.point.z);
      s.point = {
        x: s.point.x + ((goal.x - s.point.x) / d) * move,
        y,
        z: s.point.z + ((goal.z - s.point.z) / d) * move,
      };
      s.walking = move > 0.001;
    }
    if (d < 0.1 && !passage && this.role === "Custodian") {
      s.stop++;
      s.wait = 12;
    }
  }
  snapshot() {
    return structuredClone(this.state);
  }
  restore(s: StaffRecord) {
    this.state = structuredClone(s);
  }
}
