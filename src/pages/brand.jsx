import { contact } from "../data/portfolioData";
import { useApp } from "../lib/app";
import { download } from "../lib/utils";
import { Section } from "../components/ui/Section";
import { Copy, Download } from "../components/ui/Icons";
import { CtaBand, Hero, Reveal, mountPage } from "./page";

// The mark from the loading screen, with fixed colours so it works as a standalone file.
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512"><defs><linearGradient id="v" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6e9ef"/><stop offset="1" stop-color="#9b1d3a"/></linearGradient></defs><path d="M41.58,5.69 A28,28 0 1,0 53.45,14.0" fill="none" stroke="url(#v)" stroke-width="2.6" stroke-linecap="round"/><path d="M19,21 L32,45 L45,21" fill="none" stroke="url(#v)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M48,2.5 Q48.9,8.1 54.5,9 Q48.9,9.9 48,15.5 Q47.1,9.9 41.5,9 Q47.1,8.1 48,2.5Z" fill="#e0566f"/><circle cx="32" cy="4" r="2.2" fill="#c6ccd6"/></svg>`;
const MARK_SRC = "data:image/svg+xml;utf8," + encodeURIComponent(MARK);
const COLOURS = [["Crimson", "#e0566f", "Accent on dark"], ["Wine", "#9b1d3a", "Accent on light"], ["Silver", "#c6ccd6", "Second accent"], ["Night", "#08080b", "Background"], ["Surface", "#111115", "Cards"], ["Ink", "#ececf1", "Text on dark"]];
const LOOKS = [["Light", "#f5f5f7", "#9b1d3a"], ["Dark", "#08080b", "#e0566f"], ["Black", "#000000", "#ea5f78"], ["Hologram", "#03090d", "#38d9f2"], ["Nebula", "#0a0613", "#b98cff"], ["Terminal", "#010503", "#3dff8b"]];
const FONTS = [["Space Grotesk", "var(--font-display)", "Headings · 500 600 700", "Builder · Founder · Creator"], ["Inter", "var(--font-body)", "Body text · 400 500 600", "I build health AI apps and Discord bots, and I keep big communities safe."], ["JetBrains Mono", "var(--font-mono)", "Labels and code · 500", "SYSTEM: ONLINE // STACK: PYTHON + AI"]];
const LINES = ["Builder · Founder · Creator", "Welcome to the Galaxy", "I build health AI apps and Discord bots, and I keep big communities safe.", "health AI · Discord bots · web prototypes · defense grids · highlight edits · game servers"];
const BIO = `Vini builds health AI apps and Discord bots and keeps big communities safe: Senior Moderator for a 40,000-member server, Junior Moderator for a 90,000-member one, and founder of the Galaxy network, five community brands with 1.5k–2k members. Contact: ${contact.email}`;
const FILES = [["Mark · SVG", null], ["Logo · PNG 800px", "logo-vini.png"], ["Logo · WebP 512px", "logo-vini-512.webp"], ["Logo · WebP 256px", "logo-vini-256.webp"]];

function Brand() {
  const { copy } = useApp();
  return (
    <>
      <Hero eyebrow="Brand" title="The Vini brand kit" intro="Logo, colours, type and words for anyone featuring Vini or the Galaxy network: partners, advertisers and press.">
        <div className="flex flex-wrap gap-2 pt-2">
          <button type="button" className="btn btn-primary !h-11 !px-5" onClick={() => download("vini-mark.svg", MARK, "image/svg+xml")}><Download size={16} />Download the mark</button>
          <button type="button" className="btn !h-11 !px-5" onClick={() => copy(BIO, "Bio")}><Copy size={16} />Copy short bio</button>
        </div>
      </Hero>

      <section id="logo" aria-labelledby="logo-title" className="scroll-mt-20 py-10">
        <Section id="logo" kicker="Logo" title="The mark" intro="A V inside an orbit, with a star: drawn for the night-sky look.">
          <div className="grid gap-4 md:grid-cols-3">
            {[["#08080b", "On night"], ["#000000", "On black"]].map(([bg, label]) => (
              <Reveal key={label} className="card grid place-items-center gap-3 p-8" style={{ background: bg }}>
                <img src={MARK_SRC} alt={`Vini mark ${label.toLowerCase()}`} width="128" height="128" />
                <span className="kicker">{label}</span>
              </Reveal>
            ))}
            <Reveal className="card grid place-items-center gap-3 p-8">
              <img src="logo-vini-256.webp" alt="Vini profile logo" width="128" height="128" className="rounded-full" />
              <span className="kicker">Profile logo</span>
            </Reveal>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {FILES.map(([label, href]) => href
              ? <a key={label} className="btn" href={href} download><Download size={15} />{label}</a>
              : <button key={label} type="button" className="btn" onClick={() => download("vini-mark.svg", MARK, "image/svg+xml")}><Download size={15} />{label}</button>)}
          </div>
          <ul className="mt-5 grid gap-1.5 text-sm text-zinc-400">
            <li>· Leave space around the mark at least the height of the star.</li>
            <li>· Use it on dark backgrounds where you can.</li>
            <li>· Don't stretch, rotate, recolour or add effects to it.</li>
          </ul>
        </Section>
      </section>

      <section id="colours" aria-labelledby="colours-title" className="scroll-mt-20 py-10">
        <Section id="colours" kicker="Colour" title="Colours" intro="Tap a colour to copy its hex code.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {COLOURS.map(([name, hex, use], i) => (
              <Reveal key={hex} delay={i * 50}>
                <button type="button" onClick={() => copy(hex, name)} className="card w-full overflow-hidden text-left transition-colors hover:border-c1" aria-label={`Copy ${name} ${hex}`}>
                  <span className="block h-20 border-b border-zinc-700" style={{ background: hex }} />
                  <span className="block p-3"><span className="block text-sm font-semibold text-zinc-100">{name}</span><span className="num block text-xs text-zinc-400">{hex}</span><span className="block text-xs text-zinc-500">{use}</span></span>
                </button>
              </Reveal>
            ))}
          </div>
          <p className="kicker mt-8 mb-3">The six looks</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {LOOKS.map(([name, bg, accent]) => (
              <a key={name} href={`./?theme=${name.toLowerCase()}`} className="card flex items-center gap-3 p-3 transition-colors hover:border-c1">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-zinc-700" style={{ background: bg }}><span className="size-3 rounded-full" style={{ background: accent }} /></span>
                <span><span className="block text-sm text-zinc-100">{name}</span><span className="num block text-[11px] text-zinc-500">{accent}</span></span>
              </a>
            ))}
          </div>
        </Section>
      </section>

      <section id="type" aria-labelledby="type-title" className="scroll-mt-20 py-10">
        <Section id="type" kicker="Type" title="Fonts" intro="All three are free on Google Fonts.">
          <div className="grid gap-4 lg:grid-cols-3">
            {FONTS.map(([name, family, use, sample]) => (
              <Reveal key={name} className="card p-6">
                <p className="kicker">{use}</p>
                <p className="mt-3 text-2xl leading-snug text-zinc-100" style={{ fontFamily: family }}>{sample}</p>
                <p className="mt-3 text-sm text-zinc-400">{name}</p>
              </Reveal>
            ))}
          </div>
        </Section>
      </section>

      <section id="voice" aria-labelledby="voice-title" className="scroll-mt-20 py-10">
        <Section id="voice" kicker="Words" title="Taglines and bio" intro="Lines already used across the site. Copy what you need.">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <ul className="grid content-start gap-2">
              {LINES.map((t) => (
                <li key={t} className="card flex items-center justify-between gap-3 p-4">
                  <span className="text-zinc-200">{t}</span>
                  <button type="button" className="btn !h-8 shrink-0 !px-3" onClick={() => copy(t, "Line")} aria-label={`Copy: ${t}`}><Copy size={14} /></button>
                </li>
              ))}
            </ul>
            <div className="card hairline-top p-6">
              <p className="kicker">Short bio</p>
              <p className="mt-3 text-zinc-300">{BIO}</p>
              <button type="button" className="btn mt-4" onClick={() => copy(BIO, "Bio")}><Copy size={15} />Copy bio</button>
            </div>
          </div>
        </Section>
      </section>

      <CtaBand title="Featuring Vini or partnering?" text="Send a short note about where the brand will appear, and I'll reply by email." primary={["Get in touch", "contact.html"]} secondary={["Galaxy network", "galaxy.html"]} />
    </>
  );
}

mountPage("brand", <Brand />);
