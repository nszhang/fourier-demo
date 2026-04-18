import {
  type CustomBasis,
  type CustomSeriesDefinition,
  type CustomSeriesDefinitionTerm,
  type CustomSeriesTerm,
  type EpicycleVector,
  type FourierConfig,
  type FourierPreset,
  type FourierTerm,
  type PlotPoint,
} from "@/types/fourier";

const TAU = Math.PI * 2;

function oddHarmonic(index: number) {
  return index * 2 + 1;
}

function isCustomBasis(value: unknown): value is CustomBasis {
  return value === "sine" || value === "cosine";
}

export function getPresetLabel(preset: FourierPreset) {
  switch (preset) {
    case "square":
      return "Square wave";
    case "triangle":
      return "Triangle wave";
    case "sawtooth":
      return "Sawtooth wave";
    case "custom":
      return "Custom series";
    default:
      return preset;
  }
}

function formatCustomTerm(term: CustomSeriesTerm) {
  const amplitude = Math.abs(term.amplitude).toFixed(2);
  const phase = term.phaseOffset.toFixed(2);
  const sign = term.amplitude >= 0 ? "" : "-";
  const basis = term.basis === "cosine" ? "cos" : "sin";

  if (Math.abs(term.phaseOffset) < 0.001) {
    return `${sign}${amplitude} ${basis}(${term.harmonic} w x)`;
  }

  return `${sign}${amplitude} ${basis}(${term.harmonic} w x + ${phase})`;
}

export function getSeriesEquation(config: FourierConfig) {
  const { preset } = config;

  switch (preset) {
    case "square":
      return "f(x) = (4A / pi) * sum(sin((2k - 1)w x) / (2k - 1))";
    case "triangle":
      return "f(x) = (8A / pi^2) * sum((-1)^k sin((2k - 1)w x) / (2k - 1)^2)";
    case "sawtooth":
      return "f(x) = (2A / pi) * sum((-1)^(n + 1) sin(n w x) / n)";
    case "custom": {
      if (config.customTerms.length === 0) {
        return "f(x) = 0";
      }

      const renderedTerms = config.customTerms
        .filter((term) => Math.abs(term.amplitude) > 0.0001)
        .slice(0, 6)
        .map((term) => formatCustomTerm(term));

      if (renderedTerms.length === 0) {
        return "f(x) = 0";
      }

      const suffix = config.customTerms.length > 6 ? " + ..." : "";
      return `f(x) = ${renderedTerms.join(" + ")}${suffix}`;
    }
    default:
      return "";
  }
}

export function buildFourierTerms(config: FourierConfig): FourierTerm[] {
  if (config.preset === "custom") {
    return config.customTerms.map((term) => ({
      harmonic: term.harmonic,
      coefficient: term.amplitude,
      magnitude: Math.abs(term.amplitude),
      phaseOffset:
        ((term.basis === "cosine" ? term.phaseOffset + Math.PI / 2 : term.phaseOffset) ??
          0) + (term.amplitude < 0 ? Math.PI : 0),
    }));
  }

  return Array.from({ length: config.harmonics }, (_, index) => {
    const harmonic =
      config.preset === "sawtooth" ? index + 1 : oddHarmonic(index);

    let coefficient = 0;

    switch (config.preset) {
      case "square":
        coefficient = (4 * config.amplitude) / (Math.PI * harmonic);
        break;
      case "triangle":
        coefficient =
          ((index % 2 === 0 ? 1 : -1) * 8 * config.amplitude) /
          (Math.PI * Math.PI * harmonic * harmonic);
        break;
      case "sawtooth":
        coefficient =
          ((harmonic % 2 === 0 ? -1 : 1) * 2 * config.amplitude) /
          (Math.PI * harmonic);
        break;
    }

    return {
      harmonic,
      coefficient,
      magnitude: Math.abs(coefficient),
      phaseOffset: coefficient < 0 ? Math.PI : 0,
    };
  });
}

export function evaluateSeriesAtPhase(config: FourierConfig, phase: number) {
  return buildFourierTerms(config).reduce((sum, term) => {
    const angle = TAU * term.harmonic * phase + term.phaseOffset;
    return sum + term.magnitude * Math.sin(angle);
  }, 0);
}

export function sampleWave(
  config: FourierConfig,
  sampleCount: number,
): PlotPoint[] {
  const count = Math.max(sampleCount, 2);

  return Array.from({ length: count }, (_, index) => {
    const phase = index / (count - 1);

    return {
      x: phase * config.period,
      y: evaluateSeriesAtPhase(config, phase),
    };
  });
}

export function sampleTargetWave(
  config: FourierConfig,
  sampleCount: number,
): PlotPoint[] {
  const count = Math.max(sampleCount, 2);

  return Array.from({ length: count }, (_, index) => {
    const phase = index / (count - 1);

    return {
      x: phase * config.period,
      y: evaluateTargetWave(config, phase),
    };
  });
}

