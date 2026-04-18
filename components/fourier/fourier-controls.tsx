import { type ChangeEvent, useMemo, useState } from "react";

import { clamp, formatPhase } from "@/lib/animation";
import {
  createCustomSeriesDefinition,
  getPresetLabel,
  parseCustomSeriesDefinition,
  serializeCustomSeriesDefinition,
} from "@/lib/fourier";
import {
  type CustomBasis,
  type CustomSeriesDefinition,
  type CustomSeriesSlot,
  type CustomSeriesTerm,
  type FourierConfig,
  type FourierPreset,
} from "@/types/fourier";

type FourierControlsProps = {
  config: FourierConfig;
  speed: number;
  phase: number;
  isPlaying: boolean;
  showComponents: boolean;
  showTarget: boolean;
  showTrail: boolean;
  onPresetChange: (preset: FourierPreset) => void;
  onConfigChange: (nextConfig: FourierConfig) => void;
  onCustomTermsChange: (terms: CustomSeriesTerm[]) => void;
  onCustomNameChange: (name: string) => void;
  onApplyCustomDefinition: (definition: CustomSeriesDefinition) => void;
  customSlots: CustomSeriesSlot[];
  onSaveCustomSlot: (slotId: string) => void;
  onLoadCustomSlot: (slotId: string) => void;
  onClearCustomSlot: (slotId: string) => void;
  onSpeedChange: (speed: number) => void;
  onPhaseChange: (phase: number) => void;
  onPlayingChange: (isPlaying: boolean) => void;
  onShowComponentsChange: (value: boolean) => void;
  onShowTargetChange: (value: boolean) => void;
  onShowTrailChange: (value: boolean) => void;
};

type SliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  displayValue: string;
  onChange: (value: number) => void;
};

