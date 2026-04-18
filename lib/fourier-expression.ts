import {
  type CustomBasis,
  type CustomSeriesDefinition,
  type CustomSeriesTerm,
  type FourierConfig,
  type FourierPreset,
} from "@/types/fourier";

export type FourierEditorMode = "preset" | "summation" | "explicit" | "text";
export type SummationSequence = "all" | "odd" | "even";

export type SummationDraft = {
  name: string;
  basis: CustomBasis;
  sequence: SummationSequence;
  terms: number;
  scale: number;
  denominatorPower: number;
  alternating: boolean;
  phaseOffset: number;
  period: number;
};

export type ParsedFourierText =
  | {
      kind: "preset";
      preset: FourierPreset;
      amplitude: number;
      harmonics: number;
      period: number;
    }
  | {
      kind: "custom";
      definition: CustomSeriesDefinition;
    };

const SCALAR_ATOM_PATTERN = "(?:\\d*\\.?\\d+|pi|π|e)";

function createId(index: number) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `expr-term-${index + 1}`;
}

export function createDefaultSummationDraft(
  config: FourierConfig,
): SummationDraft {
  return {
    name: config.customName || "Summation series",
    basis: "sine",
    sequence: "odd",
    terms: 6,
    scale: 1,
    denominatorPower: 1,
    alternating: false,
    phaseOffset: 0,
    period: config.period,
  };
}

export function buildTermsFromSummationDraft(
  draft: SummationDraft,
): CustomSeriesTerm[] {
  return Array.from({ length: Math.max(1, Math.round(draft.terms)) }, (_, index) => {
    let harmonic = index + 1;

    if (draft.sequence === "odd") {
      harmonic = index * 2 + 1;
    } else if (draft.sequence === "even") {
      harmonic = (index + 1) * 2;
    }

    const denominator =
      draft.denominatorPower === 0
        ? 1
        : Math.pow(harmonic, draft.denominatorPower);
    const sign = draft.alternating && index % 2 === 1 ? -1 : 1;

    return {
      id: createId(index),
      basis: draft.basis,
      harmonic,
      amplitude: (sign * draft.scale) / denominator,
      phaseOffset: draft.phaseOffset,
    };
  });
}

export function createDefinitionFromSummationDraft(
  draft: SummationDraft,
): CustomSeriesDefinition {
  return {
    name: draft.name.trim() || "Summation series",
    period: draft.period,
    terms: buildTermsFromSummationDraft(draft).map((term) => ({
      basis: term.basis,
      harmonic: term.harmonic,
      amplitude: term.amplitude,
      phaseOffset: term.phaseOffset,
    })),
  };
}

function normalizeScalarExpression(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/π/g, "pi")
    .replace(/(\d)(pi|e)/g, "$1*$2")
    .replace(/(pi|e)(\d)/g, "$1*$2");
}

export function parseScalarExpression(raw: string): number | null {
  const normalized = normalizeScalarExpression(raw);

  if (normalized.length === 0) {
    return null;
  }

  const expressionPattern = new RegExp(
    `^[+-]?(?:${SCALAR_ATOM_PATTERN})(?:[*/](?:${SCALAR_ATOM_PATTERN}))*$`,
    "i",
  );

  if (!expressionPattern.test(normalized)) {
    return null;
  }

  const tokens = normalized.match(/[*/]|[+-]?pi|[+-]?e|[+-]?\d*\.?\d+/g);

  if (!tokens || tokens.length === 0) {
    return null;
  }

  const parseAtom = (token: string) => {
    if (token === "pi" || token === "+pi") {
      return Math.PI;
    }

    if (token === "-pi") {
      return -Math.PI;
    }

    if (token === "e" || token === "+e") {
      return Math.E;
    }

    if (token === "-e") {
      return -Math.E;
    }

    const numeric = Number(token);
    return Number.isFinite(numeric) ? numeric : null;
  };

  let total = parseAtom(tokens[0]);

  if (total === null) {
    return null;
  }

  for (let index = 1; index < tokens.length; index += 2) {
    const operator = tokens[index];
    const rhs = parseAtom(tokens[index + 1]);

    if (!operator || rhs === null) {
      return null;
    }

    if (operator === "*") {
      total *= rhs;
    } else if (operator === "/") {
      total /= rhs;
    } else {
      return null;
    }
  }

  return Number.isFinite(total) ? total : null;
}

export function formatScalarExpression(value: number) {
  const epsilon = 1e-6;
  const variants: Array<[string, number]> = [
    ["0", 0],
    ["pi", Math.PI],
    ["pi/2", Math.PI / 2],
    ["pi/4", Math.PI / 4],
    ["2*pi", Math.PI * 2],
    ["e", Math.E],
  ];

  for (const [label, target] of variants) {
    if (Math.abs(value - target) < epsilon) {
      return label;
    }
  }

  return Number(value.toFixed(4)).toString();
}

