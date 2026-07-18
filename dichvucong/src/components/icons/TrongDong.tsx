// Hoạ tiết trống đồng cách điệu — vòng tròn đồng tâm + tia mặt trời (CLONE_SPEC.md mục 7).
const r2 = (x: number) => +x.toFixed(2);
const RAYS = Array.from({ length: 12 }).map((_, i) => {
  const a = (i * 30 * Math.PI) / 180;
  const tip = [r2(50 + 18 * Math.cos(a)), r2(50 + 18 * Math.sin(a))];
  const b1 = [r2(50 + 8 * Math.cos(a - 0.32)), r2(50 + 8 * Math.sin(a - 0.32))];
  const b2 = [r2(50 + 8 * Math.cos(a + 0.32)), r2(50 + 8 * Math.sin(a + 0.32))];
  return `${tip[0]},${tip[1]} ${b1[0]},${b1[1]} ${b2[0]},${b2[1]}`;
});

export default function TrongDong({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill="#F8DFA8" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#D99A2B" strokeWidth="2" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#D99A2B" strokeWidth="1.2" strokeDasharray="2.5 2.5" />
      <circle cx="50" cy="50" r="35" fill="none" stroke="#D99A2B" strokeWidth="2" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="#D99A2B" strokeWidth="1.2" strokeDasharray="4 3" />
      <circle cx="50" cy="50" r="24" fill="none" stroke="#D99A2B" strokeWidth="1.5" />
      {RAYS.map((pts, i) => (
        <polygon key={i} points={pts} fill="#D99A2B" />
      ))}
      <circle cx="50" cy="50" r="7" fill="#D99A2B" />
    </svg>
  );
}
