import css from "../islands.css?inline";
import { isTyping } from "./utils";

// Gives a host element a shadow root styled with the islands CSS and returns the box to render into.
export function attach(host) {
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = css;
  const box = document.createElement("div");
  root.append(style, box);
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