export function sampleComponentWaves(
  config: FourierConfig,
  sampleCount: number,
): Array<{ term: FourierTerm; points: PlotPoint[] }> {
  const count = Math.max(sampleCount, 2);
  const terms = buildFourierTerms(config);

  return terms.map((term) => ({
    term,
    points: Array.from({ length: count }, (_, index) => {
      const phase = index / (count - 1);
      const angle = TAU * term.harmonic * phase + term.phaseOffset;

      return {
        x: phase * config.period,
        y: term.magnitude * Math.sin(angle),
      };
    }),
  }));
}

export function buildEpicycleVectors(
  config: FourierConfig,
  phase: number,
): EpicycleVector[] {
  const terms = buildFourierTerms(config);
  let cursor = { x: 0, y: 0 };

  return terms.map((term) => {
    const angle = TAU * term.harmonic * phase + term.phaseOffset;
    const end = {
      x: cursor.x + term.magnitude * Math.cos(angle),
      y: cursor.y + term.magnitude * Math.sin(angle),
    };

    const vector = {
      harmonic: term.harmonic,
      radius: term.magnitude,
      angle,
      start: cursor,
      end,
    };

    cursor = end;
    return vector;
  });
}

export function evaluateTargetWave(config: FourierConfig, phase: number) {
  const wrappedPhase = ((phase % 1) + 1) % 1;

  switch (config.preset) {
    case "square":
      if (wrappedPhase === 0 || wrappedPhase === 0.5) {
        return 0;
      }

      return Math.sin(TAU * wrappedPhase) > 0
        ? config.amplitude
        : -config.amplitude;
    case "triangle":
      return ((2 * config.amplitude) / Math.PI) * Math.asin(Math.sin(TAU * wrappedPhase));
    case "sawtooth":
      return (
        2 *
        config.amplitude *
        (wrappedPhase - Math.floor(wrappedPhase + 0.5))
      );
    case "custom":
      return evaluateSeriesAtPhase(config, wrappedPhase);
    default:
      return 0;
  }
}

export function calculateApproximationError(config: FourierConfig, sampleCount = 240) {
  const samples = Math.max(sampleCount, 2);
  const total = Array.from({ length: samples }, (_, index) => {
    const phase = index / (samples - 1);
    const diff = evaluateSeriesAtPhase(config, phase) - evaluateTargetWave(config, phase);
    return diff * diff;
  }).reduce((sum, value) => sum + value, 0);

  return Math.sqrt(total / samples);
}

export function evaluateTermAtPhase(term: FourierTerm, phase: number) {
  return term.magnitude * Math.sin(TAU * term.harmonic * phase + term.phaseOffset);
}

export function getDominantTerm(terms: FourierTerm[]) {
  return terms.reduce<FourierTerm | null>((dominant, term) => {
    if (!dominant || term.magnitude > dominant.magnitude) {
      return term;
    }

    return dominant;
  }, null);
}

export function calculateSeriesEnergy(terms: FourierTerm[]) {
  return terms.reduce((sum, term) => sum + term.magnitude * term.magnitude, 0);
}

export function createCustomSeriesDefinition(
  config: FourierConfig,
): CustomSeriesDefinition {
  return {
    name: (config.customName ?? "").trim() || "Untitled custom series",
    period: config.period,
    terms: config.customTerms.map(({ basis, harmonic, amplitude, phaseOffset }) => ({
      basis: basis === "cosine" ? "cosine" : "sine",
      harmonic,
      amplitude,
      phaseOffset,
    })),
  };
}

function sanitizeDefinitionTerm(value: unknown): CustomSeriesDefinitionTerm | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const term = value as Partial<CustomSeriesDefinitionTerm>;
  const harmonic = Number(term.harmonic);
  const amplitude = Number(term.amplitude);
  const phaseOffset = Number(term.phaseOffset ?? 0);
  const basis = isCustomBasis(term.basis) ? term.basis : "sine";

  if (!Number.isFinite(harmonic) || !Number.isFinite(amplitude) || !Number.isFinite(phaseOffset)) {
    return null;
  }

  return {
    basis,
    harmonic: Math.max(1, Math.round(harmonic)),
    amplitude,
    phaseOffset,
  };
}

export function parseCustomSeriesDefinition(
  raw: string,
): CustomSeriesDefinition | null {
  try {
    const parsed = JSON.parse(raw) as Partial<CustomSeriesDefinition>;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const terms = Array.isArray(parsed.terms)
      ? parsed.terms
          .map((term) => sanitizeDefinitionTerm(term))
          .filter((term): term is CustomSeriesDefinitionTerm => term !== null)
      : [];

    if (terms.length === 0) {
      return null;
    }

    const period = Number(parsed.period);

    return {
      name:
        typeof parsed.name === "string" && parsed.name.trim().length > 0
          ? parsed.name.trim()
          : "Imported custom series",
      period: Number.isFinite(period) ? Math.max(2, Math.min(12, period)) : 6,
      terms,
    };
  } catch {
    return null;
  }
}

export function serializeCustomSeriesDefinition(
  definition: CustomSeriesDefinition,
) {
  return JSON.stringify(definition, null, 2);
}

export function getWaveBounds(points: PlotPoint[]) {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}
