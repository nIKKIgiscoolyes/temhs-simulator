export const floors = [
  { id: 1, y: 0, era: 2021, name: "Arrival & civic commons", wing: "Civic" },
  { id: -1, y: -8, era: 1978, name: "North academic", wing: "North" },
  { id: -2, y: -16, era: 1978, name: "Deep academic core", wing: "Central" },
  {
    id: 2,
    y: 8,
    era: 2021,
    name: "Science & modern academic",
    wing: "Discovery",
  },
  {
    id: -3,
    y: -24,
    era: 1978,
    name: "Archives & civic memory",
    wing: "Archive",
  },
  {
    id: -4,
    y: -32,
    era: 1978,
    name: "Infrastructure & applied studies",
    wing: "Applied",
  },
] as const;
export type FloorId = (typeof floors)[number]["id"];
export type Point = { x: number; y: number; z: number };
export type Access = "ACADEMIC" | "TRANSITIONAL" | "RESTRICTED" | "UTILITY";
export const districts = [
  { id: "central", name: "Central", x: 0, z: 0 },
  { id: "north", name: "North", x: 0, z: 150 },
  { id: "east", name: "East", x: 96, z: 150 },
  { id: "west", name: "West", x: -96, z: 150 },
  { id: "far-north", name: "North Extension", x: 0, z: 300 },
] as const;
export type District = (typeof districts)[number];
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
  district: string;
};
export const roomSubjects = [
  "Biology",
  "English & literature",
  "Mathematics",
  "Civic memory",
  "Biomedical science",
  "History",
  "Technology",
  "Chemistry",
  "Art",
  "Seminar",
];
function cluster(f: (typeof floors)[number], d: District): Room[] {
  return Array.from({ length: 6 }, (_, i) => {
    const legacy = d.id === "central" && [1, -1, -2].includes(f.id);
    const subject = legacy
      ? roomSubjects[(i + Math.abs(f.id)) % 6]
      : f.id === -3
        ? [
            "Civic memory",
            "History",
            "Seminar",
            "English & literature",
            "Civic memory",
            "Technology",
          ][i]
        : f.id === 2
          ? [
              "Biology",
              "Chemistry",
              "Technology",
              "Biomedical science",
              "Mathematics",
              "Seminar",
            ][i]
          : f.id === -4
            ? [
                "Technology",
                "Chemistry",
                "Mathematics",
                "Biomedical science",
                "Seminar",
                "History",
              ][i]
            : roomSubjects[
                (i + districts.indexOf(d) + Math.abs(f.id)) %
                  roomSubjects.length
              ];
    return {
      id: `${f.id > 0 ? "F" : "B"}${Math.abs(f.id)}-${101 + i + districts.indexOf(d) * 100}`,
      floor: f.id,
      x: d.x + (i % 2 === 0 ? -14 : 14),
      z: d.z + 18 + Math.floor(i / 2) * 27,
      y: f.y,
      subject,
      capacity: 20,
      access: "ACADEMIC",
      era: f.era,
      teacher: `STA-${f.id}-${d.id}-${i}`,
      door: {
        x: d.x + (i % 2 === 0 ? -6 : 6),
        y: f.y,
        z: d.z + 18 + Math.floor(i / 2) * 27,
      },
      wing: d.name,
      district: d.id,
    };
  });
}
// Legacy room records retain their IDs, coordinates, and first eighteen indices.
export const rooms: Room[] = [
  ...floors.slice(0, 3).flatMap((f) => cluster(f, districts[0])),
  ...floors.flatMap((f) =>
    districts
      .filter((d) => d.id !== "central" || ![1, -1, -2].includes(f.id))
      .flatMap((d) => cluster(f, d)),
  ),
];
const lookup = new Map(rooms.map((r) => [r.id, r]));
export const roomById = (id: string) => lookup.get(id);
export function floorAt(y: number) {
  return floors.reduce((a, b) =>
    Math.abs(b.y - y) < Math.abs(a.y - y) ? b : a,
  );
}
export function districtAt(x: number, z: number) {
  return districts.reduce((a, b) =>
    Math.hypot(b.x - x, b.z + 43 - z) < Math.hypot(a.x - x, a.z + 43 - z)
      ? b
      : a,
  );
}
export function seat(room: Room, index: number): Point {
  return {
    x: room.x + ((index % 4) - 1.5) * 2.65,
    y: room.y,
    z: room.z - 6 + Math.floor(index / 4) * 2.6,
  };
}
export const lift = { x: 3, y: 0, z: -10 };
export const supportRooms = floors.flatMap((f) =>
  [
    "Student services",
    "Faculty workroom",
    "Restrooms",
    "Archive reading room",
  ].map((name, i) => ({
    id: `SUP-${f.id}-${i}`,
    name:
      f.id === 1 && i === 3
        ? "Health & counseling"
        : f.id === 2 && i === 3
          ? "Study commons"
          : name,
    floor: f.id,
    y: f.y,
    x: i % 2 ? -48 : 48,
    z: i < 2 ? 123 : 157,
    front: i < 2 ? 135 : 145,
  })),
);
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
