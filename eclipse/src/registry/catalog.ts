import { PermissionFlagsBits } from 'discord.js';

export type OptType = 's' | 'i' | 'n' | 'b' | 'u' | 'r' | 'c' | 'a';
export interface OptSpec { n: string; t: OptType; req: boolean; ac: boolean }
export type AxisVal = string | number | boolean;
export interface Base {
  module: string; root: string; name: string; desc: string;
  perms: bigint; cd: number; opts: OptSpec[]; risk: boolean;
  axes: [string, AxisVal[]][]; ctx?: { type: 'user' | 'message'; label: string };
  handlerKey: string; size: number;
}
export interface Entry {
  id: number; base: Base; vars: Record<string, AxisVal>;
  module: string; name: string; path: string; perms: bigint; cooldownMs: number; handlerKey: string;
}
export interface DefExtra { p?: string; cd?: number; o?: string; risk?: boolean; ax?: Record<string, AxisVal[]>; ctx?: Base['ctx'] }

/** Option DSL: "user:u!,reason:s,feature:s!@" → name:type, `!` required, `@` autocomplete. */
export function parseOpts(s = ''): OptSpec[] {
  return s.split(',').filter(Boolean).map((x) => {
    const [n, t] = x.split(':');
    return { n, t: t[0] as OptType, req: t.includes('!'), ac: t.includes('@') };
  });
}

export function makeBase(module: string, root: string, name: string, desc: string, x: DefExtra = {}): Base {
  const perms = x.p ? (PermissionFlagsBits as Record<string, bigint>)[x.p] : 0n;
  if (perms === undefined) throw new Error(`unknown permission ${x.p}`);
  const axes = Object.entries(x.ax ?? {});
  return { module, root, name, desc, perms, cd: x.cd ?? 1000, opts: parseOpts(x.o), risk: !!x.risk, axes, ctx: x.ctx,
    handlerKey: `${module}.${root}.${name}`, size: axes.reduce((n, [, v]) => n * v.length, 1) };
}

export class Catalog {
  /** prefix sums: entry id → base via binary search. No per-entry storage: 50k+ ids cost ~1KB. */
  readonly offsets: Uint32Array;
  readonly size: number;
  private byKey = new Map<string, Base>();
  constructor(readonly bases: Base[]) {
    this.offsets = new Uint32Array(bases.length + 1);
    bases.forEach((b, i) => { this.offsets[i + 1] = this.offsets[i] + b.size; this.byKey.set(`${b.root} ${b.name}`, b); });
    this.size = this.offsets[bases.length];
  }
  base(root: string, name: string) { return this.byKey.get(`${root} ${name}`); }
  baseIndex(b: Base) { return this.bases.indexOf(b); }
  /** Variant params for ordinal `ord` within base (mixed radix, first axis fastest). */
  static vars(b: Base, ord: number): Record<string, AxisVal> {
    const v: Record<string, AxisVal> = {};
    for (const [k, vals] of b.axes) { v[k] = vals[ord % vals.length]; ord = Math.floor(ord / vals.length); }
    return v;
  }
  entryOf(b: Base, ord: number): Entry {
    const vars = Catalog.vars(b, ord), vs = Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(',');
    const bi = this.baseIndex(b);
    return { id: this.offsets[bi] + ord, base: b, vars, module: b.module, perms: b.perms, cooldownMs: b.cd, handlerKey: b.handlerKey,
      name: `${b.module}.${b.name}${vs ? ':' + vs : ''}`, path: `${b.root}/${b.name}${vs ? '?' + vs : ''}` };
  }
  entry(id: number): Entry | undefined {
    if (!Number.isInteger(id) || id < 0 || id >= this.size) return undefined;
    let lo = 0, hi = this.bases.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (this.offsets[m] <= id) lo = m; else hi = m - 1; }
    return this.entryOf(this.bases[lo], id - this.offsets[lo]);
  }
  /** Token search: every token must appear in "module root name" or the variant string. */
  search(q: string, limit = 25): Entry[] {
    const toks = q.toLowerCase().split(/\s+/).filter(Boolean), out: Entry[] = [];
    for (const b of this.bases) {
      const label = `${b.module} ${b.root} ${b.name}`;
      const rest = toks.filter((t) => !label.includes(t));
      if (rest.length && !b.axes.length) continue;
      for (let o = 0; o < b.size && out.length < limit; o++) {
        if (rest.length) { const e = this.entryOf(b, o); if (!rest.every((t) => e.name.includes(t))) continue; out.push(e); }
        else { out.push(this.entryOf(b, o)); break; } // label match: show the base once
      }
      if (out.length >= limit) break;
    }
    return out;
  }
  stats() {
    const per: Record<string, number> = {};
    for (const b of this.bases) per[b.module] = (per[b.module] ?? 0) + b.size;
    return { total: this.size, bases: this.bases.length, perModule: per };
  }
}
