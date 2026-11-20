export const isTyping = (e) => {
  const t = e.target, tag = (t.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable;
};

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = Object.assign(document.createElement("textarea"), { value: text });
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    ta.remove(); return ok;
  }
}

export function download(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function scrollToId(id, reduced) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}

// Subsequence fuzzy match. Higher is better; -1 means no match.
export function fuzzy(query, text) {
  const q = query.toLowerCase().trim(), t = text.toLowerCase();
  if (!q) return 0;
  if (t.includes(q)) return 100 - t.indexOf(q);
  let score = 0, ti = 0, run = 0;
  for (const ch of q) {
    if (ch === " ") continue;
    const at = t.indexOf(ch, ti);
    if (at < 0) return -1;
    run = at === ti ? run + 1 : 0;
    score += 1 + run * 2 + (at === 0 || t[at - 1] === " " ? 3 : 0);
    ti = at + 1;
  }
  return score;
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function istTime(date = new Date(), tz = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: tz }).format(date);
}

export function hourIn(tz, date = new Date()) {
  const p = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "numeric", hour12: false, timeZone: tz }).formatToParts(date);
  const get = (k) => Number(p.find((x) => x.type === k).value);
  return (get("hour") % 24) + get("minute") / 60;
}

// Minimal JS/JSX highlighter: comments, strings, keywords, numbers.
const KW = /\b(import|from|export|default|const|let|function|return|if|else|await|async|new|for|of|null|true|false)\b/;
export function highlight(code) {
  const out = [];
  const re = /(\/\/.*$|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_$][\w$]*\b)|([\s\S])/gm;
  let m;
  while ((m = re.exec(code))) {
    if (m[1]) out.push(["c", m[1]]);
    else if (m[2]) out.push(["s", m[2]]);
    else if (m[3]) out.push(["n", m[3]]);
    else if (m[4]) out.push([KW.test(m[4]) ? "k" : /^[A-Z]/.test(m[4]) ? "t" : "", m[4]]);
    else out.push(["", m[5]]);
  }
  return out;
}

export const refId = () => "VX-" + Date.now().toString(36).toUpperCase().slice(-5) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