function SliderControl({
  label,
  min,
  max,
  step,
  value,
  displayValue,
  onChange,
}: SliderProps) {
  return (
    <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-100">{label}</span>
        <span className="rounded-full bg-slate-950/70 px-2 py-1 text-xs text-cyan-200">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-cyan-400"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`flex h-7 w-12 items-center rounded-full p-1 transition ${
          checked ? "bg-cyan-400/90" : "bg-slate-700"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        aria-pressed={checked}
      >
        <span
          className={`h-5 w-5 rounded-full bg-slate-950 shadow-lg transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FourierControls({
  config,
  speed,
  phase,
  isPlaying,
  showComponents,
  showTarget,
  showTrail,
  onPresetChange,
  onConfigChange,
  onCustomTermsChange,
  onCustomNameChange,
  onApplyCustomDefinition,
  customSlots,
  onSaveCustomSlot,
  onLoadCustomSlot,
  onClearCustomSlot,
  onSpeedChange,
  onPhaseChange,
  onPlayingChange,
  onShowComponentsChange,
  onShowTargetChange,
  onShowTrailChange,
}: FourierControlsProps) {
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const updateNumericField =
    (field: "harmonics" | "amplitude" | "period", min: number, max: number) =>
    (value: number) => {
      onConfigChange({
        ...config,
        [field]: clamp(value, min, max),
      });
    };

  const handlePresetChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onPresetChange(event.target.value as FourierPreset);
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
                  ? Math.max(1, Math.round(value))
                  : clamp(value, -12, 12),
            }
          : term,
      ),
    );
  };

  const updateCustomTermBasis = (
    termId: string,
    value: CustomBasis,
  ) => {
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
    const harmonic = Math.max(
      1,
      ...config.customTerms.map((term) => term.harmonic + 1),
    );

    onCustomTermsChange([
      ...config.customTerms,
      {
        id: crypto.randomUUID(),
        basis: "sine",
        harmonic,
        amplitude: 0.4,
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

  const isCustom = config.preset === "custom";
  const exportedDefinition = useMemo(
    () => serializeCustomSeriesDefinition(createCustomSeriesDefinition(config)),
    [config],
  );

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportedDefinition);
      setImportStatus("Copied current custom series JSON.");
    } catch {
      setImportStatus("Copy failed. You can still select the JSON manually.");
    }
  };

  const importDefinition = () => {
    const parsed = parseCustomSeriesDefinition(importText);

    if (!parsed) {
      setImportStatus("Import failed. Paste a valid custom series JSON payload.");
      return;
    }

    onApplyCustomDefinition(parsed);
    setImportStatus(`Imported "${parsed.name}".`);
  };

  return (
    <section className="flex h-full flex-col gap-4 rounded-[28px] border border-white/10 bg-slate-950/65 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
          Interactive controls
        </p>
        <h2 className="text-2xl font-semibold text-white">
          Tune the Fourier system
        </h2>
        <p className="text-sm leading-6 text-slate-300">
          {isCustom
            ? "Build your own periodic signal from arbitrary sinusoidal terms, then inspect how it behaves in the epicycle, waveform, and spectrum views."
            : "Change the source waveform, harmonic count, scale, and playback to see how the approximation evolves in real time."}
        </p>
      </div>

      <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <span className="text-sm font-medium text-slate-100">Preset</span>
        <select
          value={config.preset}
          onChange={handlePresetChange}
          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none"
        >
          {(["square", "triangle", "sawtooth", "custom"] as const).map((preset) => (
            <option key={preset} value={preset}>
              {getPresetLabel(preset)}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3">
        {!isCustom ? (
          <>
            <SliderControl
              label="Series terms"
              min={1}
              max={20}
              step={1}
              value={config.harmonics}
              displayValue={`${config.harmonics}`}
              onChange={updateNumericField("harmonics", 1, 20)}
            />
            <SliderControl
              label="Amplitude"
              min={0.4}
              max={2.5}
              step={0.05}
              value={config.amplitude}
              displayValue={config.amplitude.toFixed(2)}
              onChange={updateNumericField("amplitude", 0.4, 2.5)}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-100">
                  Custom series terms
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  Define your own sum of sinusoids and cosinusoids by setting
                  each basis, harmonic, amplitude, and phase offset.
                </p>
              </div>
              <button
                type="button"
                onClick={addCustomTerm}
                className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20"
              >
                Add term
              </button>
            </div>

            <label className="mt-4 flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Series name
              </span>
              <input
                type="text"
                value={config.customName}
                onChange={(event) => onCustomNameChange(event.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none"
                placeholder="Untitled custom series"
              />
            </label>

            <div className="mt-4 grid gap-3">
              {config.customTerms.map((term, index) => (
                <div
                  key={term.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-100">
                      Term {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeCustomTerm(term.id)}
                      disabled={config.customTerms.length <= 1}
                      className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <SelectField
                      label="Basis"
                      value={term.basis ?? "sine"}
                      options={[
                        { value: "sine", label: "sine" },
                        { value: "cosine", label: "cosine" },
                      ]}
                      onChange={(value) =>
                        updateCustomTermBasis(term.id, value as CustomBasis)
                      }
                    />
                    <NumberField
                      label="Harmonic"
                      value={term.harmonic}
                      min={1}
                      max={24}
                      step={1}
                      onChange={(value) =>
                        updateCustomTermNumeric(
                          term.id,
                          "harmonic",
                          clamp(value, 1, 24),
                        )
                      }
                    />
                    <NumberField
                      label="Amplitude"
                      value={term.amplitude}
                      min={-4}
                      max={4}
                      step={0.1}
                      onChange={(value) =>
                        updateCustomTermNumeric(
                          term.id,
                          "amplitude",
                          clamp(value, -4, 4),
                        )
                      }
                    />
                    <NumberField
                      label="Phase (rad)"
                      value={term.phaseOffset}
                      min={-6.28}
                      max={6.28}
                      step={0.1}
                      onChange={(value) =>
                        updateCustomTermNumeric(
                          term.id,
                          "phaseOffset",
                          clamp(value, -6.28, 6.28),
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    Import / export JSON
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Export the current custom definition or import one from a
                    JSON payload using the same schema.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyExport}
                  className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20"
                >
                  Copy export JSON
                </button>
              </div>

              <label className="mt-4 flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Current export
                </span>
                <textarea
                  value={exportedDefinition}
                  readOnly
                  rows={8}
                  className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs leading-6 text-slate-200 outline-none"
                />
              </label>

              <label className="mt-4 flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Import payload
                </span>
                <textarea
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  rows={8}
                  className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs leading-6 text-slate-200 outline-none"
                  placeholder='{"name":"Warm pad","period":6,"terms":[{"basis":"sine","harmonic":1,"amplitude":1,"phaseOffset":0}]}'
                />
              </label>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={importDefinition}
                  className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20"
                >
                  Import custom series
                </button>
                {importStatus ? (
                  <span className="text-sm text-slate-300">{importStatus}</span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-sm font-medium text-slate-100">Saved slots</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                Save the current custom series into a reusable slot, then reload
                it later without re-entering each term.
              </p>

              <div className="mt-4 grid gap-3">
                {customSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-100">
                          {slot.label}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          {slot.definition
                            ? `${slot.definition.name} · ${slot.definition.terms.length} terms`
                            : "Empty slot"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onSaveCustomSlot(slot.id)}
                          className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/20"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => onLoadCustomSlot(slot.id)}
                          disabled={!slot.definition}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => onClearCustomSlot(slot.id)}
                          disabled={!slot.definition}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <SliderControl
          label="Period"
          min={2}
          max={12}
          step={0.25}
          value={config.period}
          displayValue={config.period.toFixed(2)}
          onChange={updateNumericField("period", 2, 12)}
        />
        <SliderControl
          label="Animation speed"
          min={0.05}
          max={1.5}
          step={0.05}
          value={speed}
          displayValue={`${speed.toFixed(2)} cycles/s`}
          onChange={(value) => onSpeedChange(clamp(value, 0.05, 1.5))}
        />
        <SliderControl
          label="Time scrubber"
          min={0}
          max={1}
          step={0.001}
          value={phase}
          displayValue={formatPhase(phase, config.period)}
          onChange={(value) => onPhaseChange(clamp(value, 0, 1))}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onPlayingChange(!isPlaying)}
          className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          {isPlaying ? "Pause animation" : "Play animation"}
        </button>
        <button
          type="button"
          onClick={() => onPhaseChange(0)}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
        >
          Reset phase
        </button>
      </div>

      <div className="grid gap-3">
        <Toggle
          label="Show harmonic components"
          checked={showComponents}
          onChange={onShowComponentsChange}
        />
        <Toggle
          label="Show target waveform"
          checked={isCustom ? false : showTarget}
          onChange={onShowTargetChange}
          disabled={isCustom}
        />
        <Toggle
          label="Show tracing trail"
          checked={showTrail}
          onChange={onShowTrailChange}
        />
      </div>
    </section>
  );
}
