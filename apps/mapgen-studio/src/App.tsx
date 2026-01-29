import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeckGL } from "@deck.gl/react";
import { OrthographicView } from "@deck.gl/core";
import { PathLayer, ScatterplotLayer, PolygonLayer } from "@deck.gl/layers";

type Bounds = [minX: number, minY: number, maxX: number, maxY: number];

type VizScalarFormat = "u8" | "i8" | "u16" | "i16" | "i32" | "f32";

type VizLayerEntryV0 =
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

type VizManifestV0 = {
  version: 0;
  runId: string;
  planFingerprint: string;
  steps: Array<{ stepId: string; phase?: string; stepIndex: number }>;
  layers: VizLayerEntryV0[];
};

type FileMap = Map<string, File>;

function stripRootDirPrefix(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return path;
  return parts.slice(1).join("/");
}

function formatLabel(stepId: string): string {
  return stepId.split(".").slice(-1)[0] ?? stepId;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function axialToPixelPointy(q: number, r: number, size: number): [number, number] {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * 1.5 * r;
  return [x, y];
}

function oddQToAxialR(row: number, colParityBase: number): number {
  const q = colParityBase | 0;
  return row - (q - (q & 1)) / 2;
}

function oddQTileCenter(col: number, row: number, size: number): [number, number] {
  const r = oddQToAxialR(row, col);
  return axialToPixelPointy(col, r, size);
}

function oddQPointFromTileXY(x: number, y: number, size: number): [number, number] {
  const qParityBase = Math.round(x);
  const r = oddQToAxialR(y, qParityBase);
  return axialToPixelPointy(x, r, size);
}

function hexPolygonPointy(center: [number, number], size: number): Array<[number, number]> {
  const [cx, cy] = center;
  const out: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const angle = ((30 + 60 * i) * Math.PI) / 180;
    out.push([cx + size * Math.cos(angle), cy + size * Math.sin(angle)]);
  }
  return out;
}

function boundsForOddQGrid(dims: { width: number; height: number }, size: number): Bounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let y = 0; y < dims.height; y++) {
    for (let x = 0; x < dims.width; x++) {
      const [cx, cy] = oddQTileCenter(x, y, size);
      minX = Math.min(minX, cx - size);
      maxX = Math.max(maxX, cx + size);
      minY = Math.min(minY, cy - size);
      maxY = Math.max(maxY, cy + size);
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return [0, 0, 1, 1];
  }

  return [minX, minY, maxX, maxY];
}

function fitToBounds(bounds: Bounds, viewport: { width: number; height: number }): { target: [number, number, number]; zoom: number } {
  const [minX, minY, maxX, maxY] = bounds;
  const bw = Math.max(1e-6, maxX - minX);
  const bh = Math.max(1e-6, maxY - minY);
  const padding = 0.92;
  const scale = Math.min((viewport.width * padding) / bw, (viewport.height * padding) / bh);
  const zoom = Math.log2(Math.max(1e-6, scale));
  return { target: [(minX + maxX) / 2, (minY + maxY) / 2, 0], zoom };
}

function colorForValue(layerId: string, value: number): [number, number, number, number] {
  if (!Number.isFinite(value)) return [120, 120, 120, 220];

  if (layerId.includes("crust") && layerId.toLowerCase().includes("type")) {
    return value === 1 ? [34, 197, 94, 230] : [37, 99, 235, 230];
  }

  if (layerId.includes("boundaryType")) {
    if (value === 1) return [239, 68, 68, 240];
    if (value === 2) return [59, 130, 246, 240];
    if (value === 3) return [245, 158, 11, 240];
    return [107, 114, 128, 180];
  }

  if (layerId.includes("plate")) {
    // stable hash color for categorical IDs
    const v = (value | 0) >>> 0;
    const r = (v * 97) % 255;
    const g = (v * 57) % 255;
    const b = (v * 23) % 255;
    return [r, g, b, 230];
  }

  // generic 0..1 mapping
  const t = clamp(value, 0, 1);
  const r = Math.round(255 * t);
  const b = Math.round(255 * (1 - t));
  return [r, 80, b, 230];
}

type LegendItem = { label: string; color: [number, number, number, number] };

