import type { Handler } from '../core/types.js';
import { getEnv } from '../core/env.js';
import { card, pick } from './util.js';

interface Q { tracks: { title: string; by: string }[]; paused: boolean; loop: 'off' | 'track' | 'queue' }
const queues = new Map<string, Q>();
const q = (g: string) => queues.get(g) ?? (queues.set(g, { tracks: [], paused: false, loop: 'off' }), queues.get(g)!);

/** Honest backend status: playback needs @discordjs/voice AND a stream resolver (AUDIO_STREAM_URL). Neither is bundled. */
export async function audioStatus() {
  const voice = await import('@discordjs/voice' as string).then(() => true, () => false), prov = !!getEnv().audioUrl;
  return { voice, prov, ready: voice && prov };
}
const NOTE = '🔇 **Audio playback is not available in this build.** The queue below is real and local, but no audio will play until a voice library and a stream provider are wired in (`/music status`).';

export const H: Record<string, Handler> = {
  async play(c) {
    const Q = q(c.guild.id); if (Q.tracks.length >= 200) return 'Queue is full (200).';
    Q.tracks.push({ title: String(c.a.query).slice(0, 150), by: c.actor.id }); const s = await audioStatus();
    return `➕ Queued **${c.a.query}** (#${Q.tracks.length}).${s.ready ? '' : '\n' + NOTE}`;
  },
  async queue(c) { const Q = q(c.guild.id); return { embeds: [card(`Queue (${Q.tracks.length}) · loop ${Q.loop}${Q.paused ? ' · paused' : ''}`, Q.tracks.slice(0, 20).map((t, i) => `${i + 1}. ${t.title} — <@${t.by}>`).join('\n') || 'Empty.')], allowedMentions: { parse: [] } }; },
  async skip(c) { const Q = q(c.guild.id), t = Q.tracks.shift(); if (t && Q.loop === 'queue') Q.tracks.push(t); return t ? `⏭️ Skipped **${t.title}**.` : 'Queue is empty.'; },
  async pause(c) { q(c.guild.id).paused = true; return '⏸️ Queue marked paused (no audio is playing in this build).'; },
  async resume(c) { q(c.guild.id).paused = false; return '▶️ Queue marked resumed.'; },
  async loop(c) { const m = String(c.a.mode); if (!['off', 'track', 'queue'].includes(m)) return 'mode: off|track|queue'; q(c.guild.id).loop = m as Q['loop']; return `🔁 Loop: ${m}`; },
  async shuffle(c) { const t = q(c.guild.id).tracks; for (let i = t.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [t[i], t[j]] = [t[j], t[i]]; } return `🔀 Shuffled ${t.length} tracks.${t.length ? ' First: ' + pick(t).title : ''}`; },
  async remove(c) { const t = q(c.guild.id).tracks, i = Number(c.a.pos) - 1; if (!t[i]) return 'No such position.'; return `🗑️ Removed **${t.splice(i, 1)[0].title}**.`; },
  async clear(c) { q(c.guild.id).tracks.length = 0; return '🧹 Queue cleared.'; },
  async status() {
    const s = await audioStatus();
    return { embeds: [card('Audio backend', `**Voice library (@discordjs/voice):** ${s.voice ? '✅ installed' : '❌ not installed'}\n**Stream provider (AUDIO_STREAM_URL):** ${s.prov ? '✅ set' : '❌ not set'}\n**Playback adapter:** ❌ not implemented in this build\n\n${s.ready ? 'Dependencies present, but no playback adapter exists yet; only the queue works.' : NOTE}`)] };
  },
};