export function presetToExpression(config: FourierConfig) {
  switch (config.preset) {
    case "square":
      return `square(A=${formatScalarExpression(config.amplitude)}, N=${config.harmonics}, L=${formatScalarExpression(config.period)})`;
    case "triangle":
      return `triangle(A=${formatScalarExpression(config.amplitude)}, N=${config.harmonics}, L=${formatScalarExpression(config.period)})`;
    case "sawtooth":
      return `sawtooth(A=${formatScalarExpression(config.amplitude)}, N=${config.harmonics}, L=${formatScalarExpression(config.period)})`;
    case "custom":
      return config.customTerms
        .map((term, index) => {
          const sign = term.amplitude >= 0 ? (index === 0 ? "" : " + ") : " - ";
          const amplitude = formatScalarExpression(Math.abs(term.amplitude));
          const basis = term.basis === "cosine" ? "cos" : "sin";
          const harmonic = term.harmonic === 1 ? "" : `${term.harmonic}`;
          const phase =
            Math.abs(term.phaseOffset) < 0.0001
              ? ""
              : term.phaseOffset >= 0
                ? ` + ${formatScalarExpression(term.phaseOffset)}`
                : ` - ${formatScalarExpression(Math.abs(term.phaseOffset))}`;

          return `${sign}${amplitude}${basis}(${harmonic}x${phase})`;
        })
        .join("")
        .trim();
    default:
      return "";
  }
}

function parsePresetCall(raw: string): ParsedFourierText | null {
  const match = raw.match(
    /^(square|triangle|sawtooth)\s*\(\s*A\s*=\s*([^,]+)\s*,\s*N\s*=\s*(\d+)\s*,\s*L\s*=\s*([^)]+)\s*\)$/i,
  );

  if (!match) {
    return null;
  }

  const preset = match[1].toLowerCase() as FourierPreset;
  const amplitude = parseScalarExpression(match[2]);
  const harmonics = Number(match[3]);
  const period = parseScalarExpression(match[4]);

  if (
    amplitude === null ||
    period === null ||
    !Number.isFinite(amplitude) ||
    !Number.isFinite(harmonics) ||
    !Number.isFinite(period)
  ) {
    return null;
  }

  return {
    kind: "preset",
    preset,
    amplitude,
    harmonics,
    period,
  };
}

function splitSignedTerms(raw: string) {
  const terms: string[] = [];
  let depth = 0;
  let current = "";

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
    }

    if (depth === 0 && index > 0 && (char === "+" || char === "-")) {
      terms.push(current);
      current = char;
    } else {
      current += char;
    }
  }

  if (current.trim().length > 0) {
    terms.push(current);
  }

  return terms.filter((term) => term.trim().length > 0);
}

function parseExplicitTerm(raw: string, index: number): CustomSeriesTerm | null {
  const cleaned = raw.replace(/\s+/g, "");
  const scalarSegment = `${SCALAR_ATOM_PATTERN}(?:[*/]${SCALAR_ATOM_PATTERN})*`;
  const match = cleaned.match(
    new RegExp(
      `^([+-]?(?:${scalarSegment})?)\\*?(sin|cos)\\((?:(\\d+)\\*?)?(?:w\\*?x|ωx|x)([+-](?:${scalarSegment}))?\\)$`,
      "i",
    ),
  );

  if (!match) {
    return null;
  }

  const coefficientSource = match[1];
  let amplitude = 1;

  if (coefficientSource === "-") {
    amplitude = -1;
  } else if (coefficientSource !== "" && coefficientSource !== "+") {
    amplitude = parseScalarExpression(coefficientSource) ?? Number.NaN;
  }

  if (!Number.isFinite(amplitude)) {
    return null;
  }

  return {
    id: createId(index),
    basis: match[2].toLowerCase() === "cos" ? "cosine" : "sine",
    harmonic: match[3] ? Number(match[3]) : 1,
    amplitude,
    phaseOffset: match[4] ? (parseScalarExpression(match[4]) ?? Number.NaN) : 0,
  };
}

function parseExplicitExpression(raw: string): ParsedFourierText | null {
  const parsedTerms = splitSignedTerms(raw).map((term, index) =>
    parseExplicitTerm(term, index),
  );

  if (parsedTerms.length === 0 || parsedTerms.some((term) => term === null)) {
    return null;
  }

  const terms = parsedTerms.filter(
    (term): term is CustomSeriesTerm => term !== null,
  );

  return {
    kind: "custom",
    definition: {
      name: "Parsed expression",
      period: 6,
      terms: terms.map((term) => ({
        basis: term.basis,
        harmonic: term.harmonic,
        amplitude: term.amplitude,
        phaseOffset: term.phaseOffset,
      })),
    },
  };
}

export function parseFourierTextExpression(raw: string): ParsedFourierText | null {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const preset = parsePresetCall(trimmed);

  if (preset) {
    return preset;
  }

  return parseExplicitExpression(trimmed);
}

export function describeAcceptedExpressionSyntax() {
  return [
    "square(A=1, N=7, L=6)",
    "triangle(A=1, N=9, L=6)",
    "square(A=1, N=7, L=2*pi)",
    "0.8*sin(x) + 0.35*sin(3x) - 0.2*cos(5x+pi/4)",
  ];
}
