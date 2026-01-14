export function wrapDeltaPeriodic(dx: number, span: number): number {
  if (!Number.isFinite(dx) || !Number.isFinite(span) || span <= 0) return dx;
  const half = span * 0.5;
  if (dx > half) return dx - span;
  if (dx < -half) return dx + span;
  return dx;
}

export function wrapAbsDeltaPeriodic(dx: number, span: number): number {
  return Math.abs(wrapDeltaPeriodic(dx, span));
}

