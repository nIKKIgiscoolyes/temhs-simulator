import { GameClock, blocks } from "../core/GameClock";
import { rooms, seat, type Point, type Room } from "../campus/plan";
import { routeBetween, sampleRoute } from "../navigation/RoutePlanner";
export const species = [
  "Fox",
  "Wolf",
  "Rabbit",
  "Deer",
  "Bear",
  "Owl",
  "Otter",
  "Lynx",
] as const;
const given = [
  "Alex",
  "Morgan",
  "Avery",
  "Jordan",
  "Casey",
  "Robin",
  "Quinn",
  "Jamie",
  "Taylor",
  "Rowan",
  "Ellis",
  "Cameron",
];
const surnames = [
  "Arden",
  "Voss",
  "Merritt",
  "Keene",
  "Ellery",
  "Marsh",
  "Hale",
  "Wren",
  "Ames",
  "Reed",
  "Bell",
  "Park",
];
export function hash(n: number) {
  let x = (n + 20260907) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) >>> 0;
}
export function identity(index: number) {
  const n = hash(index);
  return {
    id: `STU-2026-${String(index).padStart(8, "0")}`,
    name: `${given[n % given.length]} ${surnames[Math.floor(n / 17) % surnames.length]}`,
    species: species[n % species.length],
    scale: [1, 1.1, 0.7, 1.3, 1.55, 0.85, 0.8, 1][n % 8],
    grade: index < ACTIVE_STUDENTS ? 9 + (n % 4) : n % 13,
    meal: ["A", "B", "C"][n % 3],
    clothing: n % 6,
    friends: [(index + 1) % 30000, (index + 12) % 30000],
    speed: 1.2 + (n % 30) / 100,
  };
}
export const ACTIVE_STUDENTS = rooms.length * 16;
export function assignment(
  index: number,
  cycleDay: number,
  pulse: number,
): Room {
  const cohort = Math.floor(index / 16) % rooms.length;
  return rooms[
    (cohort + (cycleDay - 1) * 3 + Math.max(0, pulse - 1) * 7) % rooms.length
  ];
}
export interface StudentState {
  point: Point;
  heading: number;
  activity: string;
  room: Room;
  destination: Room;
  walking: boolean;
}
export function studentState(
  index: number,
  clock: GameClock,
  hold = false,
): StudentState {
  const b = clock.block;
  const pulse = b.pulse || 1;
  const from = assignment(index, clock.cycleDay, pulse);
  const to = assignment(index, clock.cycleDay, pulse + 1);
  const origin = seat(from, index % 16);
  const stay = {
    point: origin,
    heading: Math.PI,
    activity: hold
      ? "STILL BELL V"
      : b.kind === "ACADEMIC PULSE"
        ? "Learning"
        : b.label,
    room: from,
    destination: from,
    walking: false,
  };
  if (b.kind === "PASSAGE" && !hold) {
    const elapsed = Math.max(
      0,
      (clock.minute - b.start) * 60 - (index % 16) * 0.8,
    );
    const path = routeBetween(
      from,
      to,
      origin,
      seat(to, index % 16),
      index % 2 ? 1.3 : -1.3,
    );
    const s = sampleRoute(path, elapsed * identity(index).speed);
    return {
      ...stay,
      ...s,
      activity: s.arrived
        ? "Settling"
        : index % 11 === 0 && elapsed < 12
          ? "Locker stop"
          : "Walking to " + to.id,
      destination: to,
      walking: !s.arrived,
    };
  }
  if (b.kind === "MEAL ROTATION") {
    const group = index % 3;
    const t = (clock.minute - b.start) * 60;
    const start = group * 7 * 60;
    const end = start + 14 * 60;
    const destination = { ...from, door: { x: 0, y: from.y, z: 4 } };
    const table = {
      x: ((index % 4) - 1.5) * 1.6,
      y: from.y,
      z: 2 + Math.floor((index % 16) / 4) * 1.6,
    };
    const path = routeBetween(
      from,
      destination,
      origin,
      table,
      index % 2 ? 1 : -1,
    );
    if (t < start) return stay;
    if (t < end) {
      const s = sampleRoute(path, (t - start) * 1.4);
      return {
        ...stay,
        ...s,
        activity: s.arrived
          ? `Meal ${identity(index).meal}`
          : "Walking to dining",
        walking: !s.arrived,
      };
    }
    const s = sampleRoute([...path].reverse(), (t - end) * 1.4);
    return {
      ...stay,
      ...s,
      activity: s.arrived ? "Learning" : "Returning from meal",
      walking: !s.arrived,
    };
  }
  if (
    b.kind === "TERMINAL RELEASE" ||
    b.kind === "AFTER-SCHOOL" ||
    b.kind === "EVENING FACILITIES"
  ) {
    const t =
      b.kind === "TERMINAL RELEASE"
        ? (clock.minute - b.start) * 60 - (index % 3) * 180
        : 3600;
    const target = { ...from, door: { x: 0, y: from.y, z: 0 } };
    const path = routeBetween(
      from,
      target,
      origin,
      { x: 0, y: from.y, z: -14 },
      index % 2 ? 1 : -1,
    );
    const s = sampleRoute(path, Math.max(0, t) * 1.4);
    return {
      ...stay,
      ...s,
      activity: s.arrived ? "Released" : "Terminal Release",
      walking: !s.arrived,
    };
  }
  return stay;
}
export function upcoming(clock: GameClock) {
  return blocks.filter((b) => b.end > clock.minute).slice(0, 5);
}
