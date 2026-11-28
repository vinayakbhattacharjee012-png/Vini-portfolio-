import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type Message } from 'discord.js';
import type { Handler, Module } from '../core/types.js';
import { checkRole, isDangerous } from '../core/hierarchy.js';
import { card, eph, levelOf, pick, rnd, saveWallet, wallet, type Wallet } from './util.js';
import { randomUUID } from 'node:crypto';

const coin = (n: number) => `🪙 ${n.toLocaleString()}`;
const need = (w: Wallet, n: number) => (!Number.isInteger(n) || n < 1 ? 'Amount must be a positive whole number.' : w.coins < n ? `You only have ${coin(w.coins)}.` : null);
const HOUR = 3600_000;

export const SYMS = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣'];
/** Payout table per mode: [3-of-a-kind multiplier, pair multiplier]. EV < 1 for every mode (see tests). */
export const SLOT_PAY: Record<string, [number, number]> = { safe: [4, 1.5], normal: [8, 1.2], high: [20, 0.5] };
export const slotPayout = (bet: number, reels: string[], mode: string) => {
  const [t, p] = SLOT_PAY[mode] ?? SLOT_PAY.normal, u = new Set(reels).size;
  return Math.floor(bet * (u === 1 ? t : u === 2 ? p : 0));
};

