import { Graphviz } from "@hpcc-js/wasm";
export { graphToDot, graphToJson } from "./graph";
export { buildGraphViewerHtml } from "./viewer";

export interface ExploreOptions {
  rootDir: string;
  seed: string;
  outDir: string;
  engine?: "dot" | "neato" | "fdp" | "sfdp" | "circo" | "twopi";
  emitHtml?: boolean;
}

export async function renderSvg(dot: string, engine: ExploreOptions["engine"] = "dot") {
  const gv = await Graphviz.load();
  return gv.layout(dot, "svg", engine!);
}



export * from "./types";
export * from "./graph";
// TODO: re-export crawler APIs after porting off CLI internals
