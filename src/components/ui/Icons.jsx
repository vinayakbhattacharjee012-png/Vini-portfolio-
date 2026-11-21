// Inline SVG icons (no icon font, no external images).
const S = ({ children, size = 18, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{children}</svg>
);
export const X = (p) => <S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>;
export const Search = (p) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></S>;
export const Menu = (p) => <S {...p}><path d="M4 7h16M4 12h16M4 17h16" /></S>;
export const Gauge = (p) => <S {...p}><path d="M12 14l4-4" /><path d="M3.3 17a9 9 0 1 1 17.4 0" /></S>;
export const Gear = (p) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></S>;
export const Terminal = (p) => <S {...p}><path d="M5 8l4 4-4 4M12 16h7" /></S>;
export const Arrow = (p) => <S {...p}><path d="M5 12h14M13 6l6 6-6 6" /></S>;
export const ArrowUp = (p) => <S {...p}><path d="M12 19V5M6 11l6-6 6 6" /></S>;
export const Chevron = (p) => <S {...p}><path d="M6 9l6 6 6-6" /></S>;
export const Copy = (p) => <S {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></S>;
export const Check = (p) => <S {...p}><path d="M5 12l5 5L20 7" /></S>;
export const Github = (p) => <S {...p}><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" /></S>;
export const Discord = (p) => <S {...p}><path d="M8 12h.01M16 12h.01" strokeWidth="3" /><path d="M7.5 17.5c-1.7-.3-3-.9-4-1.6.3-3.9 1.3-7.5 3.3-10.4A15 15 0 0 1 10 4.6l.5 1a13 13 0 0 1 3 0l.5-1a15 15 0 0 1 3.2.9c2 2.9 3 6.5 3.3 10.4-1 .7-2.3 1.3-4 1.6l-1-1.8" /></S>;
export const Mail = (p) => <S {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></S>;
export const Qr = (p) => <S {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 14v.01M14 21h3M21 18v3h-3" /></S>;
export const Share = (p) => <S {...p}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></S>;
export const External = (p) => <S {...p}><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></S>;
export const Play = (p) => <S {...p}><path d="M7 5l12 7-12 7z" /></S>;
export const Pause = (p) => <S {...p}><path d="M8 5v14M16 5v14" /></S>;
export const Download = (p) => <S {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></S>;
export const Lock = (p) => <S {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></S>;
export const Bolt = (p) => <S {...p}><path d="M13 3L5 14h6l-1 7 8-11h-6z" /></S>;
export const Layers = (p) => <S {...p}><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></S>;
export const Grid = (p) => <S {...p}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></S>;
export const Tabs = (p) => <S {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M3 7l2-3h5l2 3" /></S>;
export const Sparkle = (p) => <S {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" /></S>;
export const Reset = (p) => <S {...p}><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6" /><path d="M4 4v4.6h4.6" /></S>;
export const Monitor = (p) => <S {...p}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></S>;
export const Tablet = (p) => <S {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M11 18h2" /></S>;
export const Phone = (p) => <S {...p}><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></S>;
