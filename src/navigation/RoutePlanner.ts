import {
  districts,
  floors,
  rooms,
  districtAt,
  floorAt,
  type Point,
  type Room,
} from "../campus/plan";
export interface Edge {
  to: string;
  cost: number;
  closed?: boolean;
  access?: boolean;
}
export function shortestPath(
  graph: Record<string, Edge[]>,
  start: string,
  end: string,
): string[] {
  const dist = new Map([[start, 0]]),
    prev = new Map<string, string>(),
    open = new Set(Object.keys(graph));
  while (open.size) {
    let u: string | undefined;
    for (const n of open)
      if (dist.has(n) && (u === undefined || dist.get(n)! < dist.get(u)!))
        u = n;
    if (u === undefined) break;
    open.delete(u);
    if (u === end) {
      const path = [u];
      while (prev.has(path[0])) path.unshift(prev.get(path[0])!);
      return path;
    }
    for (const e of graph[u] ?? []) {
      if (e.closed || e.access === false) continue;
      const cost = dist.get(u)! + e.cost;
      if (cost < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, cost);
        prev.set(e.to, u);
      }
    }
  }
  return [];
}
export interface RouteOptions {
  closed?: ReadonlySet<string>;
}
export const stairEdge = (district: string, highY: number) =>
  `stairs:${district}:${highY}`;
type Link = Edge & { id: string; points: Point[] };
const graphs = new Map<number, Record<string, Link[]>>();
function campusGraph(lane: number) {
  if (graphs.has(lane)) return graphs.get(lane)!;
  const graph: Record<string, Link[]> = {};
  const key = (floor: number, district: string) => `${floor}:${district}`;
  const anchor = (y: number, d: (typeof districts)[number]): Point => ({
    x: d.x + lane,
    y,
    z: d.z + 45,
  });
  const connect = (a: string, b: string, id: string, points: Point[]) => {
    const cost = points
      .slice(1)
      .reduce((n, p, i) => n + distance(points[i], p), 0);
    graph[a].push({ to: b, id, cost, points });
    graph[b].push({ to: a, id, cost, points: [...points].reverse() });
  };
  for (const f of floors)
    for (const d of districts) graph[key(f.id, d.id)] = [];
  for (const f of floors) {
    const y = f.y;
    const central = districts[0],
      north = districts[1];
    for (const d of districts.slice(1, 4)) {
      const path = [
        anchor(y, central),
        { x: 4, y, z: 90 },
        { x: 4, y, z: 140 },
        { x: d.x + lane, y, z: 140 },
        anchor(y, d),
      ];
      connect(
        key(f.id, "central"),
        key(f.id, d.id),
        `concourse:${f.id}:${d.id}`,
        path,
      );
    }
    connect(key(f.id, "north"), key(f.id, "far-north"), `spine:${f.id}`, [
      anchor(y, north),
      { x: 4, y, z: 240 },
      { x: 4, y, z: 293 },
      anchor(y, districts[4]),
    ]);
    for (const d of districts) {
      const low = floors.find((l) => l.y === y - 8);
      if (!low) continue;
      connect(key(f.id, d.id), key(low.id, d.id), stairEdge(d.id, y), [
        anchor(y, d),
        { x: d.x - 2, y, z: d.z + 97 },
        { x: d.x - 2, y: y - 8, z: d.z + 125 },
        { x: d.x - 8, y: y - 8, z: d.z + 127 },
        { x: d.x - 8, y: y - 8, z: d.z + 98 },
        { x: d.x + lane, y: y - 8, z: d.z + 98 },
        anchor(y - 8, d),
      ]);
    }
  }
  graphs.set(lane, graph);
  return graph;
}
export function routeBetween(
  a: Room,
  b: Room,
  start: Point,
  end: Point,
  lane = 0,
  options: RouteOptions = {},
): Point[] {
  const f = floorAt(start.y);
  // A delayed person may already be in a corridor, commons or different floor.
  const actualRoom = rooms.find(
    (r) =>
      r.floor === f.id &&
      Math.abs(r.x - start.x) < 7.5 &&
      Math.abs(r.z - start.z) < 11.9,
  );
  const da = actualRoom
    ? districts.find((d) => d.id === actualRoom.district)!
    : districtAt(start.x, start.z);
  const db = districts.find((d) => d.id === b.district) ?? districts[0];
  const graph = campusGraph(lane);
  const filtered = Object.fromEntries(
    Object.entries(graph).map(([id, edges]) => [
      id,
      edges.map((e) => ({ ...e, closed: options.closed?.has(e.id) })),
    ]),
  );
  const nodes = shortestPath(
    filtered,
    `${f.id}:${da.id}`,
    `${b.floor}:${db.id}`,
  );
  if (!nodes.length) return [];
  const p: Point[] = [{ ...start }];
  if (actualRoom) {
    const aisle = actualRoom.x + (actualRoom.x < da.x ? 5.4 : -5.4);
    p.push(
      { x: aisle, y: f.y, z: start.z },
      { x: aisle, y: f.y, z: actualRoom.door.z },
      { ...actualRoom.door },
    );
  }
  // Connector users first follow their current spine/concourse, avoiding a diagonal through rooms.
  if (
    !actualRoom &&
    Math.abs(start.x - da.x) > 6 &&
    start.z > 128 &&
    start.z < 151
  )
    p.push({ x: start.x, y: f.y, z: 140 }, { x: da.x + lane, y: f.y, z: 140 });
  p.push({ x: da.x + lane, y: f.y, z: actualRoom?.door.z ?? start.z });
  if (nodes.length > 1) {
    p.push({ x: da.x + lane, y: f.y, z: da.z + 45 });
    for (let i = 1; i < nodes.length; i++)
      p.push(
        ...graph[nodes[i - 1]]
          .find((e) => e.to === nodes[i] && !options.closed?.has(e.id))!
          .points.slice(1),
      );
  }
  p.push({ x: db.x + lane, y: b.y, z: b.door.z }, { ...b.door });
  // Only real classroom destinations require a furniture aisle.
  if (
    distance(b.door, end) > 2 &&
    rooms.some(
      (r) => r.id === b.id && r.door.x === b.door.x && r.door.z === b.door.z,
    )
  ) {
    const aisle = b.x + (b.x < db.x ? 5.4 : -5.4);
    p.push({ x: aisle, y: b.y, z: b.door.z }, { x: aisle, y: b.y, z: end.z });
  }
  p.push({ ...end });
  return p.filter((v, i) => i === 0 || distance(v, p[i - 1]) > 0.001);
}
export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
export function sampleRoute(
  points: Point[],
  metres: number,
): { point: Point; heading: number; arrived: boolean } {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      d = distance(a, b);
    if (metres < d) {
      const t = d ? metres / d : 1;
      return {
        point: {
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          z: a.z + (b.z - a.z) * t,
        },
        heading: Math.atan2(b.x - a.x, b.z - a.z),
        arrived: false,
      };
    }
    metres -= d;
  }
  return { point: points.at(-1)!, heading: Math.PI, arrived: true };
}
