class Heap {
  constructor(compare) {
    this.compare = compare;
  }
  items = [];
  get size() {
    return this.items.length;
  }
  peak() {
    return this.items[0];
  }
  push(value) {
    this.items.push(value);
    this.bubbleUp(this.items.length - 1);
  }
  pop() {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }
  clear() {
    this.items = [];
  }
  bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.items[index], this.items[parent]) >= 0) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }
  bubbleDown(index) {
    const length = this.items.length;
    while (true) {
      const left = 2 * index + 1;
      const right = left + 1;
      let smallest = index;
      if (left < length && this.compare(this.items[left], this.items[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && this.compare(this.items[right], this.items[smallest]) < 0) {
        smallest = right;
      }
      if (smallest === index) break;
      [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
      index = smallest;
    }
  }
}

export { Heap };
//# sourceMappingURL=heap.js.map
