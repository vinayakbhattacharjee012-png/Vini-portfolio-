import { useInView } from "../../lib/hooks";

// Same head as the page's own sections (eyebrow, title, intro); the host <section> supplies the padding.
export function Section({ id, n, kicker, title, intro, children }) {
  const [ref, seen] = useInView();
  return (
    <div ref={ref} className={`reveal ${seen ? "in" : ""} mx-auto max-w-[1120px] px-4`}>
      <div className="mb-8 grid max-w-[70ch] gap-2.5">
        <p className="eyebrow">{n && <span className="text-zinc-500">{n} / </span>}{kicker}</p>
        <h2 id={`${id}-title`} className="sec-title">{title}</h2>
        {intro && <p className="text-zinc-400">{intro}</p>}
      </div>
      {children}
    </div>
  );
}
