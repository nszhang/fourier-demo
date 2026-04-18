import {
  calculateSeriesEnergy,
  evaluateTermAtPhase,
  getDominantTerm,
} from "@/lib/fourier";
import { type FourierTerm } from "@/types/fourier";

type SpectrumViewProps = {
  terms: FourierTerm[];
  phase: number;
};

export function SpectrumView({ terms, phase }: SpectrumViewProps) {
  const width = 820;
  const height = 300;
  const margin = { top: 26, right: 28, bottom: 48, left: 40 };
  const maxMagnitude = Math.max(...terms.map((term) => term.magnitude), 0.0001);
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const barWidth = innerWidth / Math.max(terms.length, 1) - 10;
  const dominantTerm = getDominantTerm(terms);
  const energy = calculateSeriesEnergy(terms);

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/65 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
            Frequency spectrum
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            Harmonic strength and live phase contribution
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Each bar shows a Fourier term magnitude. The glowing dot marks the
            current signed contribution at the active time sample.
          </p>
        </div>

        <div className="grid gap-2 text-sm text-slate-200 sm:text-right">
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">
            Dominant harmonic: {dominantTerm?.harmonic ?? "n/a"}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">
            Series energy: {energy.toFixed(3)}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[300px] w-full rounded-[24px] bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.12),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.94))]"
        role="img"
        aria-label="Frequency spectrum of the active Fourier series"
      >
        <defs>
          <linearGradient id="spectrumBar" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#818cf8" />
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
          x1={margin.left}
          y1={height - margin.bottom}
          x2={width - margin.right}
          y2={height - margin.bottom}
          stroke="rgba(226,232,240,0.18)"
        />

        {terms.map((term, index) => {
          const x = margin.left + index * (barWidth + 10) + 6;
          const normalizedHeight = (term.magnitude / maxMagnitude) * innerHeight;
          const y = height - margin.bottom - normalizedHeight;
          const liveContribution = evaluateTermAtPhase(term, phase);
          const liveY =
            height -
            margin.bottom -
            ((liveContribution / maxMagnitude + 1) / 2) * innerHeight;

          return (
            <g key={term.harmonic}>
              <line
                x1={x + barWidth / 2}
                y1={margin.top}
                x2={x + barWidth / 2}
                y2={height - margin.bottom}
                stroke="rgba(148,163,184,0.08)"
                strokeDasharray="4 8"
              />
              <rect
                x={x}
                y={y}
                width={Math.max(barWidth, 10)}
                height={normalizedHeight}
                rx="10"
                fill="url(#spectrumBar)"
                opacity={0.88}
              />
              <circle
                cx={x + barWidth / 2}
                cy={liveY}
                r="5.5"
                fill="#f472b6"
              />
              <text
                x={x + barWidth / 2}
                y={height - 18}
                textAnchor="middle"
                fill="#cbd5e1"
                fontSize="12"
              >
                {term.harmonic}
              </text>
            </g>
          );
        })}

        <text x="28" y="32" fill="#cbd5e1" fontSize="12">
          Bar height = magnitude, dot = signed contribution at the current phase.
        </text>
      </svg>
    </section>
  );
}
