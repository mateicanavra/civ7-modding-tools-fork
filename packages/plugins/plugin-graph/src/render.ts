import { Graphviz } from '@hpcc-js/wasm';

export async function renderSvg(dot: string, engine: 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' = 'dot') {
  const gv = await Graphviz.load();
  return gv.layout(dot, 'svg', engine);
}
