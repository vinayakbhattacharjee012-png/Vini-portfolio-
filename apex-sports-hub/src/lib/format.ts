export function ago(iso: string | undefined, now: number) {
  if (!iso) return '';
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

export function kickoff(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return { day: 'Today', time };
  if (d.toDateString() === tomorrow.toDateString()) return { day: 'Tomorrow', time };
  return { day: d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }), time };
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
