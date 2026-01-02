/**
 * Timing utilities for performance measurement.
 *
 * All functions are no-op (pass-through) unless trace verbosity is enabled.
 *
 * @module dev/timing
 */

import type { TraceScope } from "@mapgen/trace/index.js";

/** Token returned by timeStart for use with timeEnd */
export interface TimingToken {
  label: string;
  t0: number;
}

/**
 * Get current time in milliseconds.
 * Uses performance.now() when available for high resolution.
 */
function nowMs(): number {
  try {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
  } catch {
    // Fallback to Date.now()
  }
  return Date.now();
}

/**
 * Format milliseconds for display.
 */
function formatMs(ms: number): string {
  return `${ms.toFixed(2)} ms`;
}

function emitTiming(trace: TraceScope | null | undefined, label: string, durationMs: number): void {
  if (!trace?.isVerbose) return;
  trace.event(() => ({
    type: "dev.timing",
    label,
    durationMs,
    formatted: formatMs(durationMs),
  }));
}

/**
 * Time a synchronous section and log duration.
 * No-op (just runs fn) if LOG_TIMING is disabled.
 *
 * @example
 * const result = timeSection("Layer: addMountains", () => {
 *   return addMountains(width, height);
 * });
 */
export function timeSection<T>(
  trace: TraceScope | null | undefined,
  label: string,
  fn: () => T
): T {
  if (!trace?.isVerbose) return fn();

  const t0 = nowMs();
  try {
    return fn();
  } finally {
    const dt = nowMs() - t0;
    emitTiming(trace, label, dt);
  }
}

/**
 * Start a timing span. Returns a token to pass to timeEnd.
 * Returns null if LOG_TIMING is disabled.
 *
 * @example
 * const token = timeStart("Foundation initialization");
 * // ... do work ...
 * timeEnd(token);
 */
export function timeStart(
  trace: TraceScope | null | undefined,
  label: string
): TimingToken | null {
  if (!trace?.isVerbose) return null;
  return { label, t0: nowMs() };
}

/**
 * End a timing span started by timeStart.
 * Safe to call with null (no-op).
 *
 * @returns Duration in milliseconds, or 0 if token was null
 */
export function timeEnd(
  trace: TraceScope | null | undefined,
  token: TimingToken | null
): number {
  if (!token) return 0;
  const dt = nowMs() - token.t0;
  emitTiming(trace, token.label, dt);
  return dt;
}

/**
 * Simple timing utility that returns elapsed ms without logging.
 * Useful for accumulating timing data.
 */
export function measureMs<T>(fn: () => T): { result: T; durationMs: number } {
  const t0 = nowMs();
  const result = fn();
  const durationMs = nowMs() - t0;
  return { result, durationMs };
}
