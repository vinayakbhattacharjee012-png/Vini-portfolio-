import type { Message } from 'discord.js';
import { AI_SETUP_NOTICE, aiConfigured, getEnv } from '../core/env.js';
import { exec, findEntry, resolveRun } from '../core/dispatch.js';
import { schedule } from '../core/scheduler.js';
import type { Deps, Handler, Module } from '../core/types.js';
import { card, eph, fmtDur } from './util.js';

let D: Deps;
export type AiResult = { ok: true; text: string } | { ok: false; notice: string };

/** Server-side call to an OpenAI-compatible endpoint. Never fabricates: unconfigured/failed → explicit notice. */
export async function callAI(system: string, user: string, fetchFn: typeof fetch = fetch): Promise<AiResult> {
  if (!aiConfigured()) return { ok: false, notice: AI_SETUP_NOTICE };
  const e = getEnv();
  try {
    const r = await fetchFn(e.aiUrl, { method: 'POST', signal: AbortSignal.timeout(30_000), headers: { 'content-type': 'application/json', authorization: `Bearer ${e.aiKey}` },
      body: JSON.stringify({ model: e.aiModel, max_tokens: 700, messages: [{ role: 'system', content: system }, { role: 'user', content: user.slice(0, 6000) }] }) });
    if (!r.ok) return { ok: false, notice: `⚠️ AI endpoint returned HTTP ${r.status}. Check AI_API_URL / AI_API_KEY / AI_MODEL.` };
    const j: any = await r.json(); const t = j?.choices?.[0]?.message?.content;
    return t ? { ok: true, text: String(t).slice(0, 1900) } : { ok: false, notice: '⚠️ AI endpoint replied without text.' };
  } catch (err) { return { ok: false, notice: `⚠️ AI endpoint unreachable: ${(err as Error).message}` }; }
}
const out = (r: AiResult) => (r.ok ? { content: r.text, allowedMentions: { parse: [] as never[] } } : eph(r.notice));
const PERSONA: Record<string, string> = { assistant: 'You are a helpful assistant.', concise: 'Answer in at most 3 sentences.', teacher: 'Explain step by step like a patient teacher.', critic: 'Give a critical, constructive review.', planner: 'Produce a short actionable plan.' };

