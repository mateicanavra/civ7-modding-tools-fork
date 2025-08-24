// @ts-nocheck

import { Site } from '/core/scripts/external/TypeScript-Voronoi-master/src/site';
import { Vertex } from '/core/scripts/external/TypeScript-Voronoi-master/src/vertex';

export class Edge {
  lSite: Site;
  rSite: Site;
  va: Vertex;
  vb: Vertex;

  constructor(lSite, rSite: Site) {
    this.lSite = lSite;
    this.rSite = rSite;
    this.va = this.vb = null;
  }
}

