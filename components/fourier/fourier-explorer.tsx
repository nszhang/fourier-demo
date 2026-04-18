"use client";

import { useEffect, useMemo, useState } from "react";

import { EpicycleView } from "@/components/fourier/epicycle-view";
import { EquationCard } from "@/components/fourier/equation-card";
import { FourierControls } from "@/components/fourier/fourier-controls";
import { SpectrumView } from "@/components/fourier/spectrum-view";
import { WaveformView } from "@/components/fourier/waveform-view";
import { advanceLoopTime } from "@/lib/animation";
import {
  buildFourierTerms,
  buildEpicycleVectors,
  calculateSeriesEnergy,
  calculateApproximationError,
  createCustomSeriesDefinition,
  evaluateSeriesAtPhase,
  evaluateTargetWave,
  getDominantTerm,
  getPresetLabel,
  sampleComponentWaves,
  sampleTargetWave,
  sampleWave,
} from "@/lib/fourier";
import {
  type CustomSeriesDefinition,
  type CustomSeriesTerm,
  type CustomSeriesSlot,
  type FourierConfig,
  type FourierPreset,
} from "@/types/fourier";

const CUSTOM_SLOT_STORAGE_KEY = "fourier-demo-custom-slots";

const DEFAULT_CONFIG: FourierConfig = {
  preset: "square",
  harmonics: 5,
  amplitude: 1,
  period: 6,
  customName: "Warm overtone blend",
  customTerms: [
    { id: "term-1", basis: "sine", harmonic: 1, amplitude: 1, phaseOffset: 0 },
    { id: "term-2", basis: "sine", harmonic: 3, amplitude: 0.35, phaseOffset: 0 },
    { id: "term-3", basis: "cosine", harmonic: 5, amplitude: 0.2, phaseOffset: 0.6 },
  ],
};

const SAMPLE_COUNT = 240;
const TRAIL_COUNT = 100;
const DEFAULT_CUSTOM_SLOTS: CustomSeriesSlot[] = [
  { id: "slot-1", label: "Slot 1", definition: null },
  { id: "slot-2", label: "Slot 2", definition: null },
  { id: "slot-3", label: "Slot 3", definition: null },
];

function getInitialCustomSlots() {
  if (typeof window === "undefined") {
    return DEFAULT_CUSTOM_SLOTS;
  }

  const stored = window.localStorage.getItem(CUSTOM_SLOT_STORAGE_KEY);

  if (!stored) {
    return DEFAULT_CUSTOM_SLOTS;
  }

  try {
    const parsed = JSON.parse(stored) as CustomSeriesSlot[];

    if (!Array.isArray(parsed)) {
      return DEFAULT_CUSTOM_SLOTS;
    }

    return DEFAULT_CUSTOM_SLOTS.map((slot) => {
      const storedSlot = parsed.find((candidate) => candidate.id === slot.id);
      return storedSlot ? { ...slot, ...storedSlot } : slot;
    });
  } catch {
    return DEFAULT_CUSTOM_SLOTS;
  }
}