export const H: Record<string, Handler> = {
  async 'ai.chat'(c) { return out(await callAI(PERSONA[String(c.a.persona ?? 'assistant')] ?? PERSONA.assistant, String(c.a.prompt))); },
  async 'ai.code'(c) { return out(await callAI(`You are a senior ${c.a.lang ?? 'software'} engineer. Reply with concise, correct code and a short explanation.`, String(c.a.prompt))); },
  async 'ai.summarize'(c) {
    if (!aiConfigured()) return eph(AI_SETUP_NOTICE);
    let text = c.a._msg ? String(c.a._msg.content) : '';
    if (!text) { const ch: any = c.channel; text = [...(await ch.messages.fetch({ limit: Math.min(100, Number(c.a.count ?? 25)) })).values()].reverse().map((m: Message) => `${m.author.username}: ${m.content}`).join('\n'); }
    return out(await callAI('Summarise this Discord conversation in under 120 words with bullet points.', text));
  },
  async 'ai.research'(c) { return out(await callAI(`Research assistant. Depth: ${c.a.depth ?? 'standard'}. You have NO web access: answer from training knowledge, flag uncertainty, and say when sources must be checked.`, String(c.a.topic))); },

  async 'trigger.add'(c) {
    const l = c.store.get<any[]>('trigger', c.guild.id) ?? [], p = String(c.a.pattern).slice(0, 80); if (l.length >= 50) return 'Trigger limit (50) reached.';
    if (c.a.regex) { if (/(\+|\*|\{\d*,?\d*\})\)?(\+|\*|\{)/.test(p)) return '⛔ Pattern rejected: nested quantifiers can freeze the bot (ReDoS).'; try { new RegExp(p, 'i'); } catch { return 'Invalid regex.'; } }
    const id = (l.at(-1)?.id ?? 0) + 1; l.push({ id, p, r: !!c.a.regex, resp: String(c.a.response).slice(0, 500) }); c.store.set('trigger', c.guild.id, l); return `✅ Trigger #${id} added.`;
  },
  async 'trigger.list'(c) { return { embeds: [card('Triggers', (c.store.get<any[]>('trigger', c.guild.id) ?? []).map((t) => `**#${t.id}** ${t.r ? 'regex' : 'keyword'} \`${t.p}\` → ${t.resp.slice(0, 60)}`).join('\n') || 'None.')] }; },
  async 'trigger.remove'(c) { c.store.set('trigger', c.guild.id, (c.store.get<any[]>('trigger', c.guild.id) ?? []).filter((t) => t.id !== Number(c.a.id))); return '✅ Removed.'; },

  async 'remind.set'(c) {
    const min = Math.min(525600, Math.max(1, Number(c.a.minutes))); const mine = c.store.entries<any>('jobs').filter(([, j]) => j.kind === 'remind' && j.data.uid === c.actor.id);
    if (mine.length >= 20) return 'You have 20 pending reminders already.';
    schedule(D, { at: Date.now() + min * 60_000, kind: 'remind', module: 'ai', guildId: c.guild.id, data: { uid: c.actor.id, ch: c.channel?.id, text: String(c.a.text).slice(0, 300) } });
    return eph(`⏰ I will remind you in ${fmtDur(min * 60_000)}.`);
  },
  async 'remind.list'(c) { const m = mine(c); return eph(m.map(([, j], i) => `**${i + 1}.** <t:${Math.floor(j.at / 1000)}:R> — ${j.data.text}`).join('\n') || 'None.'); },
  async 'remind.cancel'(c) { const m = mine(c), t = m[Number(c.a.id) - 1]; if (!t) return eph('No such reminder (see /remind list).'); c.store.del('jobs', t[0]); return eph('✅ Cancelled.'); },

  async 'workflow.add'(c) {
    const e = findEntry(String(c.a.feature)); if (!e) return 'Unknown feature; use the autocomplete.'; if (['core.eclipse.run', 'ai.workflow.run'].includes(e.handlerKey)) return 'That entry cannot be a workflow step.';
    const k = `${c.guild.id}:${String(c.a.name).toLowerCase()}`, w = c.store.get<any>('workflow', k) ?? { steps: [] }; if (w.steps.length >= 10) return 'Max 10 steps.';
    w.steps.push({ id: e.id, user: c.a.user?.id, role: c.a.role?.id, channel: c.a.channel?.id, text: c.a.text, number: c.a.number, flag: c.a.flag }); c.store.set('workflow', k, w); return `✅ Step ${w.steps.length}: \`${e.name}\``;
  },
  async 'workflow.show'(c) { const w = c.store.get<any>('workflow', `${c.guild.id}:${String(c.a.name).toLowerCase()}`); return w ? { embeds: [card(String(c.a.name), w.steps.map((s: any, i: number) => `${i + 1}. \`${findEntry(String(s.id))?.name}\``).join('\n'))] } : 'No such workflow.'; },
  async 'workflow.delete'(c) { c.store.del('workflow', `${c.guild.id}:${String(c.a.name).toLowerCase()}`); return '✅ Deleted.'; },
  async 'workflow.run'(c) {
    const w = c.store.get<any>('workflow', `${c.guild.id}:${String(c.a.name).toLowerCase()}`); if (!w?.steps.length) return 'No such workflow (or it is empty).';
    const steps = w.steps.map((s: any) => ({ s, e: findEntry(String(s.id))! })), risky = steps.filter((x: any) => x.e.base.risk).length;
    if (!(await c.confirm(`Run **${steps.length}** steps (${risky} consequential)?\n${steps.map((x: any, i: number) => `${i + 1}. ${x.e.name}`).join('\n')}`))) return;
    const log: string[] = [];
    for (const { s, e } of steps) {
      const r = await exec(D, { guild: c.guild, actor: c.actor, channel: c.channel, confirmed: true, depth: 1 }, e, await resolveRun(c.guild, e.base, e.vars, s));
      const t = typeof r === 'string' ? r : r ? (r.content ?? 'ok') : 'ok'; log.push(`• ${e.name}: ${String(t).slice(0, 120)}`);
      if (/^(⛔|⚠️|⏳)/.test(String(t))) { log.push('⏹️ Stopped at first failure.'); break; }
    }
    return log.join('\n').slice(0, 1900);
  },
};
const mine = (c: Parameters<Handler>[0]) => c.store.entries<any>('jobs').filter(([, j]) => j.kind === 'remind' && j.data.uid === c.actor.id).sort((a, b) => a[1].at - b[1].at);

export const jobs: Module['jobs'] = {
  async remind(j, d) {
    const ch: any = d.client.channels.cache.get(j.data.ch), msg = `⏰ <@${j.data.uid}> reminder: ${j.data.text}`;
    if (ch?.isSendable()) await ch.send({ content: msg, allowedMentions: { users: [j.data.uid] } }).catch(() => {});
    else await (await d.client.users.fetch(j.data.uid)).send(msg).catch(() => {});
  },
};

const lastHit = new Map<string, number>();
export const hook: Module['hook'] = (d) => {
  D = d;
  d.client.on('messageCreate', async (m: Message) => {
    if (!m.inGuild() || m.author.bot || !m.content) return;
    const l = d.store.get<any[]>('trigger', m.guildId); if (!l?.length) return;
    const text = m.content.slice(0, 300), lc = text.toLowerCase();
    for (const t of l) {
      if (!(t.r ? new RegExp(t.p, 'i').test(text) : lc.includes(t.p.toLowerCase()))) continue;
      const k = `${m.guildId}:${t.id}`; if (Date.now() - (lastHit.get(k) ?? 0) < 5000) continue; lastHit.set(k, Date.now());
      await m.reply({ content: t.resp, allowedMentions: { parse: [] } }).catch(() => {}); break;
    }
  });
};
