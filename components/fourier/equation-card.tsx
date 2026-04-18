"use client";

import { useEffect, useMemo, useState } from "react";

import { clamp } from "@/lib/animation";
import {
  type FourierEditorMode,
  type SummationDraft,
  createDefaultSummationDraft,
  createDefinitionFromSummationDraft,
  describeAcceptedExpressionSyntax,
  formatScalarExpression,
  parseFourierTextExpression,
  parseScalarExpression,
  presetToExpression,
} from "@/lib/fourier-expression";
import { getPresetLabel } from "@/lib/fourier";
import {
  type CustomBasis,
  type CustomSeriesDefinition,
  type CustomSeriesTerm,
  type FourierConfig,
} from "@/types/fourier";

type EquationCardProps = {
  config: FourierConfig;
  currentValue: number;
  targetValue: number;
  error: number;
  onConfigChange: (nextConfig: FourierConfig) => void;
  onCustomTermsChange: (terms: CustomSeriesTerm[]) => void;
  onCustomNameChange: (name: string) => void;
  onApplyCustomDefinition: (definition: CustomSeriesDefinition) => void;
};

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/65">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function FormulaShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="math-shell">
      <div className="math-shell__row">{children}</div>
    </div>
  );
}

function FormulaTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
        active
          ? "border border-violet-300/30 bg-violet-300/16 text-violet-100"
          : "border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
      }`}
    >
      {children}
    </button>
  );
}

function FormulaInput({
  value,
  onChange,
  step,
  min,
  max,
  className = "",
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayValue = draft ?? formatScalarExpression(value);

  const commit = () => {
    const parsed = parseScalarExpression(displayValue);

    if (parsed === null) {
      setDraft(null);
      return;
    }

    onChange(parsed);
    setDraft(null);
  };

  return (
    <input
      type="text"
      inputMode="text"
      value={displayValue}
      step={step}
      min={min}
      max={max}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          setDraft(null);
          event.currentTarget.blur();
        }
      }}
      aria-label="Math value input"
      title="Supports numbers and constants like pi, e, or pi/2"
      className={`math-token-input ${className}`}
    />
  );
}

function FormulaSelect({
  value,
  onChange,
}: {
  value: CustomBasis;
  onChange: (value: CustomBasis) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as CustomBasis)}
      className="math-token-select"
    >
      <option value="sine">sin</option>
      <option value="cosine">cos</option>
    </select>
  );
}

function SigmaBlock({
  lower,
  upper,
}: {
  lower: React.ReactNode;
  upper: React.ReactNode;
}) {
  return (
    <span className="math-sigma">
      <span className="math-sigma__upper">{upper}</span>
      <span className="math-sigma__symbol">Σ</span>
      <span className="math-sigma__lower">{lower}</span>
    </span>
  );
}

function Fraction({
  numerator,
  denominator,
}: {
  numerator: React.ReactNode;
  denominator: React.ReactNode;
}) {
  return (
    <span className="math-frac">
      <span className="math-frac__top">{numerator}</span>
      <span className="math-frac__bottom">{denominator}</span>
    </span>
  );
}

export function EquationCard({
  config,
  currentValue,
  targetValue,
  error,
  onConfigChange,
  onCustomTermsChange,
  onCustomNameChange,
  onApplyCustomDefinition,
}: EquationCardProps) {
  const isCustom = config.preset === "custom";
  const acceptedSyntax = useMemo(() => describeAcceptedExpressionSyntax(), []);
  const [mode, setMode] = useState<FourierEditorMode>(
    config.preset === "custom" ? "explicit" : "preset",
  );
  const [summationDraft, setSummationDraft] = useState<SummationDraft>(
    createDefaultSummationDraft(config),
  );
  const [textExpression, setTextExpression] = useState(() => presetToExpression(config));
  const [textStatus, setTextStatus] = useState<string | null>(null);
  const effectiveMode = mode;
  const selectedPreset = config.preset === "custom" ? "square" : config.preset;

  const updatePresetField =
    (field: "harmonics" | "amplitude" | "period", min: number, max: number) =>
    (value: number) => {
      onConfigChange({
        ...config,
        [field]:
          field === "harmonics"
            ? Math.max(min, Math.min(max, Math.round(value)))
            : clamp(value, min, max),
      });
    };

  const updateCustomTermNumeric = (
    termId: string,
    field: "harmonic" | "amplitude" | "phaseOffset",
    value: number,
  ) => {
    onCustomTermsChange(
      config.customTerms.map((term) =>
        term.id === termId
          ? {
              ...term,
              [field]:
                field === "harmonic"
                  ? Math.max(1, Math.min(24, Math.round(value)))
                  : field === "phaseOffset"
                    ? clamp(value, -6.28, 6.28)
                    : clamp(value, -4, 4),
            }
          : term,
      ),
    );
  };

  const updateCustomTermBasis = (termId: string, value: CustomBasis) => {
    onCustomTermsChange(
      config.customTerms.map((term) =>
        term.id === termId
          ? {
              ...term,
              basis: value,
            }
          : term,
      ),
    );
  };

  const addCustomTerm = () => {
    const nextHarmonic = Math.max(
      1,
      ...config.customTerms.map((term) => term.harmonic + 1),
    );

    onCustomTermsChange([
      ...config.customTerms,
      {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `custom-term-${config.customTerms.length + 1}`,
        basis: "sine",
        harmonic: nextHarmonic,
        amplitude: 0.3,
        phaseOffset: 0,
      },
    ]);
  };

  const removeCustomTerm = (termId: string) => {
    if (config.customTerms.length <= 1) {
      return;
    }

    onCustomTermsChange(config.customTerms.filter((term) => term.id !== termId));
  };

  useEffect(() => {
    if (effectiveMode !== "summation") {
      return;
    }

    onApplyCustomDefinition(createDefinitionFromSummationDraft(summationDraft));
  }, [effectiveMode, onApplyCustomDefinition, summationDraft]);

  const applyTextExpression = () => {
    const parsed = parseFourierTextExpression(textExpression);

    if (!parsed) {
      setTextStatus("Invalid syntax. Use one of the supported Fourier forms below.");
      return;
    }

    if (parsed.kind === "preset") {
      onConfigChange({
        ...config,
        preset: parsed.preset,
        amplitude: clamp(parsed.amplitude, 0.4, 2.5),
        harmonics: Math.max(1, Math.min(20, Math.round(parsed.harmonics))),
        period: clamp(parsed.period, 2, 12),
      });
      setMode("preset");
      setTextStatus(`Parsed as ${getPresetLabel(parsed.preset)}.`);
      return;
    }

    onApplyCustomDefinition(parsed.definition);
    setMode("explicit");
    setTextStatus(`Parsed custom expression with ${parsed.definition.terms.length} term(s).`);
  };

  const updateSummationField =
    <K extends keyof SummationDraft>(field: K) =>
    (value: SummationDraft[K]) => {
      setSummationDraft((current) => ({ ...current, [field]: value }));
    };

  const chooseMode = (nextMode: FourierEditorMode) => {
    if (nextMode === "preset") {
      onConfigChange({
        ...config,
        preset: selectedPreset,
      });
    }

    if (nextMode === "explicit" && config.preset !== "custom") {
      onConfigChange({
        ...config,
        preset: "custom",
      });
    }

    if (nextMode === "text") {
      setTextExpression(presetToExpression(config));
      setTextStatus(null);
    }

    if (nextMode === "summation") {
      setSummationDraft((current) => ({
        ...current,
        period: config.period,
        name:
          config.preset === "custom"
            ? config.customName || current.name
            : `${getPresetLabel(config.preset)} summation`,
      }));
    }

    setMode(nextMode);
  };

  const presetExpression =
    selectedPreset === "square" ? (
      <>
        <Fraction
          numerator={
            <span className="math-inline">
              <span>4</span>
              <FormulaInput
                value={config.amplitude}
                onChange={updatePresetField("amplitude", 0.4, 2.5)}
                className="w-18"
              />
            </span>
          }
          denominator={<span>π</span>}
        />
        <SigmaBlock
          lower={<span>k=1</span>}
          upper={
            <FormulaInput
              value={config.harmonics}
              onChange={updatePresetField("harmonics", 1, 20)}
              step={1}
              min={1}
              max={20}
              className="w-14"
            />
          }
        />
        <Fraction
          numerator={
            <span className="math-inline">
              sin((2k−1)·2πx /
              <FormulaInput
                value={config.period}
                onChange={updatePresetField("period", 2, 12)}
                step={0.25}
                min={2}
                max={12}
                className="mx-1 w-18"
              />
              )
            </span>
          }
          denominator={<span>(2k−1)</span>}
        />
      </>
    ) : selectedPreset === "triangle" ? (
      <>
        <Fraction
          numerator={
            <span className="math-inline">
              <span>8</span>
              <FormulaInput
                value={config.amplitude}
                onChange={updatePresetField("amplitude", 0.4, 2.5)}
                className="w-18"
              />
            </span>
          }
          denominator={<span>π²</span>}
        />
        <SigmaBlock
          lower={<span>k=1</span>}
          upper={
            <FormulaInput
              value={config.harmonics}
              onChange={updatePresetField("harmonics", 1, 20)}
              step={1}
              min={1}
              max={20}
              className="w-14"
            />
          }
        />
        <Fraction
          numerator={
            <span className="math-inline">
              (−1)
              <sup>k</sup>
              sin((2k−1)·2πx /
              <FormulaInput
                value={config.period}
                onChange={updatePresetField("period", 2, 12)}
                step={0.25}
                min={2}
                max={12}
                className="mx-1 w-18"
              />
              )
            </span>
          }
          denominator={
            <span>
              (2k−1)
              <sup>2</sup>
            </span>
          }
        />
      </>
    ) : (
      <>
        <Fraction
          numerator={
            <span className="math-inline">
              <span>2</span>
              <FormulaInput
                value={config.amplitude}
                onChange={updatePresetField("amplitude", 0.4, 2.5)}
                className="w-18"
              />
            </span>
          }
          denominator={<span>π</span>}
        />
        <SigmaBlock
          lower={<span>n=1</span>}
          upper={
            <FormulaInput
              value={config.harmonics}
              onChange={updatePresetField("harmonics", 1, 20)}
              step={1}
              min={1}
              max={20}
              className="w-14"
            />
          }
        />
        <Fraction
          numerator={
            <span className="math-inline">
              (−1)
              <sup>n+1</sup>
              sin(n·2πx /
              <FormulaInput
                value={config.period}
                onChange={updatePresetField("period", 2, 12)}
                step={0.25}
                min={2}
                max={12}
                className="mx-1 w-18"
              />
              )
            </span>
          }
          denominator={<span>n</span>}
        />
      </>
    );

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/65 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
            Fourier model
          </p>
          <h2 className="text-2xl font-semibold text-white">
            {isCustom
              ? config.customName || getPresetLabel(config.preset)
              : getPresetLabel(config.preset)}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-300">
            {isCustom
              ? "Your custom mode treats the signal as a direct sum of user-defined sinusoidal terms, so you can model any periodic combination you want."
              : "The epicycles sum sinusoidal basis functions into a periodic signal. Increase the number of terms to reduce approximation error and expose the series behavior near sharp corners."}
          </p>
        </div>
        <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
          {isCustom ? config.customTerms.length : config.harmonics} terms over
          period {config.period.toFixed(2)}
        </div>
      </div>

      <div className="mt-5 rounded-[26px] border border-violet-300/20 bg-[linear-gradient(180deg,rgba(39,39,42,0.95),rgba(24,24,27,0.96))] p-4 shadow-[0_0_0_1px_rgba(196,181,253,0.14),0_22px_50px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-amber-300/25 bg-amber-300/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">
              Math Input
            </span>
            <span className="rounded-full border border-violet-300/25 bg-violet-300/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-violet-100">
              Editable
            </span>
          </div>
          <span className="text-xs uppercase tracking-[0.22em] text-slate-400">
            click a value to change it
          </span>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <FormulaTab
            active={effectiveMode === "preset"}
            onClick={() => chooseMode("preset")}
          >
            Preset
          </FormulaTab>
          <FormulaTab
            active={effectiveMode === "summation"}
            onClick={() => chooseMode("summation")}
          >
            Summation
          </FormulaTab>
          <FormulaTab
            active={effectiveMode === "explicit"}
            onClick={() => chooseMode("explicit")}
          >
            Explicit
          </FormulaTab>
          <FormulaTab
            active={effectiveMode === "text"}
            onClick={() => chooseMode("text")}
          >
            Text
          </FormulaTab>
        </div>

        {effectiveMode === "preset" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["square", "triangle", "sawtooth"] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    onConfigChange({
                      ...config,
                      preset,
                    });
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                    selectedPreset === preset
                      ? "border border-cyan-300/30 bg-cyan-300/16 text-cyan-100"
                      : "border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                  }`}
                >
                  {getPresetLabel(preset)}
                </button>
              ))}
            </div>

            <FormulaShell>
              <span className="math-fx">f(x)</span>
              <span className="math-equals">=</span>
              {presetExpression}
            </FormulaShell>

            <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-black/18 px-3 py-2">
                `A` controls amplitude
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/18 px-3 py-2">
                `N` sets the upper summation bound
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/18 px-3 py-2">
                `L` changes the period length
              </div>
            </div>
          </div>
        ) : effectiveMode === "summation" ? (
          <div className="space-y-4">
            <FormulaShell>
              <span className="math-fx">f(x)</span>
              <span className="math-equals">=</span>
              <Fraction
                numerator={
                  <FormulaInput
                    value={summationDraft.scale}
                    onChange={updateSummationField("scale")}
                    className="w-18"
                  />
                }
                denominator={
                  <span>
                    {summationDraft.denominatorPower === 0
                      ? "1"
                      : summationDraft.sequence === "odd"
                        ? "(2k−1)"
                        : summationDraft.sequence === "even"
                          ? "(2k)"
                          : "n"}
                    {summationDraft.denominatorPower > 1 ? (
                      <sup>{summationDraft.denominatorPower}</sup>
                    ) : null}
                  </span>
                }
              />
              <SigmaBlock
                lower={
                  <span>
                    {summationDraft.sequence === "all" ? "n" : "k"}=1
                  </span>
                }
                upper={
                  <FormulaInput
                    value={summationDraft.terms}
                    onChange={(value) =>
                      updateSummationField("terms")(
                        Math.max(1, Math.min(20, Math.round(value))),
                      )
                    }
                    step={1}
                    min={1}
                    max={20}
                    className="w-14"
                  />
                }
              />
              <span className="math-inline">
                {summationDraft.alternating ? "(-1)^k ·" : ""}
              </span>
              <FormulaSelect
                value={summationDraft.basis}
                onChange={updateSummationField("basis")}
              />
              <span className="math-inline">(</span>
              <span className="math-inline">
                {summationDraft.sequence === "odd"
                  ? "(2k−1)"
                  : summationDraft.sequence === "even"
                    ? "(2k)"
                    : "n"}
                ·ωx +
              </span>
              <FormulaInput
                value={summationDraft.phaseOffset}
                onChange={updateSummationField("phaseOffset")}
                className="w-18"
              />
              <span className="math-inline">)</span>
            </FormulaShell>

            <div className="grid gap-3 md:grid-cols-4">
              <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/18 p-3 text-sm text-slate-200">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Name
                </span>
                <input
                  type="text"
                  value={summationDraft.name}
                  onChange={(event) =>
                    updateSummationField("name")(event.target.value)
                  }
                  className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/18 p-3 text-sm text-slate-200">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Harmonics
                </span>
                <select
                  value={summationDraft.sequence}
                  onChange={(event) =>
                    updateSummationField("sequence")(
                      event.target.value as SummationDraft["sequence"],
                    )
                  }
                  className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                >
                  <option value="all">all n</option>
                  <option value="odd">odd only</option>
                  <option value="even">even only</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/18 p-3 text-sm text-slate-200">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Denominator power
                </span>
                <select
                  value={summationDraft.denominatorPower}
                  onChange={(event) =>
                    updateSummationField("denominatorPower")(
                      Number(event.target.value),
                    )
                  }
                  className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/18 p-3 text-sm text-slate-200">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Alternating sign
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateSummationField("alternating")(!summationDraft.alternating)
                  }
                  className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-slate-900"
                >
                  {summationDraft.alternating ? "on" : "off"}
                </button>
              </label>
            </div>
          </div>
        ) : effectiveMode === "explicit" ? (
          <div className="space-y-3">
            <FormulaShell>
              <span className="math-fx">f(x)</span>
              <span className="math-equals">=</span>
              <input
                type="text"
                value={config.customName}
                onChange={(event) => onCustomNameChange(event.target.value)}
                className="math-name-input"
                placeholder="Custom series"
              />
              <span className="math-inline text-slate-400">
                with&nbsp;L =
                <FormulaInput
                  value={config.period}
                  onChange={updatePresetField("period", 2, 12)}
                  step={0.25}
                  min={2}
                  max={12}
                  className="ml-2 w-18"
                />
              </span>
            </FormulaShell>

            <div className="space-y-2">
              {config.customTerms.map((term, index) => (
                <FormulaShell key={term.id}>
                  <span className="math-line-prefix">
                    {index === 0 ? "term 1" : `term ${index + 1}`}
                  </span>
                  {index > 0 ? <span className="math-plus">+</span> : null}
                  <FormulaInput
                    value={term.amplitude}
                    onChange={(value) =>
                      updateCustomTermNumeric(term.id, "amplitude", value)
                    }
                    className="w-18"
                  />
                  <FormulaSelect
                    value={term.basis}
                    onChange={(value) => updateCustomTermBasis(term.id, value)}
                  />
                  <span className="math-inline">(</span>
                  <FormulaInput
                    value={term.harmonic}
                    onChange={(value) =>
                      updateCustomTermNumeric(term.id, "harmonic", value)
                    }
                    step={1}
                    min={1}
                    max={24}
                    className="w-14"
                  />
                  <span className="math-inline">·ωx +</span>
                  <FormulaInput
                    value={term.phaseOffset}
                    onChange={(value) =>
                      updateCustomTermNumeric(term.id, "phaseOffset", value)
                    }
                    className="w-18"
                  />
                  <span className="math-inline">)</span>
                  <button
                    type="button"
                    onClick={() => removeCustomTerm(term.id)}
                    disabled={config.customTerms.length <= 1}
                    className="math-action"
                  >
                    remove
                  </button>
                </FormulaShell>
              ))}
            </div>

            <div className="flex justify-start">
              <button type="button" onClick={addCustomTerm} className="math-action">
                + add term
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <FormulaShell>
              <textarea
                value={textExpression}
                onChange={(event) => setTextExpression(event.target.value)}
                className="min-h-[7rem] w-full resize-none bg-transparent text-[1.02rem] leading-7 text-slate-100 outline-none"
                placeholder="Enter a supported Fourier expression..."
              />
            </FormulaShell>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={applyTextExpression}
                className="rounded-xl border border-violet-300/30 bg-violet-300/16 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-300/22"
              >
                Parse expression
              </button>
              {textStatus ? (
                <span className="text-sm text-slate-300">{textStatus}</span>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Accepted syntax
              </p>
              <div className="mt-3 grid gap-2">
                {acceptedSyntax.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setTextExpression(example)}
                    className="rounded-xl border border-white/8 bg-slate-950/70 px-3 py-2 text-left font-mono text-sm text-slate-200 transition hover:border-violet-300/25 hover:bg-slate-900"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Metric label="Current approximation" value={currentValue.toFixed(3)} />
        <Metric
          label={isCustom ? "Reference value" : "Target value"}
          value={targetValue.toFixed(3)}
        />
        <Metric
          label={isCustom ? "Series self-error" : "RMS error"}
          value={isCustom ? "0.0000" : error.toFixed(4)}
        />
      </div>
    </section>
  );
}
