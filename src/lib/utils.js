// Inside shadow DOM, e.target is retargeted to the host, so look at the real origin.
export const isTyping = (e) => {
  const t = e.composedPath?.()[0] || e.target;
  return t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || "");
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
