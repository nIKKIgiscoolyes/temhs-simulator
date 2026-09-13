import {
  roomById,
  facilityRoom,
  floorAt,
  districtAt,
  rooms,
  type Point,
} from "../campus/plan";
import { routeBetween, distance } from "../navigation/RoutePlanner";
/** The directory uses the same campus graph and closures as citizen journeys. */
export class Wayfinding {
  destination = "";
  path: Point[] = [];
  cursor = 0;
  setDestination(id: string, point: Point, closed: ReadonlySet<string>) {
    const target = roomById(id) ?? facilityRoom(id);
    if (!target) return false;
    const f = floorAt(point.y),
      d = districtAt(point.x, point.z);
    const from = { ...rooms[0], floor: f.id, y: f.y, district: d.id };
    this.path = routeBetween(
      from,
      target,
      point,
      {
        x: target.door.x + (target.x < target.door.x ? -0.8 : 0.8),
        y: target.y,
        z: target.door.z,
      },
      0,
      { closed },
    );
    this.destination = id;
    this.cursor = 1;
    return this.path.length > 0;
  }
  update(point: Point) {
    while (
      this.cursor < this.path.length &&
      distance(point, this.path[this.cursor]) < 1.5
    )
      this.cursor++;
  }
  remaining(point: Point) {
    return this.path
      .slice(this.cursor)
      .reduce(
        (n, p, i) =>
          n + distance(i ? this.path[this.cursor + i - 1] : point, p),
        0,
      );
  }
  get next() {
    return this.path[this.cursor];
  }
}
