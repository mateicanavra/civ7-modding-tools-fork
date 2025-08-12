// @ts-nocheck

import { Site } from '/core/scripts/external/TypeScript-Voronoi-master/src/site';
import { Vertex } from '/core/scripts/external/TypeScript-Voronoi-master/src/vertex';
import { Edge } from '/core/scripts/external/TypeScript-Voronoi-master/src/edge';
import { Cell } from '/core/scripts/external/TypeScript-Voronoi-master/src/cell';

export class Diagram {
  site: Site;
  vertices: Vertex[];
  edges: Edge[];
  cells: Cell[];
  execTime: number;

  constructor(site?: Site) {
    this.site = site;
  }
}
