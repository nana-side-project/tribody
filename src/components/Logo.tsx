// TriBody mark: a fusiform muscle belly between an origin (orange) and an insertion (blue) dot —
// the app's core idea ("where a muscle starts, where it attaches, how it shortens"). Original artwork.
export function AppMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <rect width="64" height="64" rx="16" fill="var(--accent)" />
      <g transform="rotate(-38 32 32)">
        <path d="M32 11 L32 17" stroke="var(--tendon)" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M32 47 L32 53" stroke="var(--tendon)" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M32 16 C 43 22, 43 42, 32 48 C 21 42, 21 22, 32 16 Z" fill="#fbf4ee" />
        <path d="M32 19 C 30 28, 30 36, 32 45 M27.5 24 C 26.5 30, 26.5 34, 28 40 M36.5 24 C 37.5 30, 37.5 34, 36 40" stroke="var(--muscle-light)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <circle cx="32" cy="10" r="4" fill="var(--origin)" stroke="#fbf4ee" strokeWidth="1.8" />
        <circle cx="32" cy="54" r="4" fill="var(--insertion)" stroke="#fbf4ee" strokeWidth="1.8" />
      </g>
    </svg>
  );
}
