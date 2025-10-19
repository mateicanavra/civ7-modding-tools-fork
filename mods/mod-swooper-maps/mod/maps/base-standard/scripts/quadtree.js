import { sub2, dot2, div2s, add2 } from '../../core/scripts/MathHelpers.js';
import { VoronoiUtils } from './voronoi-utils.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/voronoi.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/rbtree.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/vertex.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/edge.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/cell.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/diagram.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/halfedge.js';
import './random-pcg-32.js';

class Aabb2 {
  min = { x: 0, y: 0 };
  max = { x: 0, y: 0 };
  constructor(min, max) {
    this.min = min;
    this.max = max;
  }
  contains(pos) {
    return pos.x >= this.min.x && pos.x <= this.max.x && pos.y >= this.min.y && pos.y <= this.max.y;
  }
  size() {
    return sub2(this.max, this.min);
  }
  distSqToPoint(p) {
    const d = { x: 0, y: 0 };
    if (p.x < this.min.x) d.x = this.min.x - p.x;
    else if (p.x >= this.max.x) d.x = p.x - this.max.x;
    if (p.y < this.min.y) d.y = this.min.y - p.y;
    else if (p.y >= this.max.y) d.y = p.y - this.max.y;
    return dot2(d, d);
  }
  intersects(other) {
    return !(other.min.x >= this.max.x || other.max.x <= other.min.x || other.min.y >= this.max.y || other.max.y <= other.min.y);
  }
}
var QuadIdx = /* @__PURE__ */ ((QuadIdx2) => {
  QuadIdx2[QuadIdx2["NW"] = 0] = "NW";
  QuadIdx2[QuadIdx2["NE"] = 1] = "NE";
  QuadIdx2[QuadIdx2["SE"] = 2] = "SE";
  QuadIdx2[QuadIdx2["SW"] = 3] = "SW";
  return QuadIdx2;
})(QuadIdx || {});
class QuadTree {
  bounds;
  capacity;
  maxDepth;
  depth;
  getPos;
  items = [];
  children = null;
  constructor(bounds, getPos, capacity = 4, maxDepth = 16, depth = 0) {
    this.bounds = bounds;
    this.getPos = getPos;
    this.capacity = capacity;
    this.maxDepth = maxDepth;
    this.depth = depth;
  }
  size() {
    return this.items.length + (this.children ? this.children.reduce((a, c) => a + c.size(), 0) : 0);
  }
  insert(item) {
    if (!this.bounds.contains(this.getPos(item))) return false;
    if (!this.children) {
      if (this.items.length < this.capacity || this.depth >= this.maxDepth) {
        this.items.push(item);
        return true;
      }
      this.subdivide();
      this.items.forEach((item2) => this.insertIntoChild(item2));
      this.items.length = 0;
    }
    return this.insertIntoChild(item);
  }
  nearest(target, filter = void 0, bestDistSq = Infinity, best = null) {
    for (const item of this.items) {
      if (filter && filter(item)) {
        const d = VoronoiUtils.sqDistance(this.getPos(item), target);
        if (d < bestDistSq) {
          bestDistSq = d;
          best = item;
        }
      }
    }
    if (!this.children) {
      return { cell: best, distSq: bestDistSq };
    }
    const ordered = this.children.map((child) => ({ child, d: child.bounds.distSqToPoint(target) })).sort((a, b) => a.d - b.d);
    for (const { child, d } of ordered) {
      if (d > bestDistSq) break;
      const candidate = child.nearest(target, filter, bestDistSq, best);
      if (candidate.cell) {
        [best, bestDistSq] = [candidate.cell, candidate.distSq];
      }
    }
    return { cell: best, distSq: bestDistSq };
  }
  queryRange(range = this.bounds, out = []) {
    if (!this.bounds.intersects(range)) return out;
    for (const item of this.items) {
      if (range.contains(this.getPos(item))) out.push(item);
    }
    if (this.children) {
      for (const child of this.children) child.queryRange(range, out);
    }
    return out;
  }
  insertIntoChild(item) {
    this.children[this.childIndex(item)].insert(item);
  }
  subdivide() {
    const childDepth = this.depth + 1;
    const min = this.bounds.min;
    const hDims = div2s(this.bounds.size(), 2);
    const mins = [min, { x: min.x + hDims.x, y: min.y }, add2(min, hDims), { x: min.x, y: min.y + hDims.y }];
    const maxes = mins.map((v) => add2(v, hDims));
    const c = Array.from(
      { length: 4 },
      (_v, k) => new QuadTree(new Aabb2(mins[k], maxes[k]), this.getPos, this.capacity, this.maxDepth, childDepth)
    );
    this.children = [c[0], c[1], c[2], c[3]];
  }
  childIndex(item) {
    const center = add2(this.bounds.min, div2s(this.bounds.size(), 2));
    const pos = this.getPos(item);
    const east = pos.x >= center.x;
    const south = pos.y >= center.y;
    return south ? east ? 2 /* SE */ : 3 /* SW */ : east ? 1 /* NE */ : 0 /* NW */;
  }
}

export { Aabb2, QuadTree };
//# sourceMappingURL=quadtree.js.map
