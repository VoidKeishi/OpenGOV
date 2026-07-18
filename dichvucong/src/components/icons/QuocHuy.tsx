// Quốc huy đơn giản hoá — tự vẽ theo CLONE_SPEC.md mục 7, không copy asset thật.
const GRAIN_ANGLES: number[] = [];
for (let d = 130; d <= 410; d += 14) GRAIN_ANGLES.push(d);

const STAR_POINTS =
  "50,26 53.76,36.82 65.21,37.06 56.09,43.98 59.42,54.94 50,48.4 40.58,54.94 43.91,43.98 34.79,37.06 46.24,36.82";

export default function QuocHuy({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill="#DA251D" stroke="#F7C948" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="#F7C948" strokeWidth="1.2" />
      {GRAIN_ANGLES.map((deg) => {
        const t = (deg * Math.PI) / 180;
        const cx = 50 + 40 * Math.cos(t);
        const cy = 50 + 40 * Math.sin(t);
        return (
          <ellipse
            key={deg}
            cx={cx}
            cy={cy}
            rx="2.2"
            ry="5"
            fill="#F7C948"
            transform={`rotate(${deg + 90} ${cx} ${cy})`}
          />
        );
      })}
      <polygon points={STAR_POINTS} fill="#FFDE59" />
      <g>
        {Array.from({ length: 8 }).map((_, i) => (
          <rect
            key={i}
            x="48.5"
            y="61.5"
            width="3"
            height="4"
            fill="#F7C948"
            transform={`rotate(${i * 45} 50 72)`}
          />
        ))}
        <circle cx="50" cy="72" r="9" fill="#F7C948" />
        <circle cx="50" cy="72" r="3.5" fill="#DA251D" />
      </g>
    </svg>
  );
}
