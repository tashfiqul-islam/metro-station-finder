import type { Milliseconds } from "@/lib/types";

/** Bounded TTL cache with simple LRU eviction by insertion order. */
export class BoundedTtlCache<K, V> {
  private readonly store = new Map<K, { value: V; expiresAt: Milliseconds }>();
  private readonly capacity: number;
  private readonly ttl: Milliseconds;

  constructor(capacity: number, ttl: Milliseconds) {
    this.capacity = capacity;
    this.ttl = ttl;
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (entry === undefined) {
      return;
    }
    if ((Date.now() as Milliseconds) > entry.expiresAt) {
      this.store.delete(key);
      return;
    }
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.store.size >= this.capacity) {
      const oldest = this.store.keys().next().value as K | undefined;
      if (oldest !== undefined) {
        this.store.delete(oldest);
      }
    }
    this.store.set(key, {
      value,
      expiresAt: ((Date.now() as Milliseconds) + this.ttl) as Milliseconds,
    });
  }
}
