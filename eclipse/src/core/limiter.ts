/** In-memory cooldowns + sliding-window buckets. Self-sweeping so memory stays bounded. */
export class Limiter {
  private until = new Map<string, number>();
  private hits = new Map<string, number[]>();
  constructor(now = () => Date.now()) { this.now = now; setInterval(() => this.sweep(), 60_000).unref(); }
  private now: () => number;
  /** Returns ms remaining if on cooldown, else 0 and starts the cooldown. */
  cooldown(key: string, ms: number): number {
    if (ms <= 0) return 0;
    const t = this.now(), u = this.until.get(key) ?? 0;
    if (u > t) return u - t;
    this.until.set(key, t + ms); return 0;
  }
  /** True if allowed (and records the hit); false when > max hits within windowMs. */
  bucket(key: string, max: number, windowMs: number): boolean {
    const t = this.now(), arr = (this.hits.get(key) ?? []).filter((x) => x > t - windowMs);
    if (arr.length >= max) { this.hits.set(key, arr); return false; }
    arr.push(t); this.hits.set(key, arr); return true;
  }
  sweep() {
    const t = this.now();
    for (const [k, u] of this.until) if (u <= t) this.until.delete(k);
    for (const [k, a] of this.hits) if (!a.length || a[a.length - 1] < t - 600_000) this.hits.delete(k);
  }
}