export const H: Record<string, Handler> = {
  async balance(c) { const u = c.a.user ?? c.actor.user; return { content: `${u.username}: ${coin(wallet(c.store, c.guild.id, u.id).coins)}`, allowedMentions: { parse: [] } }; },
  async daily(c) {
    const w = wallet(c.store, c.guild.id, c.actor.id), left = w.lastDaily + 24 * HOUR - Date.now();
    if (left > 0) return `⏳ Come back in ${Math.ceil(left / HOUR)}h.`;
    w.coins += 250; w.lastDaily = Date.now(); saveWallet(c.store, c.guild.id, c.actor.id, w); return `✅ +${coin(250)} (balance ${coin(w.coins)}).`;
  },
  async work(c) {
    const w = wallet(c.store, c.guild.id, c.actor.id), left = w.lastWork + HOUR / 2 - Date.now();
    if (left > 0) return `⏳ Rest ${Math.ceil(left / 60000)}m first.`;
    const pay = 50 + rnd(101); w.coins += pay; w.lastWork = Date.now(); saveWallet(c.store, c.guild.id, c.actor.id, w); return `🛠️ You worked and earned ${coin(pay)}.`;
  },
  async give(c) {
    const to = c.a.user, n = Number(c.a.amount); if (to.bot || to.id === c.actor.id) return 'Pick another human.';
    const a = wallet(c.store, c.guild.id, c.actor.id), e = need(a, n); if (e) return e;
    const b = wallet(c.store, c.guild.id, to.id); a.coins -= n; b.coins += n; saveWallet(c.store, c.guild.id, c.actor.id, a); saveWallet(c.store, c.guild.id, to.id, b);
    return { content: `💸 Sent ${coin(n)} to ${to}.`, allowedMentions: { parse: [] } };
  },
  async rob(c) {
    const v = c.a.user; if (v.bot || v.id === c.actor.id) return 'Pick another human.';
    const me = wallet(c.store, c.guild.id, c.actor.id), t = wallet(c.store, c.guild.id, v.id);
    if (me.coins < 100) return 'You need at least 🪙 100 to risk a robbery.'; if (t.coins < 100) return 'Not worth it: target has under 🪙 100.';
    const win = Math.random() < 0.4;
    if (win) { const n = Math.min(500, Math.max(1, Math.floor(t.coins * (0.1 + Math.random() * 0.2)))); t.coins -= n; me.coins += n; saveWallet(c.store, c.guild.id, v.id, t); saveWallet(c.store, c.guild.id, c.actor.id, me); return { content: `🥷 You stole ${coin(n)} from ${v}!`, allowedMentions: { parse: [] } }; }
    me.coins -= 50; t.coins += 50; saveWallet(c.store, c.guild.id, v.id, t); saveWallet(c.store, c.guild.id, c.actor.id, me); return { content: `🚔 Caught! You paid ${v} a ${coin(50)} fine.`, allowedMentions: { parse: [] } };
  },
  async flip(c) {
    const n = Number(c.a.amount), w = wallet(c.store, c.guild.id, c.actor.id), e = need(w, n); if (e) return e;
    const call = String(c.a.call).toLowerCase(); if (!['heads', 'tails'].includes(call)) return 'Call heads or tails.';
    const res = pick(['heads', 'tails']), won = res === call; w.coins += won ? n : -n; saveWallet(c.store, c.guild.id, c.actor.id, w);
    return `🪙 **${res}** — you ${won ? `won ${coin(n)}` : `lost ${coin(n)}`}. Balance ${coin(w.coins)}.`;
  },
  async slots(c) {
    const n = Number(c.a.amount), w = wallet(c.store, c.guild.id, c.actor.id), e = need(w, n); if (e) return e;
    const mode = String(c.a.mode ?? 'normal'), reels = [pick(SYMS), pick(SYMS), pick(SYMS)], back = slotPayout(n, reels, mode);
    w.coins += back - n; saveWallet(c.store, c.guild.id, c.actor.id, w);
    return `🎰 ${reels.join(' ')} (${mode}) — ${back > n ? `won ${coin(back - n)}` : back === n ? 'broke even' : `lost ${coin(n - back)}`}. Balance ${coin(w.coins)}.`;
  },
  async trade(c) {
    const it = String(c.a.item), price = Number(c.a.price), to = c.a.user; if (to.bot || to.id === c.actor.id) return 'Pick another human.';
    const w = wallet(c.store, c.guild.id, c.actor.id); if (!(w.items[it] > 0)) return `You do not own **${it}**.`; if (!(price >= 0)) return 'Bad price.';
    const id = randomUUID().slice(0, 8); c.store.set('trade', id, { gid: c.guild.id, from: c.actor.id, to: to.id, it, price, exp: Date.now() + 300_000 });
    return { content: `${to}, **${c.actor.user.username}** offers **${it}** for ${coin(price)}.`, allowedMentions: { users: [to.id] },
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`economy:trade:${id}`).setLabel('Accept').setStyle(ButtonStyle.Success))] };
  },
  async top(c) { return board(c, 'coins'); },
  // shop
  async list(c) { const s = c.store.get<any>('shop', c.guild.id) ?? {}; return { embeds: [card('🛒 Shop', Object.entries(s).map(([k, v]: any) => `**${k}** — ${coin(v.price)} (${v.kind})`).join('\n') || 'Empty.')] }; },
  async add(c) {
    const kind = String(c.a.kind ?? 'cosmetic'), s = c.store.get<any>('shop', c.guild.id) ?? {}, name = String(c.a.name).slice(0, 40);
    if (kind === 'role') { const r = c.a.role; if (!r) return 'Role items need a `role`.'; const e = checkRole(c.guild, c.actor, r) ?? (isDangerous(r) ? 'Role has dangerous permissions.' : null); if (e) return `⛔ ${e}`; s[name] = { price: Number(c.a.price), kind, roleId: r.id }; }
    else s[name] = { price: Number(c.a.price), kind };
    if (Object.keys(s).length > 100) return 'Shop is full (100).'; c.store.set('shop', c.guild.id, s); return `✅ Added **${name}**.`;
  },
  async remove(c) { const s = c.store.get<any>('shop', c.guild.id) ?? {}; delete s[String(c.a.name)]; c.store.set('shop', c.guild.id, s); return '✅ Removed (owned copies stay in inventories).'; },
  async buy(c) {
    const s = c.store.get<any>('shop', c.guild.id) ?? {}, it = s[String(c.a.name)], qty = Math.max(1, Number(c.a.qty ?? 1)); if (!it) return 'No such item.';
    const w = wallet(c.store, c.guild.id, c.actor.id), cost = it.price * qty, e = need(w, cost); if (e) return e;
    if (it.kind === 'role') { const r = c.guild.roles.cache.get(it.roleId); if (!r || isDangerous(r) || c.me.roles.highest.position <= r.position) return 'That role can no longer be granted.'; await c.actor.roles.add(r, 'shop'); }
    w.coins -= cost; w.items[String(c.a.name)] = (w.items[String(c.a.name)] ?? 0) + qty; saveWallet(c.store, c.guild.id, c.actor.id, w); return `✅ Bought ${qty}× **${c.a.name}** for ${coin(cost)}.`;
  },
  async inventory(c) { const u = c.a.user ?? c.actor.user, w = wallet(c.store, c.guild.id, u.id); return { embeds: [card(`${u.username}'s inventory`, Object.entries(w.items).filter(([, n]) => n > 0).map(([k, n]) => `${k} ×${n}${w.equipped === k ? ' ✅' : ''}`).join('\n') || 'Empty.')] }; },
  async use(c) {
    const w = wallet(c.store, c.guild.id, c.actor.id), name = String(c.a.name), it = (c.store.get<any>('shop', c.guild.id) ?? {})[name];
    if (!(w.items[name] > 0)) return 'You do not own that.'; if (it?.kind !== 'consumable') return 'Only consumables can be used.';
    w.items[name]--; const xp = Math.floor(it.price / 2); w.xp += xp; saveWallet(c.store, c.guild.id, c.actor.id, w); return `🧪 Used **${name}**: +${xp} XP.`;
  },
  async equip(c) { const w = wallet(c.store, c.guild.id, c.actor.id), name = String(c.a.name); if (!(w.items[name] > 0)) return 'You do not own that.'; w.equipped = name; saveWallet(c.store, c.guild.id, c.actor.id, w); return `✅ Equipped **${name}**.`; },
  // levels
  async rank(c) { const u = c.a.user ?? c.actor.user, w = wallet(c.store, c.guild.id, u.id), L = levelOf(w.xp), nxt = 50 * (L + 1) ** 2; return { embeds: [card(`${u.username} · Level ${L}`, `XP **${w.xp}** / ${nxt}\n${'▰'.repeat(Math.floor(((w.xp - 50 * L * L) / (nxt - 50 * L * L)) * 10))}${'▱'.repeat(10 - Math.floor(((w.xp - 50 * L * L) / (nxt - 50 * L * L)) * 10))}`)] }; },
  async rewardadd(c) {
    const r = c.a.role, e = checkRole(c.guild, c.actor, r) ?? (isDangerous(r) ? 'Role has dangerous permissions.' : null); if (e) return `⛔ ${e}`;
    const m = c.store.get<any>('rewards', c.guild.id) ?? {}; m[c.a.level] = r.id; c.store.set('rewards', c.guild.id, m); return `✅ Level ${c.a.level} → ${r}.`;
  },
  async rewardremove(c) { const m = c.store.get<any>('rewards', c.guild.id) ?? {}; delete m[c.a.level]; c.store.set('rewards', c.guild.id, m); return '✅ Removed.'; },
  // profile / embeds
  async view(c) { const u = c.a.user ?? c.actor.user, w = wallet(c.store, c.guild.id, u.id); return { embeds: [card(u.username, `${w.bio ?? '*No bio*'}\n\n🪙 ${w.coins} · Lv ${levelOf(w.xp)} · XP ${w.xp}\nEquipped: ${w.equipped ?? 'nothing'}`, parseInt((w.color ?? '5865f2'), 16)).setThumbnail(u.displayAvatarURL())] }; },
  async set(c) {
    const w = wallet(c.store, c.guild.id, c.actor.id); if (c.a.bio) w.bio = String(c.a.bio).slice(0, 150);
    if (c.a.color) { const h = String(c.a.color).replace('#', ''); if (!/^[0-9a-f]{6}$/i.test(h)) return 'Color must be hex like `#ff8800`.'; w.color = h; }
    saveWallet(c.store, c.guild.id, c.actor.id, w); return eph('✅ Profile updated.');
  },
  async save(c) {
    const h = String(c.a.color ?? '5865f2').replace('#', ''); if (!/^[0-9a-f]{6}$/i.test(h)) return 'Bad color.';
    c.store.set('embed', `${c.guild.id}:${String(c.a.name).toLowerCase()}`, { t: String(c.a.title).slice(0, 256), d: String(c.a.description).slice(0, 4000), h }); return `✅ Saved template **${c.a.name}**.`;
  },
  async send(c) {
    const t = c.store.get<any>('embed', `${c.guild.id}:${String(c.a.name).toLowerCase()}`); if (!t) return 'No such template.';
    const ch: any = c.a.channel ?? c.channel; await ch.send({ embeds: [card(t.t, t.d, parseInt(t.h, 16))], allowedMentions: { parse: [] } }); return eph('✅ Sent.');
  },
};
const board = (c: Parameters<Handler>[0], f: 'coins' | 'xp') => {
  const rows = c.store.entries<Wallet>('wallet', `${c.guild.id}:`).map(([k, w]) => [k.split(':')[1], w[f]] as const).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return { embeds: [card(f === 'coins' ? '🏆 Richest' : '🏆 XP leaders', rows.map(([id, v], i) => `${i + 1}. <@${id}> — ${v.toLocaleString()}`).join('\n') || 'Nobody yet.')], allowedMentions: { parse: [] } };
};
H['level.top'] = async (c) => board(c, 'xp');

