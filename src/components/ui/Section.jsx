import { useInView } from "../../lib/hooks";

// Section shell: anchor id, numbered kicker, heading and a one-shot reveal.
export function Section({ id, n, kicker, title, intro, children, className = "" }) {
  const [ref, seen] = useInView();
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`py-14 md:py-24 ${className}`}>
      <div ref={ref} className={`reveal ${seen ? "in" : ""} mx-auto max-w-6xl px-4 sm:px-6`}>
        <p className="kicker"><span className="text-c1">{n}</span> / {kicker}</p>
        <h2 id={`${id}-title`} className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
        {intro && <p className="mt-3 max-w-2xl text-zinc-400">{intro}</p>}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

export function Reveal({ children, className = "", as: Tag = "div", delay = 0 }) {
  const [ref, seen] = useInView();
  return <Tag ref={ref} className={`reveal ${seen ? "in" : ""} ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>{children}</Tag>;
}

export function Toast({ state }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4" role="status" aria-live="polite">
      {state && <div key={state.id} className="anim-pop glass rounded-full border-c1/30 px-4 py-2 text-sm text-zinc-100 shadow-[0_0_30px_-10px_var(--c1)]">{state.msg}</div>}
    </div>
  );
}