function legendForLayer(layer: VizLayerEntryV0 | null, stats: { min?: number; max?: number } | null): { title: string; items: LegendItem[]; note?: string } | null {
  if (!layer) return null;
  const id = layer.layerId;

  if (id.endsWith("tileBoundaryType") || id.endsWith("boundaryType") || id.includes("boundaryType")) {
    return {
      title: "Boundary Type",
      items: [
        { label: "0 = none/unknown", color: [107, 114, 128, 180] },
        { label: "1 = convergent", color: [239, 68, 68, 240] },
        { label: "2 = divergent", color: [59, 130, 246, 240] },
        { label: "3 = transform", color: [245, 158, 11, 240] },
      ],
    };
  }

  if (id.includes("crusttiles") || id.includes("crust") && id.toLowerCase().includes("type")) {
    return {
      title: "Crust Type",
      items: [
        { label: "0 = oceanic", color: [37, 99, 235, 230] },
        { label: "1 = continental", color: [34, 197, 94, 230] },
      ],
    };
  }

  if (id.includes("plate") && (id.toLowerCase().includes("id") || id.toLowerCase().includes("plate"))) {
    return {
      title: "Plate IDs",
      items: [
        { label: "categorical (stable hashed color by ID)", color: [148, 163, 184, 220] },
      ],
    };
  }

  if (stats && Number.isFinite(stats.min) && Number.isFinite(stats.max)) {
    const min = stats.min ?? 0;
    const max = stats.max ?? 1;
    return {
      title: "Scalar",
      items: [
        { label: `min = ${min.toFixed(3)}`, color: colorForValue(id, 0) },
        { label: `max = ${max.toFixed(3)}`, color: colorForValue(id, 1) },
      ],
      note: "Values are mapped with a simple palette in V0.",
    };
  }

  return {
    title: "Legend",
    items: [{ label: "no legend available for this layer yet", color: [148, 163, 184, 220] }],
  };
}

function decodeScalarArray(buffer: ArrayBuffer, format: VizScalarFormat): ArrayBufferView {
  switch (format) {
    case "u8":
      return new Uint8Array(buffer);
    case "i8":
      return new Int8Array(buffer);
    case "u16":
      return new Uint16Array(buffer);
    case "i16":
      return new Int16Array(buffer);
    case "i32":
      return new Int32Array(buffer);
    case "f32":
      return new Float32Array(buffer);
  }
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}

async function readFileAsText(file: File): Promise<string> {
  return await file.text();
}

async function loadManifestFromFileMap(fileMap: FileMap): Promise<VizManifestV0> {
  const manifestFile = fileMap.get("manifest.json");
  if (!manifestFile) {
    throw new Error("manifest.json not found. Select the run folder that contains manifest.json.");
  }
  const text = await readFileAsText(manifestFile);
  return JSON.parse(text) as VizManifestV0;
}

