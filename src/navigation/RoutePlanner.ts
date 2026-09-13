import { districts, type Point, type Room } from "../campus/plan";
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
export function routeBetween(
  a: Room,
  b: Room,
  start: Point,
  end: Point,
  lane = 0,
): Point[] {
  const da = districts.find((d) => d.id === a.district) ?? districts[0],
    db = districts.find((d) => d.id === b.district) ?? districts[0];
  const p: Point[] = [
    start,
    { x: a.x + (a.x < da.x ? 5.4 : -5.4), y: a.y, z: start.z },
    { x: a.x + (a.x < da.x ? 5.4 : -5.4), y: a.y, z: a.door.z },
    { ...a.door },
    { x: da.x + lane, y: a.y, z: a.door.z },
  ];
  if (a.floor !== b.floor) {
    const step = Math.sign(b.y - a.y) * 8;
    for (let y = a.y; y !== b.y; y += step) {
      const high = Math.max(y, y + step);
      if (step < 0)
        p.push(
          { x: da.x - 2, y: high, z: da.z + 97 },
          { x: da.x - 2, y: high - 8, z: da.z + 125 },
          { x: da.x - 8, y: high - 8, z: da.z + 127 },
          { x: da.x - 8, y: high - 8, z: da.z + 98 },
          { x: da.x + lane, y: high - 8, z: da.z + 98 },
        );
      else
        p.push(
          { x: da.x + lane, y, z: da.z + 98 },
          { x: da.x - 8, y, z: da.z + 98 },
          { x: da.x - 8, y, z: da.z + 127 },
          { x: da.x - 2, y, z: da.z + 125 },
          { x: da.x - 2, y: high, z: da.z + 97 },
        );
    }
  }
  if (da.id !== db.id) {
    const exit = (d: typeof da, y: number): Point[] =>
      d.id === "central"
        ? [
            { x: 4, y, z: 90 },
            { x: 4, y, z: 140 },
          ]
        : d.id === "far-north"
          ? [
              { x: 0, y, z: 293 },
              { x: 4, y, z: 293 },
              { x: 4, y, z: 140 },
            ]
          : [
              { x: d.x + lane, y, z: 143 },
              { x: d.x + lane, y, z: 140 },
              { x: 4, y, z: 140 },
            ];
    p.push(...exit(da, b.y), ...exit(db, b.y).reverse());
  }
  p.push(
    { x: db.x + lane, y: b.y, z: b.door.z },
    { ...b.door },
    { x: b.x + (b.x < db.x ? 5.4 : -5.4), y: b.y, z: b.door.z },
    { x: b.x + (b.x < db.x ? 5.4 : -5.4), y: b.y, z: end.z },
    end,
  );
  return p;
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
