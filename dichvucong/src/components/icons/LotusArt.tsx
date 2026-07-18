// Hoa sen cách điệu cho dải carousel tin tức — tự vẽ, thay ảnh thật (CLONE_SPEC.md 3.1.3).
function Lotus({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#f6e7c8" stroke="#e8cf9d" strokeWidth="1">
      <path d="M0 0C-6 -14 -2 -26 0 -30 2 -26 6 -14 0 0Z" />
      <path d="M0 0C-14 -8 -20 -18 -21 -24 -14 -22 -4 -14 0 0Z" />
      <path d="M0 0C14 -8 20 -18 21 -24 14 -22 4 -14 0 0Z" />
      <path d="M0 0C-22 -2 -28 -8 -30 -12 -22 -12 -8 -8 0 0Z" />
      <path d="M0 0C22 -2 28 -8 30 -12 22 -12 8 -8 0 0Z" />
    </g>
  );
}

export default function LotusArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 150" className={className} aria-hidden="true" preserveAspectRatio="xMaxYMid slice">
      <rect width="420" height="150" fill="#f3e3bd" opacity="0.5" />
      <Lotus x={340} y={130} s={2.2} />
      <Lotus x={250} y={140} s={1.4} />
      <Lotus x={400} y={145} s={1.6} />
      <ellipse cx="300" cy="148" rx="60" ry="10" fill="#e8cf9d" opacity="0.6" />
    </svg>
  );
}
