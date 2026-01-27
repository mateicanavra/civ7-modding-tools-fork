import type { ComputeFlowRoutingTypes } from "../types.js";

/**
 * Ensures flow-routing inputs match the expected map size.
 */
export function validateFlowRoutingInputs(
  input: ComputeFlowRoutingTypes["input"]
): { size: number; elevation: Int16Array; landMask: Uint8Array } {
  const { width, height } = input;
  const size = Math.max(0, (width | 0) * (height | 0));
  const elevation = input.elevation as Int16Array;
  const landMask = input.landMask as Uint8Array;
  if (elevation.length !== size || landMask.length !== size) {
    throw new Error("[FlowRouting] Input tensors must match width*height.");
  }
  return { size, elevation, landMask };
}

/**
 * Computes flow accumulation from `flowDir` using a topological queue pass.
 */
export function computeFlowAccumulation(
  landMask: Uint8Array,
  flowDir: Int32Array
): Float32Array {
  const size = landMask.length;

  const flowAccum = new Float32Array(size);
  const receiver = new Int32Array(size);
  for (let i = 0; i < size; i++) receiver[i] = -1;

  let landCount = 0;
  for (let i = 0; i < size; i++) {
    if (landMask[i] !== 1) {
      flowAccum[i] = 0;
      continue;
    }
    landCount++;
    flowAccum[i] = 1;
    const raw = flowDir[i] ?? -1;
    if (raw >= 0 && raw < size && landMask[raw] === 1) receiver[i] = raw;
  }

  const indegree = new Int32Array(size);
  for (let i = 0; i < size; i++) {
    const r = receiver[i];
    if (r >= 0) indegree[r] = (indegree[r] ?? 0) + 1;
  }

  const queue = new Int32Array(size);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < size; i++) {
    if (landMask[i] !== 1) continue;
    if (indegree[i] === 0) queue[tail++] = i;
  }

  let processed = 0;
  while (head < tail) {
    const i = queue[head++]!;
    processed++;
    const r = receiver[i]!;
    if (r < 0) continue;
    flowAccum[r] = (flowAccum[r] ?? 0) + (flowAccum[i] ?? 0);
    indegree[r] = (indegree[r] ?? 0) - 1;
    if (indegree[r] === 0) queue[tail++] = r;
  }

  if (processed < landCount) {
    // Defensive fallback for residual cycles: keep only local accumulation for those tiles.
    for (let i = 0; i < size; i++) {
      if (landMask[i] !== 1) continue;
      if (indegree[i] > 0) flowAccum[i] = 1;
    }
  }

  return flowAccum;
}
