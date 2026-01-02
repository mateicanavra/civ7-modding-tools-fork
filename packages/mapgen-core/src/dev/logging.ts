/**
 * Developer logging utilities.
 *
 * All functions are no-op unless trace verbosity is enabled.
 *
 * @module dev/logging
 */

import type { TraceScope } from "@mapgen/trace/index.js";

type TraceEventPayload = {
  type: string;
  [key: string]: unknown;
};

function emitTrace(
  trace: TraceScope | null | undefined,
  payload: TraceEventPayload
): void {
  if (!trace?.isVerbose) return;
  trace.event(() => payload);
}

/**
 * Emit a trace event for ad-hoc logs.
 */
export function devLog(trace: TraceScope | null | undefined, ...args: unknown[]): void {
  emitTrace(trace, { type: "dev.log", args });
}

/**
 * Emit a trace event tagged by a legacy flag label.
 */
export function devLogIf(
  trace: TraceScope | null | undefined,
  flag: string,
  ...args: unknown[]
): void {
  emitTrace(trace, { type: "dev.log", flag, args });
}

/**
 * Emit a trace event with a custom prefix label.
 */
export function devLogPrefixed(
  trace: TraceScope | null | undefined,
  prefix: string,
  ...args: unknown[]
): void {
  emitTrace(trace, { type: "dev.log", prefix, args });
}

/**
 * Emit a warning trace event.
 */
export function devWarn(trace: TraceScope | null | undefined, ...args: unknown[]): void {
  emitTrace(trace, { type: "dev.warn", args });
}

/**
 * Emit an error trace event.
 */
export function devError(trace: TraceScope | null | undefined, ...args: unknown[]): void {
  emitTrace(trace, { type: "dev.error", args });
}

/**
 * Emit a JSON-ish payload trace event.
 */
export function devLogJson(
  trace: TraceScope | null | undefined,
  label: string,
  data: unknown
): void {
  emitTrace(trace, { type: "dev.json", label, data });
}

/**
 * Emit a multi-line payload for ASCII grids or summaries.
 */
export function devLogLines(
  trace: TraceScope | null | undefined,
  lines: string[],
  prefix?: string
): void {
  emitTrace(trace, { type: "dev.lines", prefix, lines });
}
