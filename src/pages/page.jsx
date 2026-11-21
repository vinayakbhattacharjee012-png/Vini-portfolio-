import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "../lib/app";
import { useInView } from "../lib/hooks";
import { attach, syncCalm } from "../lib/mount";
import { contact } from "../data/portfolioData";
import { Arrow } from "../components/ui/Icons";

const NAV = [["./", "Portfolio", "home"], ["work.html", "Work", "work"], ["services.html", "Services", "services"], ["galaxy.html", "Galaxy", "galaxy"]];
const MORE = [["command-center.html", "Command Center"], ["features.html", "All features"], [contact.discordServer, "Join Galaxy Empire ↗"], [contact.github, "GitHub ↗"]];
const ext = (href) => (href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {});

// Header and footer shared by the extra pages; they use the portfolio's saved look.
function Shell({ current, children }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-zinc-700 bg-[var(--nav-bg)] backdrop-blur-md">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1120px] items-center gap-2 px-4 sm:gap-3">
          <a href="./" className="flex shrink-0 items-center gap-2 font-semibold text-zinc-100" style={{ viewTransitionName: "brand" }}>
            <img src="logo-vini-256.webp" alt="" width="32" height="32" className="rounded-full" /><span className="hidden sm:inline">Vini</span><span className="sr-only sm:hidden">Vini, portfolio home</span>
          </a>
          <div className="ml-auto flex min-w-0 gap-0.5 overflow-x-auto text-sm sm:gap-1">
            {NAV.map(([href, label, id]) => (
              <a key={id} href={href} aria-current={current === id ? "page" : undefined}
                className={`${id === "home" ? "hidden md:block " : ""}whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors sm:px-3 ${current === id ? "bg-c1/15 text-zinc-100" : "text-zinc-400 hover:text-zinc-100"}`}>{label}</a>
            ))}
          </div>
          <a href="contact.html" aria-current={current === "contact" ? "page" : undefined} className="btn btn-primary !h-9 shrink-0 !px-4">Hire me</a>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="mt-20 border-t border-zinc-700 py-10 text-sm text-zinc-400">
        <div className="mx-auto grid max-w-[1120px] gap-8 px-4 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div className="grid content-start gap-3">
            <a href="./" className="flex items-center gap-2 font-semibold text-zinc-100"><img src="logo-vini-256.webp" alt="" width="28" height="28" className="rounded-full" />Vini</a>
            <p className="max-w-[42ch]">Discord moderation and security, Python bots, websites and AI prototypes, and football edits.</p>
            <a className="num text-xs hover:text-c1" href={`mailto:${contact.email}`}>{contact.email}</a>
          </div>
          {[["Pages", [...NAV, ["brand.html", "Brand"], ["contact.html", "Hire me"]]], ["More", MORE]].map(([label, links]) => (
            <nav key={label} aria-label={label} className="grid content-start gap-2">
              <p className="kicker">{label}</p>
              {links.map(([href, text]) => <a key={href} href={href} {...ext(href)} className="w-fit hover:text-c1">{text}</a>)}
            </nav>
          ))}
        </div>
        <p className="num mx-auto mt-8 max-w-[1120px] px-4 text-xs text-zinc-500">© 2026 Vini · Static site · no trackers</p>
      </footer>
    </div>
  );
}

// Big page opener: eyebrow, gradient title (like the homepage bands), intro, optional actions.
export function Hero({ eyebrow, title, intro, children }) {
  return (
    <div className="relative overflow-hidden border-b border-zinc-700">
      <div aria-hidden="true" className="glow" />
      <div className="relative mx-auto max-w-[1120px] px-4 pb-12 pt-14 sm:pb-16 sm:pt-20">
        <div className="anim-pop grid max-w-[780px] gap-4">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="page-title">{title}</h1>
          <p className="max-w-[62ch] text-lg text-zinc-400">{intro}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Reveal({ as: Tag = "div", className = "", delay = 0, style, children, ...rest }) {
  const [ref, seen] = useInView();
  return <Tag ref={ref} className={`reveal ${seen ? "in" : ""} ${className}`} style={{ ...style, transitionDelay: `${delay}ms` }} {...rest}>{children}</Tag>;
}

export function Stats({ items }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(([v, label], i) => (
        <Reveal key={label} delay={i * 60} className="card hairline-top p-5">
          <p className="num text-2xl text-zinc-100 sm:text-3xl">{v}</p>
          <p className="mt-1 text-sm text-zinc-400">{label}</p>
        </Reveal>
      ))}
    </div>
  );
}

export function CtaBand({ title = "Have a project in mind?", text = "Send a short brief: what you need and when. I reply by email with questions and a plan before anything starts.",
  primary = ["Hire me", "contact.html"], secondary = ["See services", "services.html"] }) {
  return (
    <section aria-labelledby="cta-title" className="mx-auto max-w-[1120px] px-4 pt-16">
      <Reveal className="card hairline-top relative overflow-hidden p-7 sm:p-10">
        <div aria-hidden="true" className="glow" />
        <div className="relative grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 id="cta-title" className="sec-title">{title}</h2>
            <p className="mt-2 max-w-[56ch] text-zinc-400">{text}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="btn btn-primary !h-11 !px-5" href={primary[1]} {...ext(primary[1])}>{primary[0]}<Arrow size={16} /></a>
            <a className="btn !h-11 !px-5" href={secondary[1]} {...ext(secondary[1])}>{secondary[0]}</a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// Pages render in a shadow root, which the browser's own #hash scrolling can't see into.
export function useHashScroll(ref) {
  useEffect(() => {
    const go = () => { const id = decodeURIComponent(location.hash.slice(1)); if (id) ref.current?.getRootNode().getElementById(id)?.scrollIntoView(); };
    const t = setTimeout(go, 50);
    addEventListener("hashchange", go);
    return () => { clearTimeout(t); removeEventListener("hashchange", go); };
  }, [ref]);
}

export function mountPage(current, node) {
  const host = document.getElementById("page");
  syncCalm([host]);
  createRoot(attach(host)).render(<StrictMode><AppProvider><Shell current={current}>{node}</Shell></AppProvider></StrictMode>);
}
