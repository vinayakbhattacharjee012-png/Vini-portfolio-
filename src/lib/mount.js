import css from "../islands.css?inline";
import { isTyping } from "./utils";

// Browsers ignore @property inside shadow roots, so Tailwind's --tw-* defaults (border style, translate,
// shadows…) never get their initial values there. Registering the same rules on the document fixes every root.
let propsDone = false, sheet = null;
function registerProps() {
  if (propsDone) return;
  propsDone = true;
  const rules = css.match(/@property\s+--tw-[\w-]+\s*\{[^}]*\}/g);
  if (rules) document.head.append(Object.assign(document.createElement("style"), { textContent: rules.join("\n") }));
}

// Gives a host element a shadow root styled with the islands CSS and returns the box to render into.
export function attach(host) {
  registerProps();
  const root = host.attachShadow({ mode: "open" });
  // One parsed stylesheet shared by every shadow root (the homepage has four), instead of a copy each.
  if ("adoptedStyleSheets" in root) {
    if (!sheet) { sheet = new CSSStyleSheet(); sheet.replaceSync(css); }
    root.adoptedStyleSheets = [sheet];
  } else root.append(Object.assign(document.createElement("style"), { textContent: css }));
  const box = document.createElement("div");
  root.append(box);
  // Keys typed into these forms must not trigger the page's single-key shortcuts (/, `, ?, galaxy).
  host.addEventListener("keydown", (e) => { if (isTyping(e) && !e.ctrlKey && !e.metaKey && !e.altKey) e.stopPropagation(); });
  return box;
}

// Mirrors the site's Calm mode (data-calm on <html>) onto each host, where shadow CSS can see it.
export function syncCalm(hosts) {
  const sync = () => hosts.forEach((h) => h.classList.toggle("calm", document.documentElement.hasAttribute("data-calm")));
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ["data-calm"] });
  sync();
}
