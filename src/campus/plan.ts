export const floors = [
  { id: 1, y: 0, era: 2021, name: "Arrival & civic commons", wing: "Civic" },
  { id: -1, y: -8, era: 1978, name: "North academic", wing: "North" },
  { id: -2, y: -16, era: 1978, name: "Deep academic core", wing: "Central" },
] as const;
export type FloorId = (typeof floors)[number]["id"];
export type Point = { x: number; y: number; z: number };
export type Access = "ACADEMIC" | "TRANSITIONAL" | "RESTRICTED" | "UTILITY";
export type Room = {
  id: string;
  floor: FloorId;
  x: number;
  z: number;
  y: number;
  subject: string;
  capacity: number;
  access: Access;
  era: number;
  teacher: string;
  door: Point;
  wing: string;
};
export const roomSubjects = [
  "Biology",
  "English & literature",
  "Mathematics",
  "Civic memory",
  "Biomedical science",
  "History",
];
// IMPLEMENTATION_DEFAULT: fixed slice layout and room identifiers; full campus reserved in master plan.
export const rooms: Room[] = floors.flatMap((f) =>
  Array.from({ length: 6 }, (_, i) => ({
    id: `${f.id > 0 ? "F" : "B"}${Math.abs(f.id)}-${101 + i}`,
    floor: f.id,
    x: i % 2 === 0 ? -14 : 14,
    z: 18 + Math.floor(i / 2) * 27,
    y: f.y,
    subject: roomSubjects[(i + Math.abs(f.id)) % 6],
    capacity: 20,
    access: "ACADEMIC" as Access,
    era: f.era,
    teacher: `STA-${f.id}-${i}`,
    door: { x: i % 2 === 0 ? -6 : 6, y: f.y, z: 18 + Math.floor(i / 2) * 27 },
    wing: f.wing,
  })),
);
export function floorAt(y: number) {
  return floors.reduce((a, b) =>
    Math.abs(b.y - y) < Math.abs(a.y - y) ? b : a,
  );
}
export const roomById = (id: string) => rooms.find((r) => r.id === id);
export function seat(room: Room, index: number): Point {
  return {
    x: room.x + ((index % 4) - 1.5) * 2.65,
    y: room.y,
    z: room.z - 6 + Math.floor(index / 4) * 2.6,
  };
}
export const lift = { x: 3, y: 0, z: -10 };
export function allowed(
  access: Access,
  role: "observer" | "student" | "staff" | "facilities",
) {
  return (
    access === "ACADEMIC" ||
    access === "TRANSITIONAL" ||
    (access === "RESTRICTED" && role === "staff") ||
    (access === "UTILITY" && role === "facilities")
  );
}
