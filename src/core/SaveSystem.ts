import type { StaffRecord } from "../npc/StaffController";
import type { TeacherRecord } from "../npc/ClassroomController";
import type { SimulationSave } from "../npc/CampusSimulation";
import { ACTIVE_STUDENTS } from "../npc/NPCScheduler";
import {
  roomById,
  floors,
  districts,
  supportRooms,
  type Point,
} from "../campus/plan";
export interface Save {
  version: 1 | 2 | 3;
  simulation?: SimulationSave;
  teachers?: TeacherRecord[];
  staff?: StaffRecord[];
  day: number;
  minute: number;
  speed: number;
  player: Point;
  rotation: Point;
  hold: boolean;
  doors: string[];
  quality: string;
  seed: 20260907;
}
const finite = (x: unknown): x is number =>
  typeof x === "number" && Number.isFinite(x);
const point = (p: any) => p && ["x", "y", "z"].every((k) => finite(p[k]));
const validFloor = (f: any) => floors.some((l) => l.id === f);
const validBank = (b: any) => districts.some((d) => d.id === b);
export function encode(save: Save) {
  return JSON.stringify(save);
}
/** Fully validate a candidate before any world state is mutated. */
export function decode(raw: string): Save {
  const s = JSON.parse(raw);
  if (
    !s ||
    typeof s !== "object" ||
    ![1, 2, 3].includes(s.version) ||
    s.seed !== 20260907 ||
    !Number.isInteger(s.day) ||
    s.day < 0 ||
    !finite(s.minute) ||
    s.minute < 0 ||
    s.minute >= 1440 ||
    ![1, 10, 60].includes(s.speed) ||
    typeof s.hold !== "boolean" ||
    !["low", "medium", "high"].includes(s.quality) ||
    !point(s.player) ||
    !point(s.rotation) ||
    !Array.isArray(s.doors) ||
    !s.doors.every(
      (id: unknown) =>
        typeof id === "string" &&
        (roomById(id) ||
          supportRooms.some((r) => r.id === id) ||
          id.startsWith("UTILITY-")),
    )
  )
    throw new Error("This save is invalid or uses an unsupported version.");
  if (s.version === 3 && !s.simulation)
    throw new Error("Campus state is missing from this save.");
  if (s.simulation) {
    const sim = s.simulation;
    if (
      !finite(sim.time) ||
      sim.time < 0 ||
      typeof sim.blockKey !== "string" ||
      !Array.isArray(sim.agents) ||
      !sim.agents.length ||
      sim.agents.length > ACTIVE_STUDENTS ||
      !sim.agents.every(
        (a: any, i: number) =>
          a &&
          a.index === i &&
          roomById(a.room) &&
          roomById(a.target) &&
          point(a.point) &&
          Array.isArray(a.path) &&
          a.path.length < 2048 &&
          a.path.every(point) &&
          Number.isInteger(a.cursor) &&
          a.cursor >= 0 &&
          a.cursor <= a.path.length &&
          [a.heading, a.releaseAt, a.wait, a.liftStage].every(finite) &&
          a.wait >= 0 &&
          Number.isInteger(a.liftStage) &&
          a.liftStage >= 0 &&
          a.liftStage <= 4 &&
          typeof a.activity === "string" &&
          typeof a.walking === "boolean" &&
          ["stairs", "lift"].includes(a.transport) &&
          (a.blockedFor === undefined ||
            (finite(a.blockedFor) && a.blockedFor >= 0)) &&
          (a.arrivedActivity === undefined ||
            typeof a.arrivedActivity === "string") &&
          (a.liftBank === undefined || validBank(a.liftBank)) &&
          (a.pickup === undefined || validFloor(a.pickup)) &&
          (a.liftTarget === undefined || validFloor(a.liftTarget)) &&
          (a.liftStage === 0 ||
            (a.transport === "lift" &&
              validBank(a.liftBank) &&
              validFloor(a.pickup) &&
              validFloor(a.liftTarget))),
      )
    )
      throw new Error("Invalid locomotion state in save.");
    if (
      sim.closures !== undefined &&
      (!Array.isArray(sim.closures) ||
        !sim.closures.every(
          (id: any) =>
            typeof id === "string" && /^(stairs|concourse|spine):/.test(id),
        ))
    )
      throw new Error("Invalid route closures.");
    if (s.version === 3 && (!sim.lifts || !sim.closures))
      throw new Error("Shared transport state is missing.");
    if (sim.lifts) {
      const passengers = new Set<string>(),
        banks = new Set<string>();
      if (!Array.isArray(sim.lifts) || sim.lifts.length !== districts.length)
        throw new Error("Invalid lift banks.");
      for (const l of sim.lifts) {
        if (
          !l ||
          !validBank(l.bank) ||
          banks.has(l.bank) ||
          !validFloor(l.floor) ||
          !validFloor(l.target) ||
          !finite(l.y) ||
          l.y < -32 ||
          l.y > 8 ||
          !["idle", "closing", "moving", "opening", "open"].includes(l.phase) ||
          !finite(l.timer) ||
          Math.abs(l.timer) > 60 ||
          !Array.isArray(l.passengers) ||
          l.passengers.length > ACTIVE_STUDENTS + 1
        )
          throw new Error("Invalid lift state.");
        banks.add(l.bank);
        let load = 0;
        const slots = new Set<number>();
        if (
          l.phase !== "moving" &&
          Math.abs(l.y - floors.find((f) => f.id === l.floor)!.y) > 0.001
        )
          throw new Error("Lift is not at its landing.");
        for (const p of l.passengers) {
          if (
            !p ||
            typeof p.id !== "string" ||
            passengers.has(p.id) ||
            !(
              p.id === "observer" ||
              (/^npc:\d+$/.test(p.id) &&
                Number(p.id.slice(4)) < sim.agents.length)
            ) ||
            !validFloor(p.from) ||
            !validFloor(p.to) ||
            !Number.isInteger(p.size) ||
            p.size < 1 ||
            p.size > 8 ||
            !["waiting", "boarding", "riding", "alighting", "arrived"].includes(
              p.phase,
            ) ||
            !Number.isInteger(p.slot) ||
            p.slot < -1 ||
            p.slot > 7
          )
            throw new Error("Invalid lift passenger.");
          passengers.add(p.id);
          if (["boarding", "riding", "alighting"].includes(p.phase)) {
            load += p.size;
            if (p.slot < 0 || slots.has(p.slot))
              throw new Error("Duplicate cabin reservation.");
            slots.add(p.slot);
          }
          if (["boarding", "alighting"].includes(p.phase) && l.phase !== "open")
            throw new Error("Closed lift has a boarding passenger.");
          if (p.id !== "observer") {
            const a = sim.agents[Number(p.id.slice(4))];
            if (a.liftBank !== l.bank || a.liftStage === 0)
              throw new Error("Passenger journey does not match its lift.");
          }
        }
        if (load > 8) throw new Error("Lift capacity exceeded.");
      }
    }
  }
  if (s.teachers !== undefined) {
    const ids = new Set<string>();
    if (
      !Array.isArray(s.teachers) ||
      s.teachers.length > 180 ||
      !s.teachers.every((t: any) => {
        if (
          !t ||
          !roomById(t.room) ||
          ids.has(t.room) ||
          !point(t.point) ||
          !finite(t.heading) ||
          typeof t.walking !== "boolean" ||
          typeof t.action !== "string" ||
          typeof t.mode !== "string" ||
          !Array.isArray(t.path) ||
          t.path.length > 20 ||
          !t.path.every(point) ||
          !Number.isInteger(t.cursor) ||
          t.cursor < 0 ||
          t.cursor > t.path.length
        )
          return false;
        ids.add(t.room);
        return true;
      })
    )
      throw new Error("Invalid teacher state.");
  }
  if (s.staff !== undefined) {
    const ids = new Set<number>();
    if (
      !Array.isArray(s.staff) ||
      s.staff.length > 18 ||
      !s.staff.every((a: any) => {
        if (
          !a ||
          !Number.isInteger(a.index) ||
          a.index < 31000 ||
          a.index >= 31018 ||
          ids.has(a.index) ||
          !point(a.point) ||
          !finite(a.heading) ||
          typeof a.walking !== "boolean" ||
          typeof a.action !== "string" ||
          !Number.isInteger(a.stop) ||
          a.stop < 0 ||
          !finite(a.wait) ||
          a.wait < 0
        )
          return false;
        ids.add(a.index);
        return true;
      })
    )
      throw new Error("Invalid staff state.");
  }
  return s;
}
const KEY = "temhs-save-v3";
export function saveLocal(save: Save) {
  const raw = encode(save);
  decode(raw);
  localStorage.setItem(KEY, raw);
}
export function loadLocal() {
  const raw =
    localStorage.getItem(KEY) ??
    localStorage.getItem("temhs-save-v2") ??
    localStorage.getItem("temhs-save-v1");
  return raw ? decode(raw) : null;
}
