// @ts-nocheck

import { Vertex } from '/core/scripts/external/TypeScript-Voronoi-master/src/vertex';
import { Site } from '/core/scripts/external/TypeScript-Voronoi-master/src/site';
import { Edge } from '/core/scripts/external/TypeScript-Voronoi-master/src/edge';

export class Halfedge {
  site: Site;
  edge: Edge;
  angle: number;

  constructor(edge: Edge, lSite, rSite: Site) {
    this.site = lSite;
    this.edge = edge;

    // 'angle' is a value to be used for properly sorting the
    // halfsegments counterclockwise. By convention, we will
    // use the angle of the line defined by the 'site to the left'
    // to the 'site to the right'.
    // However, border edges have no 'site to the right': thus we
    // use the angle of line perpendicular to the halfsegment (the
    // edge should have both end points defined in such case.)
    if (rSite) {
      this.angle = Math.atan2(rSite.y - lSite.y, rSite.x - lSite.x);
    } else {
      let va = edge.va;
      let vb = edge.vb;

      // rhill 2011-05-31: used to call getStartpoint()/getEndpoint(),
      // but for performance purpose, these are expanded in place here.
      this.angle = edge.lSite === lSite ?
        Math.atan2(vb.x - va.x, va.y - vb.y) :
        Math.atan2(va.x - vb.x, vb.y - va.y);
    }
  }

  getStartpoint(): Vertex {
    return this.edge.lSite === this.site ? this.edge.va : this.edge.vb;
  };

  getEndpoint(): Vertex {
    return this.edge.lSite === this.site ? this.edge.vb : this.edge.va;
  };

}
