import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { SaveRepository } from "../src/core/SaveRepository";
import type { Save } from "../src/core/SaveSystem";
const legacy: Save = {
  version: 1,
  seed: 20260907,
  day: 2,
  minute: 570,
  speed: 1,
  player: { x: -14, y: -15.15, z: 28 },
  rotation: { x: 0, y: 3.14, z: 0 },
  hold: false,
  doors: ["B2-101"],
  quality: "medium",
};
let old: Map<string, string>;
beforeEach(() => {
  old = new Map();
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("localStorage", { getItem: (k: string) => old.get(k) ?? null });
});
afterEach(() => vi.unstubAllGlobals());
it("migrates a legacy snapshot and retains its original backup", async () => {
  old.set("temhs-save-v1", JSON.stringify(legacy));
  const repo = new SaveRepository();
  expect(await repo.load()).toEqual(legacy);
  old.clear();
  expect(await new SaveRepository().load()).toEqual(legacy);
});
it("serializes writes and preserves the previous save after invalid import", async () => {
  const repo = new SaveRepository();
  await Promise.all([
    repo.save(legacy),
    repo.save({ ...legacy, minute: 580 }),
    repo.save({ ...legacy, minute: 590 }),
  ]);
  expect((await repo.load())?.minute).toBe(590);
  expect(() => repo.save({ ...legacy, minute: NaN })).toThrow();
  expect((await repo.load())?.minute).toBe(590);
});
it("reports transaction aborts and allows subsequent saves", async () => {
  const repo = new SaveRepository();
  await repo.save(legacy);
  const db = await new Promise<IDBDatabase>((resolve) => {
    const req = indexedDB.open("temhs-campus", 1);
    req.onsuccess = () => resolve(req.result);
  });
  const proto = Object.getPrototypeOf(db);
  const original = proto.transaction;
  const spy = vi.spyOn(proto, "transaction").mockImplementation(function (
    this: IDBDatabase,
    ...args: any[]
  ) {
    const tx = original.apply(this, args);
    if (args[1] === "readwrite") queueMicrotask(() => tx.abort());
    return tx;
  });
  await expect(repo.save({ ...legacy, minute: 600 })).rejects.toBeTruthy();
  spy.mockRestore();
  expect((await repo.load())?.minute).toBe(570);
  await repo.save({ ...legacy, minute: 601 });
  expect((await repo.load())?.minute).toBe(601);
  db.close();
});
