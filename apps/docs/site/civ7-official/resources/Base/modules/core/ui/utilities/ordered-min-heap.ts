export class OrderedMinHeap<TData> {
	private readonly storage: TData[] = [];

	public constructor(private _comparator: (item1: TData, item2: TData) => boolean) { }

	public peek(): TData {
		return this.storage[0];
	}

	public pop(): TData {
		const top = this.peek();
		this.removeIndex(0);
		return top;
	}

	public insert(item: TData): number {
		const length = this.storage.push(item);
		this.bubbleUp(length - 1);
		return length;
	}

	public isEmpty() {
		return this.storage.length === 0;
	}

	public remove(item: TData): boolean {
		const foundIndex = this.storage.indexOf(item);
		const hasFoundIndex = foundIndex >= 0;

		if (hasFoundIndex) {
			this.removeIndex(foundIndex);
		}

		return hasFoundIndex;
	}

	public removeAll(criteria: (item: TData) => boolean): TData[] {
		const removed = this.findAll(criteria);

		for (const toRemove of removed) {
			this.remove(toRemove);
		}

		return removed;
	}

	public findAll(criteria: (item: TData) => boolean): TData[] {
		const found: TData[] = [];

		for (const item of this.storage) {
			if (criteria(item)) {
				found.push(item);
			}
		}

		return found;
	}

	public contains(criteria: (item: TData) => boolean): boolean {
		for (const item of this.storage) {
			if (criteria(item)) {
				return true;
			}
		}

		return false;
	}

	private removeIndex(index: number) {
		this.swap(index, this.storage.length - 1);
		this.storage.length -= 1;
		this.bubbleDown(index);
	}

	private swap(index1: number, index2: number) {
		const swapItem = this.storage[index1];
		this.storage[index1] = this.storage[index2];
		this.storage[index2] = swapItem;
	}

	private lessThan(index1: number, index2: number) {
		return this._comparator(this.storage[index1], this.storage[index2]);
	}

	private bubbleUp(index: number) {
		let parent = (index - 1) >> 1;

		while (index > 0 && this.lessThan(index, parent)) {
			this.swap(index, parent)
			index = parent;
			parent = (index - 1) >> 1;
		}
	}

	private bubbleDown(index: number) {
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
			} else {
				this.swap(index, smallestIndex);
				index = smallestIndex;
			}
		}
	}
}
