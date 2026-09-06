import config from "../data/schedules/masterClock.json";
export type WorldState =
  | "PRE-ARRIVAL"
  | "ARRIVAL"
  | "HOMING"
  | "ACADEMIC PULSE"
  | "PASSAGE"
  | "MEAL ROTATION"
  | "TERMINAL RELEASE"
  | "AFTER-SCHOOL"
  | "EVENING FACILITIES";
export interface Block {
  start: number;
  end: number;
  kind: WorldState;
  pulse: number;
  label: string;
}
export const blocks: Block[] = [];
let cursor = config.startMinute;
function add(
  kind: WorldState,
  minutes: number,
  pulse = 0,
  label: string = kind,
) {
  blocks.push({ start: cursor, end: cursor + minutes, kind, pulse, label });
  cursor += minutes;
}
add("HOMING", config.homingMinutes, 0, "Homing & Instrument Check");
for (let p = 1; p <= config.pulseCount; p++) {
  add("ACADEMIC PULSE", config.pulseMinutes, p, `Academic Pulse ${p}`);
  if (p === config.mealAfterPulse)
    add("MEAL ROTATION", config.mealMinutes, p, "Meals A · B · C");
  if (p < config.pulseCount)
    add("PASSAGE", config.passageMinutes, p, "Passage");
}
add("TERMINAL RELEASE", config.terminalMinutes, 7, "Terminal Release waves");
export class GameClock {
  day = 0;
  minute = config.defaultMinute;
  speed = 1;
  paused = false;
  get cycleDay() {
    return (this.day % config.cycleLength) + 1;
  }
  get block(): Block {
    return (
      blocks.find((b) => this.minute >= b.start && this.minute < b.end) ?? {
        start: 0,
        end: 1440,
        kind:
          this.minute < 450
            ? "PRE-ARRIVAL"
            : this.minute < 480
              ? "ARRIVAL"
              : this.minute < 1080
                ? "AFTER-SCHOOL"
                : "EVENING FACILITIES",
        pulse: 0,
        label:
          this.minute < 450
            ? "Pre-arrival"
            : this.minute < 480
              ? "Arrival"
              : this.minute < 1080
                ? "After-school"
                : "Evening facilities",
      }
    );
  }
  tick(seconds: number, hold = false) {
    if (this.paused) return;
    if (hold && this.block.kind === "PASSAGE") return;
    const nextPassage = hold
      ? blocks.find((b) => b.kind === "PASSAGE" && b.start > this.minute)
      : undefined;
    this.minute += (Math.max(0, seconds) * this.speed) / 60;
    if (nextPassage && this.minute >= nextPassage.start)
      this.minute = nextPassage.start;
    while (this.minute >= 1440) {
      this.minute -= 1440;
      this.day++;
    }
  }
  get time() {
    return `${String(Math.floor(this.minute / 60)).padStart(2, "0")}:${String(Math.floor(this.minute % 60)).padStart(2, "0")}`;
  }
  next() {
    const b = blocks.find((b) => b.start > this.minute + 0.001);
    if (b) this.minute = b.start;
    else {
      this.day++;
      this.minute = config.startMinute;
    }
  }
  get date() {
    const d = new Date(Date.UTC(2026, 8, 7 + this.day));
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
}
export function lessonPhase(clock: GameClock) {
  const b = clock.block;
  if (b.kind !== "ACADEMIC PULSE") return b.kind;
  const t = (clock.minute - b.start) / (b.end - b.start);
  return t < 0.08
    ? "SETTLE"
    : t < 0.18
      ? "OPENING"
      : t < 0.45
        ? "DIRECT INSTRUCTION"
        : t < 0.65
          ? "DISCUSSION"
          : t < 0.87
            ? "INDIVIDUAL WORK"
            : t < 0.96
              ? "CLOSURE"
              : "PACKING";
}
