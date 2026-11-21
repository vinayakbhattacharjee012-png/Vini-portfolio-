import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "../lib/app";
import { attach, syncCalm } from "../lib/mount";

const LINKS = [["./", "Portfolio", "home"], ["command-center.html", "Command Center", "command-center"], ["features.html", "All features", "features"]];

// Header and footer shared by the extra pages; they use the portfolio's saved look.
function Shell({ current, children }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-zinc-700 bg-[var(--nav-bg)] backdrop-blur-md">
        <nav aria-label="Pages" className="mx-auto flex h-16 max-w-[1120px] items-center gap-3 px-4">
          <a href="./" className="flex items-center gap-2 font-semibold text-zinc-100" style={{ viewTransitionName: "brand" }}>
            <img src="logo-vini-256.webp" alt="" width="32" height="32" className="rounded-full" />Vini
          </a>
          <div className="ml-auto flex gap-1 overflow-x-auto text-sm">
            {LINKS.map(([href, label, id]) => (
              <a key={id} href={href} aria-current={current === id ? "page" : undefined}
                className={`${id === "home" ? "hidden sm:block " : ""}whitespace-nowrap rounded-full px-3 py-1.5 transition-colors ${current === id ? "bg-c1/15 text-zinc-100" : "text-zinc-400 hover:text-zinc-100"}`}>{label}</a>
            ))}
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="mt-16 border-t border-zinc-700 py-8 text-sm text-zinc-400">
        <div className="mx-auto flex max-w-[1120px] flex-wrap justify-between gap-3 px-4">
          <span>© 2026 Vini</span>
          <span className="num text-xs">Static site · no trackers · <a className="underline-offset-4 hover:text-c1 hover:underline" href="./#contact">contact</a></span>
        </div>
      </footer>
    </div>
  );
}

export function mountPage(current, node) {
  const host = document.getElementById("page");
  syncCalm([host]);
  createRoot(attach(host)).render(<StrictMode><AppProvider><Shell current={current}>{node}</Shell></AppProvider></StrictMode>);
}
