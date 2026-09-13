import { decode, encode, loadLocal, type Save } from "./SaveSystem";
/** Transactional snapshot storage; legacy keys stay intact until users remove them. */
export class SaveRepository {
  private pending: Promise<void> = Promise.resolve();
  private database: Promise<IDBDatabase> | null = null;
  private open() {
    return (this.database ??= new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB is unavailable. Export a backup instead."));
        return;
      }
      const request = indexedDB.open("temhs-campus", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("snapshots");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        this.database = null;
        reject(request.error);
      };
      request.onblocked = () => {
        this.database = null;
        reject(new Error("Close another TEMHS tab to upgrade saves."));
      };
    }));
  }
  save(state: Save) {
    const raw = encode(state);
    decode(raw);
    const operation = this.pending
      .catch(() => {})
      .then(async () => {
        const db = await this.open();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("snapshots", "readwrite");
          tx.objectStore("snapshots").put(raw, "current");
          tx.oncomplete = () => resolve();
          tx.onerror = () =>
            reject(tx.error ?? new Error("Save transaction failed."));
          tx.onabort = () => reject(tx.error ?? new Error("Save interrupted."));
        });
      });
    this.pending = operation;
    return operation;
  }
  async load() {
    await this.pending.catch(() => {});
    const db = await this.open();
    const raw = await new Promise<string | undefined>((resolve, reject) => {
      const req = db
        .transaction("snapshots")
        .objectStore("snapshots")
        .get("current");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (raw) return decode(raw);
    const legacy = loadLocal();
    if (legacy) await this.save(legacy);
    return legacy;
  }
}