export const component: Module['component'] = async (i, deps) => {
  const [, kind, id] = i.customId.split(':'), st = deps.store;
  if (kind !== 'trade') return;
  const t = st.get('trade', id); if (!t || t.exp < Date.now()) return void i.reply(eph('Offer expired.'));
  if (i.user.id !== t.to) return void i.reply(eph('This offer is not for you.'));
  const s = wallet(st, t.gid, t.from), b = wallet(st, t.gid, t.to);
  if (!(s.items[t.it] > 0)) return void i.reply(eph('Seller no longer has the item.')); if (b.coins < t.price) return void i.reply(eph('You cannot afford this.'));
  s.items[t.it]--; s.coins += t.price; b.coins -= t.price; b.items[t.it] = (b.items[t.it] ?? 0) + 1;
  saveWallet(st, t.gid, t.from, s); saveWallet(st, t.gid, t.to, b); st.del('trade', id);
  await i.update({ content: `✅ Trade complete: **${t.it}** for ${coin(t.price)}.`, components: [] });
};

export const hook: Module['hook'] = (d) => {
  d.client.on('messageCreate', async (m: Message) => {
    if (!m.inGuild() || m.author.bot) return;
    const w = wallet(d.store, m.guildId, m.author.id); if (Date.now() - w.msgTs < 60_000) return;
    const before = levelOf(w.xp); w.xp += 15 + rnd(11); w.msgTs = Date.now(); saveWallet(d.store, m.guildId, m.author.id, w);
    const L = levelOf(w.xp); if (L <= before) return;
    const rid = (d.store.get<any>('rewards', m.guildId) ?? {})[L], role = rid && m.guild.roles.cache.get(rid), me = m.guild.members.me!;
    if (role && !isDangerous(role) && me.roles.highest.position > role.position) await m.member?.roles.add(role, `level ${L} reward`).catch(() => {});
    if ('send' in m.channel) void m.channel.send({ content: `🎉 ${m.author} reached **level ${L}**!${role ? ` Reward: ${role.name}` : ''}`, allowedMentions: { users: [m.author.id] } });
  });
};
