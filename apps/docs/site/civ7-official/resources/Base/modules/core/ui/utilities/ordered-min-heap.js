export class OrderedMinHeap {
    constructor(_comparator) {
        this._comparator = _comparator;
        this.storage = [];
    }
    peek() {
        return this.storage[0];
    }
    pop() {
        const top = this.peek();
        this.removeIndex(0);
        return top;
    }
    insert(item) {
        const length = this.storage.push(item);
        this.bubbleUp(length - 1);
        return length;
    }
    isEmpty() {
        return this.storage.length === 0;
    }
    remove(item) {
        const foundIndex = this.storage.indexOf(item);
        const hasFoundIndex = foundIndex >= 0;
        if (hasFoundIndex) {
            this.removeIndex(foundIndex);
        }
        return hasFoundIndex;
    }
    removeAll(criteria) {
        const removed = this.findAll(criteria);
        for (const toRemove of removed) {
            this.remove(toRemove);
        }
        return removed;
    }
    findAll(criteria) {
        const found = [];
        for (const item of this.storage) {
            if (criteria(item)) {
                found.push(item);
            }
        }
        return found;
    }
    contains(criteria) {
        for (const item of this.storage) {
            if (criteria(item)) {
                return true;
            }
        }
        return false;
    }
    removeIndex(index) {
        this.swap(index, this.storage.length - 1);
        this.storage.length -= 1;
        this.bubbleDown(index);
    }
    swap(index1, index2) {
        const swapItem = this.storage[index1];
        this.storage[index1] = this.storage[index2];
        this.storage[index2] = swapItem;
    }
    lessThan(index1, index2) {
        return this._comparator(this.storage[index1], this.storage[index2]);
    }
    bubbleUp(index) {
        let parent = (index - 1) >> 1;
        while (index > 0 && this.lessThan(index, parent)) {
            this.swap(index, parent);
            index = parent;
            parent = (index - 1) >> 1;
        }
    }
    bubbleDown(index) {
        while (true) {
            const length = this.storage.length;
            let smallestIndex = index;
            const left = (index * 2) + 1;
            if (left < length && this.lessThan(left, smallestIndex)) {
                smallestIndex = left;
            }
            const right = (index * 2) + 2;
            if (right < length && this.lessThan(right, smallestIndex)) {
                smallestIndex = right;
            }
            if (smallestIndex === index) {
                break;
            }
            else {
                this.swap(index, smallestIndex);
                index = smallestIndex;
            }
        }
    }
}

//# sourceMappingURL=file:///core/ui/utilities/ordered-min-heap.js.map
