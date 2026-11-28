import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Collection/key JSON store with debounced atomic flush. file=null => memory only (tests).
 * shortcut: single-process, whole-file rewrite; swap for SQLite/Postgres when data > ~50MB or sharding. */
export class Store {
  private d = new Map<string, Map<string, any>>();
  private timer?: NodeJS.Timeout;
  constructor(private file: string | null) {
    if (file && existsSync(file)) {
      const raw = JSON.parse(readFileSync(file, 'utf8')) as Record<string, Record<string, unknown>>;
      for (const [c, m] of Object.entries(raw)) this.d.set(c, new Map(Object.entries(m)));
    }
  }
  private col(c: string) { let m = this.d.get(c); if (!m) this.d.set(c, (m = new Map())); return m; }
  get<T = any>(c: string, k: string): T | undefined { return this.col(c).get(k); }
  set<T>(c: string, k: string, v: T) { this.col(c).set(k, v); this.dirty(); return v; }
  /** Read-modify-write with a default; fn mutates in place. */
  upd<T>(c: string, k: string, def: () => T, fn: (v: T) => void): T {
    const v = this.get<T>(c, k) ?? def(); fn(v); return this.set(c, k, v);
  }
  del(c: string, k: string) { this.col(c).delete(k); this.dirty(); }
  entries<T = any>(c: string, prefix = ''): [string, T][] {
    return [...this.col(c)].filter(([k]) => k.startsWith(prefix)) as [string, T][];
  }
  private dirty() {
    if (!this.file || this.timer) return;
    this.timer = setTimeout(() => this.flush(), 500); this.timer.unref();
  }
  flush() {
    this.timer = undefined;
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true });
    const out: Record<string, Record<string, unknown>> = {};
    for (const [c, m] of this.d) out[c] = Object.fromEntries(m);
    writeFileSync(this.file + '.tmp', JSON.stringify(out)); renameSync(this.file + '.tmp', this.file);
  }
}
