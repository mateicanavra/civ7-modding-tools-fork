// @ts-nocheck

import { Vertex } from '/core/scripts/external/TypeScript-Voronoi-master/src/vertex';
import { Edge } from '/core/scripts/external/TypeScript-Voronoi-master/src/edge';
import { Site } from '/core/scripts/external/TypeScript-Voronoi-master/src/site';
import { Halfedge } from '/core/scripts/external/TypeScript-Voronoi-master/src/halfedge';

export class Cell {
  site: Site;
  halfedges: Halfedge[];
  closeMe: boolean;

  constructor(site: Site) {
    this.site = site;
    this.halfedges = [];
    this.closeMe = false;
  }

  init(site: Site): Cell {
    this.site = site;
    this.halfedges = [];
    this.closeMe = false;
    return this;
  }

  prepareHalfedges() {
    let halfedges: Halfedge[] = this.halfedges;
    let iHalfedge: number = halfedges.length;
    let edge: Edge;

    // get rid of unused halfedges
    // rhill 2011-05-27: Keep it simple, no point here in trying
    // to be fancy: dangling edges are a typically a minority.
    while (iHalfedge--) {
      edge = halfedges[iHalfedge].edge;
      if (!edge.vb || !edge.va) {
        halfedges.splice(iHalfedge, 1);
      }
    }

    // rhill 2011-05-26: I tried to use a binary search at insertion
    // time to keep the array sorted on-the-fly (in Cell.addHalfedge()).
    // There was no real benefits in doing so, performance on
    // Firefox 3.6 was improved marginally, while performance on
    // Opera 11 was penalized marginally.
    halfedges.sort((a, b: Halfedge) => {
      return b.angle - a.angle;
    });

    return halfedges.length;
  }


  // Return a list of the neighbor Ids
  getNeighborIds() {
    let neighbors = [];
    let iHalfedge: number = this.halfedges.length;
    let edge: Edge;

    while (iHalfedge--) {
      edge = this.halfedges[iHalfedge].edge;
      if (edge.lSite !== null && edge.lSite.id != this.site.id) {
        neighbors.push(edge.lSite.id);
      } else if (edge.rSite !== null && edge.rSite.id != this.site.id) {
        neighbors.push(edge.rSite.id);
      }
    }

    return neighbors;
  };


  // Compute bounding box
  //
  getBbox() {
    let halfedges: Halfedge[] = this.halfedges;
    let iHalfedge: number = halfedges.length;
    let xmin = Infinity;
    let ymin = Infinity;
    let xmax = -Infinity;
    let ymax = -Infinity;
    let v, vx, vy;

    while (iHalfedge--) {
      v = halfedges[iHalfedge].getStartpoint();
      vx = v.x;
      vy = v.y;
      if (vx < xmin) {
        xmin = vx;
      }
      if (vy < ymin) {
        ymin = vy;
      }
      if (vx > xmax) {
        xmax = vx;
      }
      if (vy > ymax) {
        ymax = vy;
      }
      // we dont need to take into account end point,
      // since each end point matches a start point
    }

    return {
      x: xmin,
      y: ymin,
      width: xmax - xmin,
      height: ymax - ymin
    };
  }


  // Return whether a point is inside, on, or outside the cell:
  //   -1: point is outside the perimeter of the cell
  //    0: point is on the perimeter of the cell
  //    1: point is inside the perimeter of the cell
  //
  pointIntersection(x, y: number): number {
    // Check if point in polygon. Since all polygons of a Voronoi
    // diagram are convex, then:
    // http://paulbourke.net/geometry/polygonmesh/
    // Solution 3 (2D):
    //   "If the polygon is convex then one can consider the polygon
    //   "as a 'path' from the first vertex. A point is on the interior
    //   "of this polygons if it is always on the same side of all the
    //   "line segments making up the path. ...
    //   "(y - y0) (x1 - x0) - (x - x0) (y1 - y0)
    //   "if it is less than 0 then P is to the right of the line segment,
    //   "if greater than 0 it is to the left, if equal to 0 then it lies
    //   "on the line segment"
    let halfedges: Halfedge[] = this.halfedges;
    let iHalfedge: number = halfedges.length;
    let halfedge: Halfedge;
    let p0, p1: Vertex;
    let r: number;

    while (iHalfedge--) {
      halfedge = halfedges[iHalfedge];
      p0 = halfedge.getStartpoint();
      p1 = halfedge.getEndpoint();
      r = (y - p0.y) * (p1.x - p0.x) - (x - p0.x) * (p1.y - p0.y);
      if (!r) {
        return 0;
      }
      if (r > 0) {
        return -1;
      }
    }

    return 1;
  }

}
