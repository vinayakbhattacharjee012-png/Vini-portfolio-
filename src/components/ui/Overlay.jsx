import { useEffect, useId, useRef } from "react";
import { useFocusTrap } from "../../lib/hooks";
import { X } from "./Icons";

// Shared shell for modals and drawers: backdrop, focus trap, Esc to close, scroll lock.
function Shell({ onClose, label, title, children, panelClass, side = "center", wide }) {
  const ref = useRef(null), id = useId();
  useFocusTrap(ref);
  useEffect(() => {
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => { html.style.overflow = prev; };
  }, []);
  const pos = side === "right" ? "justify-end" : "items-start justify-center pt-[12vh] px-4";
  return (
    <div className={`fixed inset-0 z-50 flex ${pos}`} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}>
      <div className="anim-fade absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title ? undefined : label} aria-labelledby={title ? id : undefined} tabIndex={-1}
        className={`glass relative outline-none shadow-[0_30px_80px_-30px_rgba(0,0,0,.8)] ${panelClass} ${side === "right" ? "anim-right h-full w-full " + (wide ? "max-w-3xl" : "max-w-xl") + " overflow-y-auto rounded-l-2xl border-r-0" : "anim-pop w-full max-w-2xl rounded-2xl"}`}>
        {title && (
          <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-zinc-700 bg-panel/80 px-5 py-4 backdrop-blur-md">
            <h2 id={id} className="text-base font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full border border-zinc-700 text-zinc-400 transition hover:border-c1/50 hover:text-white active:scale-[.98]" aria-label={`Close ${title}`}><X /></button>
          </header>
        )}
        {children}
      </div>
    </div>
  );
}

export const Modal = (p) => <Shell side="center" {...p} />;
export const Drawer = (p) => <Shell side="right" {...p} />;
