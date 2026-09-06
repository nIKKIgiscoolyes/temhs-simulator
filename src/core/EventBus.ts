export class EventBus<T> {
  private listeners = new Set<(event: T) => void>();
  on(fn: (event: T) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit(event: T) {
    for (const fn of this.listeners) fn(event);
  }
}
