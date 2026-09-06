import type { Point } from "../campus/plan";
export interface Save {
  version: 1;
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
export function encode(save: Save) {
  return JSON.stringify(save);
}
export function decode(raw: string): Save {
  const s = JSON.parse(raw);
  if (
    s.version !== 1 ||
    s.seed !== 20260907 ||
    !Number.isInteger(s.day) ||
    s.day < 0 ||
    !Number.isFinite(s.minute) ||
    s.minute < 0 ||
    s.minute >= 1440 ||
    ![1, 10, 60].includes(s.speed) ||
    typeof s.hold !== "boolean" ||
    !Array.isArray(s.doors) ||
    !s.doors.every((x: unknown) => typeof x === "string") ||
    !["low", "medium", "high"].includes(s.quality) ||
    ![s.player, s.rotation].every(
      (p) => p && ["x", "y", "z"].every((k) => Number.isFinite(p[k])),
    )
  )
    throw new Error("This save is invalid or uses an unsupported version.");
  return s;
}
const KEY = "temhs-save-v1";
export function saveLocal(save: Save) {
  localStorage.setItem(KEY, encode(save));
}
export function loadLocal() {
  const raw = localStorage.getItem(KEY);
  return raw ? decode(raw) : null;
}