export function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });

  const [fileMap, setFileMap] = useState<FileMap | null>(null);
  const [manifest, setManifest] = useState<VizManifestV0 | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedLayerKey, setSelectedLayerKey] = useState<string | null>(null);

  const [viewState, setViewState] = useState<any>({ target: [0, 0, 0], zoom: 0 });
  const [layerStats, setLayerStats] = useState<{ min?: number; max?: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setViewportSize({ width: Math.max(1, rect.width), height: Math.max(1, rect.height) });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const steps = useMemo(() => {
    if (!manifest) return [];
    return [...manifest.steps].sort((a, b) => a.stepIndex - b.stepIndex);
  }, [manifest]);

  const layersForStep = useMemo(() => {
    if (!manifest || !selectedStepId) return [];
    return manifest.layers
      .filter((l) => l.stepId === selectedStepId)
      .map((l) => ({ key: `${l.stepId}::${l.layerId}::${l.kind}`, layer: l }));
  }, [manifest, selectedStepId]);

  const selectedLayer = useMemo(() => {
    if (!layersForStep.length || !selectedLayerKey) return null;
    return layersForStep.find((l) => l.key === selectedLayerKey)?.layer ?? null;
  }, [layersForStep, selectedLayerKey]);

  const setFittedView = useCallback(
    (bounds: Bounds) => {
      const fit = fitToBounds(bounds, viewportSize);
      setViewState((prev: any) => ({ ...prev, ...fit }));
    },
    [viewportSize]
  );

  const openDumpFolder = useCallback(async () => {
    setError(null);
    try {
      const anyWindow = window as any;
      if (typeof anyWindow.showDirectoryPicker === "function") {
        const dirHandle: any = await anyWindow.showDirectoryPicker();
        const files: FileMap = new Map();

        const walk = async (handle: any, prefix: string) => {
          for await (const [name, entry] of handle.entries()) {
            const path = prefix ? `${prefix}/${name}` : name;
            if (entry.kind === "directory") {
              await walk(entry, path);
            } else if (entry.kind === "file") {
              const file = await entry.getFile();
              files.set(path, file);
            }
          }
        };

        await walk(dirHandle, "");
        // If the selected folder is the run folder, manifest.json should be at root.
        // If it was selected with an extra parent dir, allow stripping one leading component.
        const normalized: FileMap = new Map();
        for (const [path, file] of files.entries()) {
          normalized.set(path, file);
          normalized.set(stripRootDirPrefix(path), file);
        }
        setFileMap(normalized);
        const m = await loadManifestFromFileMap(normalized);
        setManifest(m);
        const firstStep = [...m.steps].sort((a, b) => a.stepIndex - b.stepIndex)[0]?.stepId ?? null;
        setSelectedStepId(firstStep);
        setSelectedLayerKey(null);
        setFittedView([0, 0, 1, 1]);
        return;
      }

      // Fallback: directory upload (Chromium via webkitdirectory).
      setError("Your browser does not support folder picking. Use a Chromium-based browser, or enable directory picking.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [setFittedView]);

  const directoryInputRef = useRef<HTMLInputElement | null>(null);
  const onDirectoryFiles = useCallback(async () => {
    setError(null);
    try {
      const input = directoryInputRef.current;
      if (!input?.files) return;
      const files: FileMap = new Map();
      for (const file of Array.from(input.files)) {
        const rel = (file as any).webkitRelativePath ? String((file as any).webkitRelativePath) : file.name;
        files.set(stripRootDirPrefix(rel), file);
      }
      setFileMap(files);
      const m = await loadManifestFromFileMap(files);
      setManifest(m);
      const firstStep = [...m.steps].sort((a, b) => a.stepIndex - b.stepIndex)[0]?.stepId ?? null;
      setSelectedStepId(firstStep);
      setSelectedLayerKey(null);
      setFittedView([0, 0, 1, 1]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [setFittedView]);

  useEffect(() => {
    if (!manifest || !selectedStepId) return;
    const first = manifest.layers
      .filter((l) => l.stepId === selectedStepId)
      .sort((a, b) => a.stepIndex - b.stepIndex)[0];
    if (!first) return;
    const key = `${first.stepId}::${first.layerId}::${first.kind}`;
    setSelectedLayerKey(key);
    if (first.kind === "grid") {
      setFittedView(boundsForOddQGrid(first.dims, 1));
    } else {
      setFittedView(first.bounds);
    }
  }, [manifest, selectedStepId, setFittedView]);

  const deckLayers = useMemo(() => {
    if (!manifest || !fileMap || !selectedLayer) return [];

    const layerId = selectedLayer.layerId;
    const isTileOddQLayer = selectedLayer.kind === "grid" || layerId.startsWith("foundation.plateTopology.");
    const tileSize = 1;

    const loadScalar = async (path: string, format: VizScalarFormat): Promise<ArrayBufferView> => {
      const file = fileMap.get(path);
      if (!file) throw new Error(`Missing file: ${path}`);
      const buf = await readFileAsArrayBuffer(file);
      return decodeScalarArray(buf, format);
    };

    // We keep data in component state via a simple async cache.
    // For V0 (MAPSIZE_HUGE), sizes are small enough to materialize on selection.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    return (async () => {
      setLayerStats(null);

      if (selectedLayer.kind === "grid") {
        const values = await loadScalar(selectedLayer.path, selectedLayer.format);
        const { width, height } = selectedLayer.dims;

        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;

        const tiles: Array<{ polygon: Array<[number, number]>; v: number }> = [];
        const len = width * height;
        for (let i = 0; i < len; i++) {
          const x = i % width;
          const y = (i / width) | 0;
          const v = (values as any)[i] ?? 0;
          const vv = Number(v);
          if (Number.isFinite(vv)) {
            if (vv < min) min = vv;
            if (vv > max) max = vv;
          }

          const center = oddQTileCenter(x, y, tileSize);
          tiles.push({ polygon: hexPolygonPointy(center, tileSize), v: vv });
        }

        if (Number.isFinite(min) && Number.isFinite(max)) setLayerStats({ min, max });

        return [
          new PolygonLayer({
            id: `${layerId}::hex`,
            data: tiles,
            getFillColor: (d) => colorForValue(layerId, d.v),
            getPolygon: (d) => d.polygon,
            stroked: true,
            getLineColor: [17, 24, 39, 220],
            getLineWidth: 1,
            lineWidthUnits: "pixels",
            pickable: true,
          }),
        ];
      }

      if (selectedLayer.kind === "points") {
        const posFile = fileMap.get(selectedLayer.positionsPath);
        if (!posFile) throw new Error(`Missing file: ${selectedLayer.positionsPath}`);
        const posBuf = await readFileAsArrayBuffer(posFile);
        const positions = new Float32Array(posBuf);

        const values =
          selectedLayer.valuesPath && selectedLayer.valueFormat
            ? await loadScalar(selectedLayer.valuesPath, selectedLayer.valueFormat)
            : null;

        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;

        const points: Array<{ x: number; y: number; v: number }> = [];
        const count = (positions.length / 2) | 0;
        for (let i = 0; i < count; i++) {
          const rawX = positions[i * 2] ?? 0;
          const rawY = positions[i * 2 + 1] ?? 0;
          const v = values ? Number((values as any)[i] ?? 0) : 0;
          if (Number.isFinite(v)) {
            if (v < min) min = v;
            if (v > max) max = v;
          }

          const [x, y] = isTileOddQLayer ? oddQPointFromTileXY(rawX, rawY, tileSize) : [rawX, rawY];
          points.push({ x, y, v });
        }

        if (Number.isFinite(min) && Number.isFinite(max)) setLayerStats({ min, max });

        return [
          new ScatterplotLayer({
            id: `${layerId}::points`,
            data: points,
            getPosition: (d) => [d.x, d.y],
            getFillColor: (d) => colorForValue(layerId, d.v),
            radiusUnits: "common",
            getRadius: 0.95,
            pickable: true,
          }),
        ];
      }

      if (selectedLayer.kind === "segments") {
        const segFile = fileMap.get(selectedLayer.segmentsPath);
        if (!segFile) throw new Error(`Missing file: ${selectedLayer.segmentsPath}`);
        const segBuf = await readFileAsArrayBuffer(segFile);
        const seg = new Float32Array(segBuf);

        const values =
          selectedLayer.valuesPath && selectedLayer.valueFormat
            ? await loadScalar(selectedLayer.valuesPath, selectedLayer.valueFormat)
            : null;

        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;

        const segments: Array<{ path: [[number, number], [number, number]]; v: number }> = [];
        const count = (seg.length / 4) | 0;
        for (let i = 0; i < count; i++) {
          const rx0 = seg[i * 4] ?? 0;
          const ry0 = seg[i * 4 + 1] ?? 0;
          const rx1 = seg[i * 4 + 2] ?? 0;
          const ry1 = seg[i * 4 + 3] ?? 0;
          const v = values ? Number((values as any)[i] ?? 0) : 0;
          if (Number.isFinite(v)) {
            if (v < min) min = v;
            if (v > max) max = v;
          }

          const [x0, y0] = isTileOddQLayer ? oddQPointFromTileXY(rx0, ry0, tileSize) : [rx0, ry0];
          const [x1, y1] = isTileOddQLayer ? oddQPointFromTileXY(rx1, ry1, tileSize) : [rx1, ry1];
          segments.push({ path: [[x0, y0], [x1, y1]], v });
        }

        if (Number.isFinite(min) && Number.isFinite(max)) setLayerStats({ min, max });

        return [
          new PathLayer({
            id: `${layerId}::segments`,
            data: segments,
            getPath: (d) => d.path,
            getColor: (d) => colorForValue(layerId, d.v),
            getWidth: 1.5,
            widthUnits: "pixels",
            pickable: true,
          }),
        ];
      }

      return [];
    })() as any;
  }, [manifest, fileMap, selectedLayer]);

  // Resolve async layers into a stable state
  const [resolvedLayers, setResolvedLayers] = useState<any[]>([]);
  useEffect(() => {
    const v = deckLayers as any;
    if (typeof v?.then === "function") {
      v.then(setResolvedLayers).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    } else {
      setResolvedLayers(v);
    }
  }, [deckLayers]);

  useEffect(() => {
    if (!selectedLayer) return;
    if (selectedLayer.kind === "grid") {
      setFittedView(boundsForOddQGrid(selectedLayer.dims, 1));
      return;
    }
    setFittedView(selectedLayer.bounds);
  }, [selectedLayer, setFittedView]);

  const legend = useMemo(() => legendForLayer(selectedLayer, layerStats), [selectedLayer, layerStats]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0b1020", color: "#e5e7eb" }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #1f2937", display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>MapGen Studio</div>
        <div style={{ color: "#9ca3af" }}>Foundation Viz (V0)</div>

        <button
          onClick={openDumpFolder}
          style={{ marginLeft: 12, background: "#111827", color: "#e5e7eb", border: "1px solid #374151", borderRadius: 8, padding: "6px 10px" }}
        >
          Open dump folder
        </button>

        <label style={{ fontSize: 12, color: "#9ca3af" }}>
          or upload folder:
          <input
            ref={directoryInputRef}
            type="file"
            multiple
            onChange={onDirectoryFiles}
            style={{ marginLeft: 8 }}
            {...({ webkitdirectory: "", directory: "" } as any)}
          />
        </label>

        <div style={{ flex: 1 }} />

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>Step</span>
          <select
            value={selectedStepId ?? ""}
            onChange={(e) => setSelectedStepId(e.target.value || null)}
            style={{ background: "#111827", color: "#e5e7eb", border: "1px solid #374151", borderRadius: 8, padding: "6px 8px" }}
            disabled={!steps.length}
          >
            {steps.map((s) => (
              <option key={s.stepId} value={s.stepId}>
                {s.stepIndex} · {formatLabel(s.stepId)}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>Layer</span>
          <select
            value={selectedLayerKey ?? ""}
            onChange={(e) => setSelectedLayerKey(e.target.value || null)}
            style={{ background: "#111827", color: "#e5e7eb", border: "1px solid #374151", borderRadius: 8, padding: "6px 8px", minWidth: 280 }}
            disabled={!layersForStep.length}
          >
            {layersForStep.map((l) => (
              <option key={l.key} value={l.key}>
                {l.layer.layerId} ({l.layer.kind})
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={() => selectedLayer && setFittedView(selectedLayer.bounds)}
          style={{ background: "#111827", color: "#e5e7eb", border: "1px solid #374151", borderRadius: 8, padding: "6px 10px" }}
          disabled={!selectedLayer}
        >
          Fit
        </button>
      </div>

      {error ? (
        <div style={{ padding: 12, background: "#2a0b0b", borderBottom: "1px solid #7f1d1d", color: "#fecaca" }}>
          {error}
        </div>
      ) : null}

      <div ref={containerRef} style={{ flex: 1, position: "relative" }}>
        {manifest ? (
          <DeckGL
            views={new OrthographicView({ id: "ortho" })}
            controller={true}
            viewState={viewState}
            onViewStateChange={({ viewState: vs }: any) => setViewState(vs)}
            layers={resolvedLayers}
          />
        ) : (
          <div style={{ padding: 18, color: "#9ca3af" }}>
            Select a dump folder containing `manifest.json` (e.g. `mods/mod-swooper-maps/dist/visualization/&lt;runId&gt;`).
          </div>
        )}
        <div style={{ position: "absolute", bottom: 10, left: 10, fontSize: 12, color: "#9ca3af", background: "rgba(0,0,0,0.35)", padding: "6px 8px", borderRadius: 8 }}>
          {manifest ? (
            <>
              runId: <span style={{ color: "#e5e7eb" }}>{manifest.runId.slice(0, 12)}…</span>
              {" · "}
              viewport: {Math.round(viewportSize.width)}×{Math.round(viewportSize.height)}
            </>
          ) : (
            <>No dump loaded</>
          )}
        </div>

        {manifest && selectedLayer && legend ? (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              fontSize: 12,
              color: "#e5e7eb",
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.10)",
              padding: "10px 10px",
              borderRadius: 10,
              maxWidth: 360,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{legend.title}</div>
            <div style={{ color: "#9ca3af", marginBottom: 8 }}>
              <div>step: {formatLabel(selectedLayer.stepId)}</div>
              <div>layer: {selectedLayer.layerId} ({selectedLayer.kind})</div>
              {selectedLayer.kind === "grid" ? <div>tile layout: odd-q hex</div> : null}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {legend.items.map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      background: `rgba(${item.color[0]},${item.color[1]},${item.color[2]},${item.color[3] / 255})`,
                      border: "1px solid rgba(255,255,255,0.15)",
                      display: "inline-block",
                    }}
                  />
                  <span style={{ color: "#e5e7eb" }}>{item.label}</span>
                </div>
              ))}
            </div>
            {legend.note ? <div style={{ marginTop: 8, color: "#9ca3af" }}>{legend.note}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
