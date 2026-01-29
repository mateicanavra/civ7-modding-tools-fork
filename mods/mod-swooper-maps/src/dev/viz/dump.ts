import type { TraceEvent, TraceSink, TraceScope } from "@swooper/mapgen-core";
import type { VizDumper, VizLayerKind, VizScalarFormat } from "@swooper/mapgen-core";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

type Bounds = [minX: number, minY: number, maxX: number, maxY: number];

export type VizManifestV0 = {
  version: 0;
  runId: string;
  planFingerprint: string;
  steps: Array<{ stepId: string; phase?: string; stepIndex: number }>;
  layers: VizLayerEntryV0[];
};

export type VizLayerEntryV0 =
  | {
      kind: "grid";
      layerId: string;
      stepId: string;
      phase?: string;
      stepIndex: number;
      format: VizScalarFormat;
      dims: { width: number; height: number };
      path: string;
      bounds: Bounds;
    }
  | {
      kind: "points";
      layerId: string;
      stepId: string;
      phase?: string;
      stepIndex: number;
      count: number;
      positionsPath: string;
      valuesPath?: string;
      valueFormat?: VizScalarFormat;
      bounds: Bounds;
    }
  | {
      kind: "segments";
      layerId: string;
      stepId: string;
      phase?: string;
      stepIndex: number;
      count: number;
      segmentsPath: string;
      valuesPath?: string;
      valueFormat?: VizScalarFormat;
      bounds: Bounds;
    };

type LayerDumpPayloadV0 =
  | ({
      type: "layer.dump";
      kind: VizLayerKind;
      layerId: string;
      bounds: Bounds;
    } & (
      | { kind: "grid"; format: VizScalarFormat; dims: { width: number; height: number }; path: string }
      | {
          kind: "points";
          count: number;
          positionsPath: string;
          valuesPath?: string;
          valueFormat?: VizScalarFormat;
        }
      | {
          kind: "segments";
          count: number;
          segmentsPath: string;
          valuesPath?: string;
          valueFormat?: VizScalarFormat;
        }
    ));

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+)|(-+$)/g, "");
}

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function boundsFromPositions(positions: Float32Array): Bounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let i = 0; i + 1 < positions.length; i += 2) {
    const x = positions[i]!;
    const y = positions[i + 1]!;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return [0, 0, 1, 1];
  }

  return [minX, minY, maxX, maxY];
}

function boundsFromSegments(segments: Float32Array): Bounds {
  // segments is [x0,y0,x1,y1,...] pairs; treat as positions list
  const positions = new Float32Array((segments.length / 2) | 0);
  for (let i = 0; i < positions.length; i++) {
    positions[i] = segments[i]!;
  }
  return boundsFromPositions(positions);
}

function writeBinary(path: string, view: ArrayBufferView): void {
  const buffer = Buffer.from(view.buffer, view.byteOffset, view.byteLength);
  writeFileSync(path, buffer);
}

function resolveRunDir(outputRoot: string, runId: string): string {
  return join(outputRoot, runId);
}

function resolveDataDir(outputRoot: string, runId: string): string {
  return join(resolveRunDir(outputRoot, runId), "data");
}

