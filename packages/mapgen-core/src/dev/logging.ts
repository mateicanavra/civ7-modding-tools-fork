/**
 * Developer logging utilities.
 *
 * All functions are no-op when DEV.ENABLED is false.
 *
 * @module dev/logging
 */

import { DEV, isDevEnabled, type DevFlagKey } from "./flags.js";

/** Default log prefix */
const LOG_PREFIX = "[DEV]";

/**
 * Safe console.log wrapper. No-op if DEV.ENABLED is false.
 */
export function devLog(...args: unknown[]): void {
  if (!DEV.ENABLED) return;
  try {
    console.log(LOG_PREFIX, ...args);
  } catch {
    // Swallow errors in logging
  }
}

/**
 * Conditional console.log for a specific flag.
 * No-op if flag is disabled or master switch is off.
 */
export function devLogIf(flag: DevFlagKey, ...args: unknown[]): void {
  if (!isDevEnabled(flag)) return;
  try {
    console.log(`${LOG_PREFIX}[${flag}]`, ...args);
  } catch {
    // Swallow errors in logging
  }
}

/**
 * Log with a custom prefix. No-op if DEV.ENABLED is false.
 */
export function devLogPrefixed(prefix: string, ...args: unknown[]): void {
  if (!DEV.ENABLED) return;
  try {
    console.log(`${LOG_PREFIX}[${prefix}]`, ...args);
  } catch {
    // Swallow errors in logging
  }
}

/**
 * Log a warning. No-op if DEV.ENABLED is false.
 */
export function devWarn(...args: unknown[]): void {
  if (!DEV.ENABLED) return;
  try {
    console.warn(LOG_PREFIX, ...args);
  } catch {
    // Swallow errors in logging
  }
}

/**
 * Log an error. Always logs (errors are important even in production).
 */
export function devError(...args: unknown[]): void {
  try {
    console.error(LOG_PREFIX, ...args);
  } catch {
    // Swallow errors in logging
  }
}

/**
 * Log a JSON-serialized object with a label.
 * Useful for compact structured output.
 */
export function devLogJson(label: string, data: unknown): void {
  if (!DEV.ENABLED) return;
  try {
    console.log(`${LOG_PREFIX}[${label}]`, JSON.stringify(data));
  } catch {
    // Swallow errors in logging
  }
}

/**
 * Log multiple lines (e.g., ASCII grids).
 * Each line is logged separately for readability.
 */
export function devLogLines(lines: string[], prefix?: string): void {
  if (!DEV.ENABLED) return;
  const pfx = prefix ? `${LOG_PREFIX}[${prefix}]` : LOG_PREFIX;
  try {
    for (const line of lines) {
      console.log(pfx, line);
    }
  } catch {
    // Swallow errors in logging
  }
}
