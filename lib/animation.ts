export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function wrapUnitInterval(value: number) {
  return ((value % 1) + 1) % 1;
}

export function advanceLoopTime(
  currentPhase: number,
  deltaMs: number,
  speed: number,
) {
  const nextPhase = currentPhase + (deltaMs / 1000) * speed;
  return wrapUnitInterval(nextPhase);
}

export function formatPhase(phase: number, period: number) {
  return `${(phase * period).toFixed(2)} / ${period.toFixed(2)}`;
}