export function createTraceDumpSink(options: { outputRoot: string }): TraceSink {
  const { outputRoot } = options;

  const stepIndexById = new Map<string, number>();
  let nextStepIndex = 0;

  const manifestByRun = new Map<string, VizManifestV0>();

  const emit = (event: TraceEvent): void => {
    try {
      const runDir = resolveRunDir(outputRoot, event.runId);
      const dataDir = resolveDataDir(outputRoot, event.runId);
      ensureDir(dataDir);

      appendFileSync(join(runDir, "trace.jsonl"), `${JSON.stringify(event)}\n`);

      let manifest = manifestByRun.get(event.runId);
      if (!manifest) {
        manifest = {
          version: 0,
          runId: event.runId,
          planFingerprint: event.planFingerprint,
          steps: [],
          layers: [],
        };
        manifestByRun.set(event.runId, manifest);
      }

      if (event.kind === "step.start" && event.stepId) {
        if (!stepIndexById.has(event.stepId)) {
          const stepIndex = nextStepIndex++;
          stepIndexById.set(event.stepId, stepIndex);
          manifest.steps.push({ stepId: event.stepId, phase: event.phase, stepIndex });
          writeFileSync(join(runDir, "manifest.json"), JSON.stringify(manifest, null, 2));
        }
        return;
      }

      if (event.kind !== "step.event" || !event.stepId) return;
      const data = event.data;
      if (!isPlainObject(data)) return;
      if (data.type !== "layer.dump") return;

      const payload = data as unknown as LayerDumpPayloadV0;
      const stepIndex = stepIndexById.get(event.stepId) ?? -1;

      const base = {
        kind: payload.kind,
        layerId: payload.layerId,
        stepId: event.stepId,
        phase: event.phase,
        stepIndex,
        bounds: payload.bounds,
      } as const;

      let entry: VizLayerEntryV0 | null = null;

      if (payload.kind === "grid") {
        entry = {
          ...base,
          kind: "grid",
          format: payload.format,
          dims: payload.dims,
          path: payload.path,
        };
      } else if (payload.kind === "points") {
        entry = {
          ...base,
          kind: "points",
          count: payload.count,
          positionsPath: payload.positionsPath,
          valuesPath: payload.valuesPath,
          valueFormat: payload.valueFormat,
        };
      } else if (payload.kind === "segments") {
        entry = {
          ...base,
          kind: "segments",
          count: payload.count,
          segmentsPath: payload.segmentsPath,
          valuesPath: payload.valuesPath,
          valueFormat: payload.valueFormat,
        };
      }

      if (!entry) return;
      manifest.layers.push(entry);
      writeFileSync(join(runDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    } catch {
      // tracing/diagnostics must never alter execution flow
    }
  };

  return { emit };
}

export function createVizDumper(options: { outputRoot: string }): VizDumper {
  const { outputRoot } = options;

  const dumpGrid: VizDumper["dumpGrid"] = (trace, layer) => {
    if (!trace.isVerbose) return;
    if (!trace.runId) return;

    try {
      const runDir = resolveRunDir(outputRoot, trace.runId);
      const dataDir = resolveDataDir(outputRoot, trace.runId);
      ensureDir(dataDir);

      const key = layer.fileKey ? `__${slugify(layer.fileKey)}` : "";
      const fileBase = `${slugify(layer.layerId)}${key}`;
      const relPath = `data/${fileBase}.bin`;
      const absPath = join(runDir, relPath);

      writeBinary(absPath, layer.values);

      const { width, height } = layer.dims;
      const bounds: Bounds = [0, 0, width, height];

      trace.event(() => ({
        type: "layer.dump",
        kind: "grid",
        layerId: layer.layerId,
        format: layer.format,
        dims: layer.dims,
        path: relPath,
        bounds,
      }));
    } catch {
      // diagnostics must not break generation
    }
  };

  const dumpPoints: VizDumper["dumpPoints"] = (trace, layer) => {
    if (!trace.isVerbose) return;
    if (!trace.runId) return;

    try {
      const runDir = resolveRunDir(outputRoot, trace.runId);
      const dataDir = resolveDataDir(outputRoot, trace.runId);
      ensureDir(dataDir);

      const key = layer.fileKey ? `__${slugify(layer.fileKey)}` : "";
      const fileBase = `${slugify(layer.layerId)}${key}`;
      const posRel = `data/${fileBase}__pos.bin`;
      const valRel = layer.values ? `data/${fileBase}__val.bin` : undefined;

      writeBinary(join(runDir, posRel), layer.positions);
      if (layer.values && valRel) {
        writeBinary(join(runDir, valRel), layer.values);
      }

      const bounds = boundsFromPositions(layer.positions);
      trace.event(() => ({
        type: "layer.dump",
        kind: "points",
        layerId: layer.layerId,
        count: (layer.positions.length / 2) | 0,
        positionsPath: posRel,
        valuesPath: valRel,
        valueFormat: layer.valueFormat,
        bounds,
      }));
    } catch {
      // diagnostics must not break generation
    }
  };

  const dumpSegments: VizDumper["dumpSegments"] = (trace, layer) => {
    if (!trace.isVerbose) return;
    if (!trace.runId) return;

    try {
      const runDir = resolveRunDir(outputRoot, trace.runId);
      const dataDir = resolveDataDir(outputRoot, trace.runId);
      ensureDir(dataDir);

      const key = layer.fileKey ? `__${slugify(layer.fileKey)}` : "";
      const fileBase = `${slugify(layer.layerId)}${key}`;
      const segRel = `data/${fileBase}__seg.bin`;
      const valRel = layer.values ? `data/${fileBase}__val.bin` : undefined;

      writeBinary(join(runDir, segRel), layer.segments);
      if (layer.values && valRel) {
        writeBinary(join(runDir, valRel), layer.values);
      }

      const bounds = boundsFromSegments(layer.segments);
      trace.event(() => ({
        type: "layer.dump",
        kind: "segments",
        layerId: layer.layerId,
        count: (layer.segments.length / 4) | 0,
        segmentsPath: segRel,
        valuesPath: valRel,
        valueFormat: layer.valueFormat,
        bounds,
      }));
    } catch {
      // diagnostics must not break generation
    }
  };

  return { outputRoot, dumpGrid, dumpPoints, dumpSegments };
}