function attachIds(definition: CustomSeriesDefinition): CustomSeriesTerm[] {
  return definition.terms.map((term, index) => {
    const basis = term.basis === "cosine" ? "cosine" : "sine";

    return {
      ...term,
      basis,
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `custom-term-${index + 1}-${term.harmonic}`,
    };
  });
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export function FourierExplorer() {
  const [config, setConfig] = useState<FourierConfig>(DEFAULT_CONFIG);
  const [speed, setSpeed] = useState(0.2);
  const [phase, setPhase] = useState(0.18);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showComponents, setShowComponents] = useState(true);
  const [showTarget, setShowTarget] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [customSlots, setCustomSlots] =
    useState<CustomSeriesSlot[]>(getInitialCustomSlots);

  useEffect(() => {
    window.localStorage.setItem(
      CUSTOM_SLOT_STORAGE_KEY,
      JSON.stringify(customSlots),
    );
  }, [customSlots]);

  useEffect(() => {
    if (!isPlaying) {
      return undefined;
    }

    let animationFrame = 0;
    let lastTimestamp = performance.now();

    const tick = (timestamp: number) => {
      const delta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      setPhase((currentPhase) => advanceLoopTime(currentPhase, delta, speed));
      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, speed]);

  const terms = useMemo(() => buildFourierTerms(config), [config]);
  const approximation = useMemo(() => sampleWave(config, SAMPLE_COUNT), [config]);
  const target = useMemo(() => sampleTargetWave(config, SAMPLE_COUNT), [config]);
  const componentWaves = useMemo(
    () =>
      sampleComponentWaves(config, SAMPLE_COUNT).map((component) => ({
        harmonic: component.term.harmonic,
        points: component.points,
      })),
    [config],
  );
  const vectors = useMemo(() => buildEpicycleVectors(config, phase), [config, phase]);
  const currentPoint = useMemo(
    () => ({
      x: phase * config.period,
      y: evaluateSeriesAtPhase(config, phase),
    }),
    [config, phase],
  );
  const trail = useMemo(
    () =>
      Array.from({ length: TRAIL_COUNT }, (_, index) => {
        const trailPhase = phase - (TRAIL_COUNT - index - 1) / TRAIL_COUNT / 1.4;

        return {
          x: index * 0.8,
          y: evaluateSeriesAtPhase(config, trailPhase),
        };
      }),
    [config, phase],
  );
  const targetValue = useMemo(() => evaluateTargetWave(config, phase), [config, phase]);
  const approximationError = useMemo(
    () => calculateApproximationError(config),
    [config],
  );
  const dominantTerm = useMemo(() => getDominantTerm(terms), [terms]);
  const spectralEnergy = useMemo(() => calculateSeriesEnergy(terms), [terms]);
  const isCustom = config.preset === "custom";
  const effectiveShowTarget = showTarget && !isCustom;

  const handlePresetChange = (preset: FourierPreset) => {
    setConfig((current) => ({
      ...current,
      preset,
      harmonics: preset === "sawtooth" ? Math.min(current.harmonics, 16) : current.harmonics,
    }));
  };

  const applyCustomDefinition = (definition: CustomSeriesDefinition) => {
    setConfig((current) => ({
      ...current,
      preset: "custom",
      period: definition.period,
      customName: definition.name,
      customTerms: attachIds(definition),
    }));
  };

  const updateCustomTerms = (customTerms: CustomSeriesTerm[]) => {
    setConfig((current) => ({
      ...current,
      preset: "custom",
      customTerms,
    }));
  };

  const updateCustomName = (customName: string) => {
    setConfig((current) => ({
      ...current,
      preset: "custom",
      customName,
    }));
  };

  const saveCustomSlot = (slotId: string) => {
    const definition = createCustomSeriesDefinition(config);

    setCustomSlots((current) =>
      current.map((slot) =>
        slot.id === slotId ? { ...slot, definition } : slot,
      ),
    );
  };

  const loadCustomSlot = (slotId: string) => {
    const slot = customSlots.find((candidate) => candidate.id === slotId);

    if (!slot?.definition) {
      return;
    }

    applyCustomDefinition(slot.definition);
  };

  const clearCustomSlot = (slotId: string) => {
    setCustomSlots((current) =>
      current.map((slot) =>
        slot.id === slotId ? { ...slot, definition: null } : slot,
      ),
    );
  };

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard
          label="Active waveform"
          value={
            isCustom
              ? config.customName || getPresetLabel(config.preset)
              : getPresetLabel(config.preset)
          }
          tone="text-white"
        />
        <StatCard
          label="Current phase"
          value={`${(phase * 100).toFixed(1)}%`}
          tone="text-cyan-200"
        />
        <StatCard
          label="Dominant harmonic"
          value={dominantTerm ? `${dominantTerm.harmonic}` : "n/a"}
          tone="text-violet-200"
        />
        <StatCard
          label="Spectral energy"
          value={spectralEnergy.toFixed(3)}
          tone="text-emerald-200"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <FourierControls
          config={config}
          speed={speed}
          phase={phase}
          isPlaying={isPlaying}
          showComponents={showComponents}
          showTarget={effectiveShowTarget}
          showTrail={showTrail}
          onPresetChange={handlePresetChange}
          onConfigChange={setConfig}
          onCustomTermsChange={updateCustomTerms}
          onCustomNameChange={updateCustomName}
          onApplyCustomDefinition={applyCustomDefinition}
          customSlots={customSlots}
          onSaveCustomSlot={saveCustomSlot}
          onLoadCustomSlot={loadCustomSlot}
          onClearCustomSlot={clearCustomSlot}
          onSpeedChange={setSpeed}
          onPhaseChange={setPhase}
          onPlayingChange={setIsPlaying}
          onShowComponentsChange={setShowComponents}
          onShowTargetChange={setShowTarget}
          onShowTrailChange={setShowTrail}
        />

        <div className="grid gap-6">
          <EquationCard
            config={config}
            currentValue={currentPoint.y}
            targetValue={effectiveShowTarget ? targetValue : currentPoint.y}
            error={approximationError}
            onConfigChange={setConfig}
            onCustomTermsChange={updateCustomTerms}
            onCustomNameChange={updateCustomName}
            onApplyCustomDefinition={applyCustomDefinition}
          />
          <div className="grid gap-6 2xl:grid-cols-[1.05fr_1.2fr]">
            <EpicycleView
              vectors={vectors}
              currentValue={currentPoint.y}
              showTrail={showTrail}
              trail={trail}
            />
            <WaveformView
              period={config.period}
              phase={phase}
              approximation={approximation}
              target={target}
              currentPoint={currentPoint}
              componentWaves={componentWaves}
              showComponents={showComponents}
              showTarget={effectiveShowTarget}
              showTrail={showTrail}
            />
          </div>
          <SpectrumView terms={terms} phase={phase} />
        </div>
      </div>
    </div>
  );
}
