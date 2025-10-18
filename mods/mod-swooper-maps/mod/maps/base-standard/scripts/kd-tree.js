class kdNode {
  data;
  left;
  right;
  constructor(data) {
    this.data = data;
  }
}
class kdTree {
  rootNode;
  getPos;
  constructor(getPos) {
    this.getPos = getPos;
  }
  build(data) {
    this.rootNode = this.buildInternal([...data]);
  }
  search(pos) {
    return this.searchInternal(this.rootNode, pos, 0, [], 1)[0]?.data;
  }
  searchMultiple(pos, count) {
    return this.searchInternal(this.rootNode, pos, 0, [], count).sort((a, b) => a.distSq - b.distSq);
  }
  buildInternal(data, axis = 0) {
    if (data.length === 0) return void 0;
    data.sort((a, b) => axis === 0 ? this.getPos(a).x - this.getPos(b).x : this.getPos(a).y - this.getPos(b).y);
    const midIndex = Math.floor(data.length / 2);
    const midItem = data[midIndex];
    axis = (axis + 1) % 2;
    const node = new kdNode(midItem);
    node.left = this.buildInternal(data.slice(0, midIndex), axis);
    node.right = this.buildInternal(data.slice(midIndex + 1), axis);
    return node;
  }
  searchInternal(node, pos, axis, bestList, maxCount) {
    if (!node) return bestList;
    const distSq = this.distSq(pos, this.getPos(node.data));
    if (bestList.length < maxCount) {
      bestList.push({ data: node.data, distSq });
    } else {
      let bestI = 0;
      for (let i = 1; i < bestList.length; ++i) {
        if (bestList[i].distSq > bestList[bestI].distSq) {
          bestI = i;
        }
      }
      if (bestList[bestI].distSq > distSq) {
        bestList[bestI] = { data: node.data, distSq };
      }
    }
    const diff = axis === 0 ? pos.x - this.getPos(node.data).x : pos.y - this.getPos(node.data).y;
    const nearChild = diff < 0 ? node.left : node.right;
    const farChild = diff < 0 ? node.right : node.left;
    bestList = this.searchInternal(nearChild, pos, (axis + 1) % 2, bestList, maxCount);
    const axisDistSq = diff * diff;
    const furthestDistanceSq = bestList.reduce((max, data) => Math.max(max, data.distSq), 0);
    if (axisDistSq < furthestDistanceSq) {
      bestList = this.searchInternal(farChild, pos, (axis + 1) % 2, bestList, maxCount);
    }
    return bestList;
  }
  distSq(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return dx * dx + dy * dy;
  }
}

export { kdTree };
//# sourceMappingURL=kd-tree.js.map
