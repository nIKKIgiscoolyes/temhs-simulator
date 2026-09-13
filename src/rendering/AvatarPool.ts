import type { Scene } from "@babylonjs/core";
import type { Environment } from "../architecture/Environment";
import { Avatar } from "../npc/Avatar";
/** Bounded identity cache prevents destroy/rebuild oscillation at visibility thresholds. */
export class AvatarPool {
  private sleeping = new Map<number, Avatar>();
  constructor(
    private scene: Scene,
    private env: Environment,
    private capacity = 160,
  ) {}
  acquire(index: number) {
    const a =
      this.sleeping.get(index) ?? new Avatar(this.scene, this.env, index);
    this.sleeping.delete(index);
    a.root.setEnabled(true);
    return a;
  }
  release(a: Avatar) {
    a.root.setEnabled(false);
    this.sleeping.set(a.index, a);
    while (this.sleeping.size > this.capacity) {
      const [id, old] = this.sleeping.entries().next().value!;
      old.root.dispose();
      this.sleeping.delete(id);
    }
  }
  get cached() {
    return this.sleeping.size;
  }
  dispose() {
    for (const a of this.sleeping.values()) a.root.dispose();
    this.sleeping.clear();
  }
}
