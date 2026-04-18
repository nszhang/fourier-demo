import { type EpicycleVector } from "@/types/fourier";

type EpicycleViewProps = {
  vectors: EpicycleVector[];
  currentValue: number;
  showTrail: boolean;
  trail: Array<{ x: number; y: number }>;
};

function pathFromPoints(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(" ");
}

export function EpicycleView({
  vectors,
  currentValue,
  showTrail,
  trail,
}: EpicycleViewProps) {
  const width = 580;
  const height = 340;
  const margin = 36;
  const chartCenter = { x: 170, y: height / 2 };
  const totalRadius = vectors.reduce((sum, vector) => sum + vector.radius, 0);
  const scale = totalRadius > 0 ? 120 / totalRadius : 1;
  const endpoint = vectors.at(-1)?.end ?? { x: 0, y: 0 };
  const projectedX = width - margin - 96;
  const projectedY = chartCenter.y - endpoint.y * scale;

  const trailPath = pathFromPoints(
    trail.map((point) => ({
      x: projectedX + point.x,
      y: chartCenter.y - point.y * scale,
    })),
  );

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/65 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
            Epicycle construction
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            Harmonics rotating in sync
          </h3>
        </div>
        <p className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-sm text-slate-200">
          y(t) = {currentValue.toFixed(3)}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[340px] w-full rounded-[24px] bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.16),transparent_35%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.94))]"
        role="img"
        aria-label="Animated epicycle view of the Fourier series"
      >
        <defs>
          <linearGradient id="vectorStroke" x1="0" x2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <linearGradient id="projectionStroke" x1="0" x2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f472b6" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        <rect
          x="18"
          y="18"
          width={width - 36}
          height={height - 36}
          rx="22"
          fill="transparent"
          stroke="rgba(148,163,184,0.15)"
        />
        <line
          x1={chartCenter.x}
          y1={margin}
          x2={chartCenter.x}
          y2={height - margin}
          stroke="rgba(148,163,184,0.22)"
          strokeDasharray="5 7"
        />
        <line
          x1={margin}
          y1={chartCenter.y}
          x2={width - margin}
          y2={chartCenter.y}
          stroke="rgba(148,163,184,0.16)"
        />

        {vectors.map((vector, index) => {
          const startX = chartCenter.x + vector.start.x * scale;
          const startY = chartCenter.y - vector.start.y * scale;
          const endX = chartCenter.x + vector.end.x * scale;
          const endY = chartCenter.y - vector.end.y * scale;

          return (
            <g key={vector.harmonic} opacity={1 - index * 0.03}>
              <circle
                cx={startX}
                cy={startY}
                r={vector.radius * scale}
                fill="none"
                stroke="rgba(226,232,240,0.18)"
                strokeWidth="1.2"
              />
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke="url(#vectorStroke)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx={endX} cy={endY} r="4.2" fill="#f8fafc" />
            </g>
          );
        })}

        {showTrail && trail.length > 1 ? (
          <path
            d={trailPath}
            fill="none"
            stroke="rgba(249,115,22,0.7)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : null}

        <line
          x1={chartCenter.x + endpoint.x * scale}
          y1={chartCenter.y - endpoint.y * scale}
          x2={projectedX}
          y2={projectedY}
          stroke="url(#projectionStroke)"
          strokeWidth="2.5"
          strokeDasharray="8 6"
        />
        <circle cx={projectedX} cy={projectedY} r="6" fill="#f472b6" />

        <text
          x={projectedX + 14}
          y={projectedY - 10}
          fill="#f9fafb"
          fontSize="13"
        >
          Current sample
        </text>
        <text x="28" y="32" fill="#cbd5e1" fontSize="12">
          Harmonic circles scale to the magnitude of each Fourier term.
        </text>
      </svg>
    </section>
  );
}
