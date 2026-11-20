// Tiny SVG charts: no chart library.
export function Sparkline({ data, w = 220, h = 48, max, className = "", label }) {
  if (!data.length) return null;
  const hi = max ?? Math.max(...data, 1), lo = Math.min(...data, 0);
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * w},${h - ((v - lo) / (hi - lo || 1)) * (h - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} role="img" aria-label={label}>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill="color-mix(in srgb, var(--c1) 10%, transparent)" stroke="none" />
      <polyline points={pts} fill="none" stroke="var(--c1)" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function LineChart({ series, w = 600, h = 180, label }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full" role="img" aria-label={label} preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={w} y1={h * g} y2={h * g} stroke="rgb(255 255 255 / .05)" />)}
      {series.map(({ data, min, max, color }) => {
        const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * w},${h - ((v - min) / (max - min)) * (h - 10) - 5}`).join(" ");
        return <polyline key={color} points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />;
      })}
    </svg>
  );
}
