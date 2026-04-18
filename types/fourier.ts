export type FourierPreset = "square" | "triangle" | "sawtooth" | "custom";

export type CustomBasis = "sine" | "cosine";

export type CustomSeriesTerm = {
  id: string;
  basis: CustomBasis;
  harmonic: number;
  amplitude: number;
  phaseOffset: number;
};

export type CustomSeriesDefinitionTerm = Omit<CustomSeriesTerm, "id">;

export type CustomSeriesDefinition = {
  name: string;
  period: number;
  terms: CustomSeriesDefinitionTerm[];
};

export type CustomSeriesSlot = {
  id: string;
  label: string;
  definition: CustomSeriesDefinition | null;
};

export type FourierConfig = {
  preset: FourierPreset;
  harmonics: number;
  amplitude: number;
  period: number;
  customName: string;
  customTerms: CustomSeriesTerm[];
};

export type FourierTerm = {
  harmonic: number;
  coefficient: number;
  magnitude: number;
  phaseOffset: number;
};

export type PlotPoint = {
  x: number;
  y: number;
};

export type EpicycleVector = {
  harmonic: number;
  radius: number;
  angle: number;
  start: PlotPoint;
  end: PlotPoint;
};
