/**
 * Timing utilities for performance measurement.
 *
 * All functions are no-op (pass-through) when DEV.LOG_TIMING is disabled.
 *
 * @module dev/timing
 */

import { isDevEnabled } from "./flags.js";

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

/**
 * Safe console.log for timing output.
 */
function logTiming(message: string): void {
  try {
    console.log(message);
  } catch {
    // Swallow errors
  }
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
export function timeSection<T>(label: string, fn: () => T): T {
  if (!isDevEnabled("LOG_TIMING")) {
    return fn();
  }

  const t0 = nowMs();
  try {
    return fn();
  } finally {
    const dt = nowMs() - t0;
    logTiming(`[DEV][time] ${label}: ${formatMs(dt)}`);
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
export function timeStart(label: string): TimingToken | null {
  if (!isDevEnabled("LOG_TIMING")) {
    return null;
  }
  return { label, t0: nowMs() };
}

/**
 * End a timing span started by timeStart.
 * Safe to call with null (no-op).
 *
 * @returns Duration in milliseconds, or 0 if token was null
 */
export function timeEnd(token: TimingToken | null): number {
  if (!token) return 0;
  const dt = nowMs() - token.t0;
  logTiming(`[DEV][time] ${token.label}: ${formatMs(dt)}`);
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
