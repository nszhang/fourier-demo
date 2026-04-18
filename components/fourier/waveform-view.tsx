import { type PlotPoint } from "@/types/fourier";

type WaveformViewProps = {
  period: number;
  phase: number;
  approximation: PlotPoint[];
  target: PlotPoint[];
  currentPoint: PlotPoint;
  componentWaves: Array<{ harmonic: number; points: PlotPoint[] }>;
  showComponents: boolean;
  showTarget: boolean;
  showTrail: boolean;
};

const PALETTE = [
  "#22d3ee",
  "#818cf8",
  "#34d399",
  "#f59e0b",
  "#f472b6",
  "#fb7185",
];

function buildPath(points: PlotPoint[], mapX: (value: number) => number, mapY: (value: number) => number) {
  return points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${mapX(point.x).toFixed(2)} ${mapY(point.y).toFixed(2)}`,
    )
    .join(" ");
}

export function WaveformView({
  period,
  phase,
  approximation,
  target,
  currentPoint,
  componentWaves,
  showComponents,
  showTarget,
  showTrail,
}: WaveformViewProps) {
  const width = 820;
  const height = 360;
  const margin = { top: 26, right: 26, bottom: 42, left: 48 };
  const minX = 0;
  const maxX = period;
  const minY = Math.min(
    ...approximation.map((point) => point.y),
    ...target.map((point) => point.y),
  );
  const maxY = Math.max(
    ...approximation.map((point) => point.y),
    ...target.map((point) => point.y),
  );
  const paddingY = Math.max(0.2, (maxY - minY) * 0.16);

  const mapX = (value: number) =>
    margin.left +
    ((value - minX) / Math.max(maxX - minX, 0.0001)) *
      (width - margin.left - margin.right);
  const mapY = (value: number) =>
    height -
    margin.bottom -
    ((value - (minY - paddingY)) / Math.max(maxY - minY + paddingY * 2, 0.0001)) *
      (height - margin.top - margin.bottom);

  const approximationPath = buildPath(approximation, mapX, mapY);
  const targetPath = buildPath(target, mapX, mapY);
  const activeX = phase * period;
  const revealedPoints = approximation.filter((point) => point.x <= activeX);
  const revealPath =
    showTrail && revealedPoints.length > 1
      ? buildPath(revealedPoints, mapX, mapY)
      : null;

  const axisY = mapY(0);
  const ticks = Array.from({ length: 5 }, (_, index) => (period / 4) * index);

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/65 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
            Waveform reconstruction
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            Approximated signal over one period
          </h3>
        </div>
        <p className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-sm text-slate-200">
          x = {currentPoint.x.toFixed(2)}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[360px] w-full rounded-[24px] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_35%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.94))]"
        role="img"
        aria-label="Waveform plot of the Fourier approximation"
      >
        <rect
          x="18"
          y="18"
          width={width - 36}
          height={height - 36}
          rx="22"
          fill="transparent"
          stroke="rgba(148,163,184,0.15)"
        />

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={mapX(tick)}
              y1={margin.top}
              x2={mapX(tick)}
              y2={height - margin.bottom}
              stroke="rgba(148,163,184,0.12)"
              strokeDasharray="5 7"
            />
            <text
              x={mapX(tick)}
              y={height - 16}
              textAnchor="middle"
              fill="#cbd5e1"
              fontSize="12"
            >
              {tick.toFixed(1)}
            </text>
          </g>
        ))}

        <line
          x1={margin.left}
          y1={axisY}
          x2={width - margin.right}
          y2={axisY}
          stroke="rgba(226,232,240,0.2)"
        />

        {showComponents
          ? componentWaves.slice(0, 6).map((component, index) => (
              <path
                key={component.harmonic}
                d={buildPath(component.points, mapX, mapY)}
                fill="none"
                stroke={PALETTE[index % PALETTE.length]}
                strokeWidth="1.4"
                strokeOpacity="0.28"
              />
            ))
          : null}

        {showTarget ? (
          <path
            d={targetPath}
            fill="none"
            stroke="rgba(244,114,182,0.72)"
            strokeWidth="2.4"
            strokeDasharray="10 7"
            strokeLinecap="round"
          />
        ) : null}

        <path
          d={approximationPath}
          fill="none"
          stroke="#67e8f9"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {revealPath ? (
          <path
            d={revealPath}
            fill="none"
            stroke="#f97316"
            strokeWidth="4"
            strokeLinecap="round"
          />
        ) : null}

        <line
          x1={mapX(currentPoint.x)}
          y1={margin.top}
          x2={mapX(currentPoint.x)}
          y2={height - margin.bottom}
          stroke="rgba(248,250,252,0.28)"
          strokeDasharray="6 6"
        />
        <circle
          cx={mapX(currentPoint.x)}
          cy={mapY(currentPoint.y)}
          r="6"
          fill="#f8fafc"
        />

        <text x="28" y="32" fill="#cbd5e1" fontSize="12">
          Cyan: approximation, pink dashed: target, orange: animated trace.
        </text>
      </svg>
    </section>
  );
}
