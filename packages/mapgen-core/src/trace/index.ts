import "../polyfills/text-encoder";

export type TraceLevel = "off" | "basic" | "verbose";

export interface TraceConfig {
  enabled?: boolean;
  steps?: Record<string, TraceLevel>;
}

export interface TraceEvent {
  tsMs: number;
  runId: string;
  planFingerprint: string;
  kind: "run.start" | "run.finish" | "step.start" | "step.finish" | "step.event";
  stepId?: string;
  phase?: string;
  durationMs?: number;
  success?: boolean;
  error?: string;
  data?: unknown;
}

export interface TraceSink {
  emit(event: TraceEvent): void;
}

export interface TraceStepMeta {
  stepId: string;
  phase?: string;
}

export interface TraceScope {
  runId: string;
  planFingerprint: string;
  level: TraceLevel;
  isEnabled: boolean;
  isVerbose: boolean;
  event: (data?: unknown | (() => unknown)) => void;
}

export interface TraceSession {
  enabled: boolean;
  runId: string;
  planFingerprint: string;
  emitRunStart: () => void;
  emitRunFinish: (result: { success: boolean; error?: string }) => void;
  emitStepStart: (meta: TraceStepMeta) => void;
  emitStepFinish: (
    meta: TraceStepMeta & { durationMs?: number; success?: boolean; error?: string }
  ) => void;
  createStepScope: (meta: TraceStepMeta) => TraceScope;
}

const NOOP_SCOPE: TraceScope = Object.freeze({
  runId: "",
  planFingerprint: "",
  level: "off",
  isEnabled: false,
  isVerbose: false,
  event: () => undefined,
});

function nowMs(): number {
  try {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
  } catch {
    // ignore
  }
  return Date.now();
}

function safeEmit(sink: TraceSink, event: TraceEvent): void {
  try {
    sink.emit(event);
  } catch {
    // tracing should never alter execution flow
  }
}

export function createNoopTraceScope(): TraceScope {
  return NOOP_SCOPE;
}

export function createNoopTraceSession(): TraceSession {
  return {
    enabled: false,
    runId: "",
    planFingerprint: "",
    emitRunStart: () => undefined,
    emitRunFinish: () => undefined,
    emitStepStart: () => undefined,
    emitStepFinish: () => undefined,
    createStepScope: () => NOOP_SCOPE,
  };
}

export function createConsoleTraceSink(): TraceSink {
  return {
    emit: (event) => {
      console.log("[trace]", event);
    },
  };
}

export function resolveTraceLevel(
  config: TraceConfig | null | undefined,
  stepId: string
): TraceLevel {
  if (!isTraceEnabled(config)) return "off";
  const level = config?.steps?.[stepId];
  return level ?? "basic";
}

export interface TraceSessionOptions {
  runId: string;
  planFingerprint: string;
  config?: TraceConfig | null;
  sink?: TraceSink | null;
  nowMs?: () => number;
}

export function createTraceSession(options: TraceSessionOptions): TraceSession {
  const { runId, planFingerprint } = options;
  const sink = options.sink ?? null;
  const config = options.config ?? null;
  const enabled = isTraceEnabled(config) && Boolean(sink);

  if (!enabled || !sink) {
    return createNoopTraceSession();
  }

  const now = options.nowMs ?? nowMs;
  const emit = (event: Omit<TraceEvent, "tsMs" | "runId" | "planFingerprint">): void => {
    safeEmit(sink, {
      tsMs: now(),
      runId,
      planFingerprint,
      ...event,
    });
  };

  const emitRunStart = (): void => {
    emit({ kind: "run.start" });
  };

  const emitRunFinish = (result: { success: boolean; error?: string }): void => {
    emit({
      kind: "run.finish",
      success: result.success,
      error: result.error,
    });
  };

  const emitStepStart = (meta: TraceStepMeta): void => {
    if (resolveTraceLevel(config, meta.stepId) === "off") return;
    emit({ kind: "step.start", ...meta });
  };

  const emitStepFinish = (
    meta: TraceStepMeta & { durationMs?: number; success?: boolean; error?: string }
  ): void => {
    if (resolveTraceLevel(config, meta.stepId) === "off") return;
    emit({ kind: "step.finish", ...meta });
  };

  const createStepScope = (meta: TraceStepMeta): TraceScope => {
    const level = resolveTraceLevel(config, meta.stepId);
    const isEnabled = level !== "off";
    const isVerbose = level === "verbose";

    const event = (data?: unknown | (() => unknown)): void => {
      if (!isVerbose) return;
      const payload = typeof data === "function" ? data() : data;
      emit({ kind: "step.event", ...meta, data: payload });
    };

    return { runId, planFingerprint, level, isEnabled, isVerbose, event };
  };

  return {
    enabled: true,
    runId,
    planFingerprint,
    emitRunStart,
    emitRunFinish,
    emitStepStart,
    emitStepFinish,
    createStepScope,
  };
}

function isTraceEnabled(config: TraceConfig | null | undefined): boolean {
  if (!config) return false;
  if (config.enabled !== undefined) return config.enabled;
  return Boolean(config.steps && Object.keys(config.steps).length > 0);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function canonicalize(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }

  if (value instanceof Map) {
    const entries: Array<[string, unknown]> = Array.from(value.entries()).map(([key, entry]) => [
      String(key),
      canonicalize(entry),
    ]);
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries;
  }

  if (value instanceof Set) {
    const entries = Array.from(value.values()).map((entry) => canonicalize(entry));
    entries.sort((a, b) => stableKey(a).localeCompare(stableKey(b)));
    return entries;
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    const keys = Object.keys(value).sort((a, b) => a.localeCompare(b));
    for (const key of keys) {
      const entry = value[key];
      if (entry === undefined) continue;
      result[key] = canonicalize(entry);
    }
    return result;
  }

  return value;
}

function stableKey(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(canonicalize(value)) ?? String(value);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
  0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
  0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
  0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
  0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
  0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
  0xc67178f2,
];

function rotr(value: number, shift: number): number {
  return (value >>> shift) | (value << (32 - shift));
}

export function sha256Hex(input: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  const bitLen = BigInt(bytes.length) * 8n;
  const paddedLength = ((bytes.length + 9 + 63) >> 6) << 6;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  const lengthPos = paddedLength - 8;
  view.setUint32(lengthPos, Number(bitLen >> 32n), false);
  view.setUint32(lengthPos + 4, Number(bitLen & 0xffffffffn), false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const base = offset + i * 4;
      w[i] =
        (padded[base] << 24) |
        (padded[base + 1] << 16) |
        (padded[base + 2] << 8) |
        padded[base + 3];
    }

    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const toHex = (value: number): string => value.toString(16).padStart(8, "0");

  return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h5)}${toHex(
    h6
  )}${toHex(h7)}`;
}
