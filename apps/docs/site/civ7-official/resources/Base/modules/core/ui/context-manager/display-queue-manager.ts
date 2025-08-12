import { OrderedMinHeap } from "/core/ui/utilities/ordered-min-heap.js";

export type DisplayQueueTag = string;

export type DisplayRequestId = number;
export type DisplayRequestCategory = string;

export enum DisplayHideReason {
	Close,
	Reshuffle,
	Suspend
}

export interface DisplayHideOptions {
	reason: DisplayHideReason;
}

export interface IDisplayRequest {
	category: DisplayRequestCategory;
	id?: DisplayRequestId;
	priority?: number;
	subpriority?: number;
	disablesPausing?: boolean;
	forceShow?: boolean;
}

export interface IReadonlyDisplayRequest extends IDisplayRequest {
	readonly category: DisplayRequestCategory;
	readonly priority?: number;
	readonly subpriority?: number;
	readonly forceShow?: boolean;
}

export interface IDisplayHandler<TDisplayRequestType extends IDisplayRequest = IDisplayRequest> {
	/**
	 * The category the display handler gets registered as
	 */
	getCategory(): DisplayRequestCategory;

	/**
	 * Updates the category priority of this handler
	 * @param priority The new priority
	 */
	updateHandlerPriority(priority: number): void;

	/**
	 * Sets priority and id for a given request, whenever a request is added to the queue.
	 * May be called by other handlers to position elements nearby in the queue
	 * @param request The request to set id and priority on
	 */
	setRequestIdAndPriority(request: TDisplayRequestType): void;

	/**
	 * Can the given request be shown?
	 * @param _request The request to check
	 * @param _activeRequests The currently displayed requests
	 * @returns 
	 */
	canShow(request: TDisplayRequestType, activeRequests: ReadonlyArray<IDisplayRequest>): boolean;

	/**
	 * Generates the UI required to show the given request
	 * @param request The request to show
	 */
	show(request: TDisplayRequestType): void;

	/**
	 * Can the given request be closed?
	 * @param _request The request to check
	 * @param _activeRequests The currently displayed requests
	 * @returns 
	 */
	canHide(request: TDisplayRequestType, activeRequests: ReadonlyArray<IDisplayRequest>): boolean;

	/**
	 * Removes shown UI for the the given request
	 * @param request The request to hide
	 */
	hide(request: TDisplayRequestType, options: DisplayHideOptions): void;
}

export interface IDisplayRequestBase extends IDisplayRequest {
	addToFront?: boolean;
}

// The number of frames to stall when a display is requested, before displays are displayed.
// This alleviates situations where a bunch of unsorted displays are requested at the same time.
// The counter will restart each time a display is added to the queue
const DEFAULT_DEBOUNCE_STALL = 20;

// The maximum frames to stall before displays are forced to display
const MAX_DEBOUNCE_STALL = 30;

type requestMatchCriteria = DisplayRequestCategory | DisplayRequestId | ((request: IDisplayRequest) => boolean);

function requestLessThan(item1: IDisplayRequest, item2: IDisplayRequest) {
	return (item1.priority === item2.priority
		? (item1.subpriority ?? 0) < (item2.subpriority ?? 0)
		: (item1.priority ?? 0) < (item2.priority ?? 0));
}

/**
 * Manages the main display queue for transient displays
 */
class DisplayQueueManagerImpl {
	private updatePending = false;
	private _isSuspended = false;
	private debounceStallLeft = 0;
	private curDebounceStall = 0;
	private registeredHandlers = new Map<string, IDisplayHandler>();

	private activeRequests: IDisplayRequest[] = [];
	private suspendedRequests: IDisplayRequest[] = [];
	private queue = new OrderedMinHeap<IDisplayRequest>(requestLessThan);

	/**
	 * Gets the topmost active display request
	 */
	public get topDisplay(): IReadonlyDisplayRequest | undefined {
		return this.activeRequests.length > 0
			? this.activeRequests[this.activeRequests.length - 1]
			: undefined;
	}

	/**
	 * Gets all active displays
	 */
	public get activeDisplays(): ReadonlyArray<IReadonlyDisplayRequest> {
		return this.activeRequests;
	}

	/**
	 * Constructs a new DisplayQueueManagerImpl
	 */
	constructor() {
		engine.on('UpdateFrame', this.update, this);
	}

	/**
	 * Registers a display request handler with the queue
	 * @param handler The handler to register
	 */
	public registerHandler(handler: IDisplayHandler) {
		this.registeredHandlers.set(handler.getCategory(), handler);
	}

	/**
	 * Gets a handler registered with the queue
	 * @param queueCategory The category of the handler
	 * @returns The found handler or undefined if none was found
	 */
	public getHandler(queueCategory: string) {
		return this.registeredHandlers.get(queueCategory);
	}

	/**
	 * Adds a display request to the queue
	 * @param request The display request to add
	 */
	public add(request: IDisplayRequest) {
		this.debounceStallLeft = DEFAULT_DEBOUNCE_STALL;

		const requestHandler = this.registeredHandlers.get(request.category);
		if (requestHandler) {
			requestHandler.setRequestIdAndPriority(request);

			if (this._isSuspended && !request.forceShow) {
				this.suspendedRequests.push(request);
			} else {
				if (!this.queue.contains(queueItem => queueItem.id == request.id)) {
					this.queue.insert(request);
					this.updatePending = true;
				}
			}
		}
	}

	/**
	 * Removes a display request from active, pending, or suspended requeusts
	 * @param request The request to remove. If none is specified, the topmost request will be removed.
	 * @returns True if the display request was sucessfully removed
	 */
	public close(request?: IDisplayRequest): boolean {
		// If no request was specified, try to close the top-most request
		if (!request && this.activeRequests.length > 0) {
			request = this.topDisplay;
		}

		if (!request) {
			console.error(`Display Queue Manager - Attempting to close display when none exists!`);
			return false;
		}

		const requestHandler = this.registeredHandlers.get(request.category);
		if (!requestHandler) {
			console.error(`Display Queue Manager - Attempting to close display with an invalid category - ${request.category}!`);
			return false;
		}

		// First search for the request in the active requests
		const foundIndex = this.activeRequests.indexOf(request);
		if (foundIndex >= 0) {
			if (requestHandler.canHide(request, this.activeRequests)) {
				this.activeRequests.splice(foundIndex, 1);
				requestHandler.hide(request, { reason: DisplayHideReason.Close });
			} else {
				// Cannot hide
				return false;
			}
		} else {
			// If it wasn't in the active display requests, try to remove it from the queue
			if (!this.queue.remove(request)) {
				// It wasn't in the queue, try the suspended requests
				const suspendIndex = this.suspendedRequests.indexOf(request);

				if (suspendIndex >= 0) {
					this.suspendedRequests.splice(suspendIndex, 1);
				} else {
					console.error(`Display Queue Manager - Attempting to close display which was not in queue - ${request.category}!`);
				}
			} else {
				requestHandler.hide(request, { reason: DisplayHideReason.Close });
			}
		}

		this.updatePending = true;
		return true;
	}

	/**
	 * Removes matching active, pending and suspended display requests for a given criteria
	 * @param criteria A category, request id, or selector function to match items
	 * @returns A list of displays that were hidden
	 */
	public closeMatching(criteria: requestMatchCriteria): IDisplayRequest[] {
		const resolvedCriteria = this.resolveCriteria(criteria);

		// Remove from pending queue
		const removed = this.queue.removeAll(resolvedCriteria);

		// Remove from active list
		removed.push(...this.closeActive(resolvedCriteria));

		// Close in suspended list
		removed.push(...this.suspendedRequests.filter(resolvedCriteria));
		this.suspendedRequests = this.suspendedRequests.filter(r => !resolvedCriteria(r));

		if (removed.length > 0) {
			this.updatePending = true;
		}

		return removed;
	}

	/**
	 * Removes matching active requests for a given criteria
	 * @param criteria A category, request id, or selector function to match items
	 * @returns A list of display requests that were removed
	 */
	public closeActive(criteria: requestMatchCriteria): IDisplayRequest[] {
		const removed = [];
		const resolvedCriteria = this.resolveCriteria(criteria);

		for (let i = this.activeRequests.length - 1; i >= 0; --i) {
			const activeRequest = this.activeRequests[i];
			const requestHandler = this.registeredHandlers.get(activeRequest.category);

			if (resolvedCriteria(activeRequest) && requestHandler?.canHide(activeRequest, this.activeRequests)) {
				removed.push(activeRequest);
				this.activeRequests.splice(i, 1);
				requestHandler.hide(activeRequest, { reason: DisplayHideReason.Close });
			}
		}

		if (removed.length > 0) {
			this.updatePending = true;
		}

		return removed;
	}

	/**
	 * Removes the topmost active request for a given criteria
	 * @param criteria A category, request id, or selector function to match items
	 * @returns True if an active request was removed and false otherwise
	 */
	public closeTopmost(criteria: requestMatchCriteria): boolean {
		const resolvedCriteria = this.resolveCriteria(criteria);

		for (let i = this.activeRequests.length - 1; i >= 0; --i) {
			const activeRequest = this.activeRequests[i];
			const requestHandler = this.registeredHandlers.get(activeRequest.category);

			if (resolvedCriteria(activeRequest) && requestHandler?.canHide(activeRequest, this.activeRequests)) {
				this.activeRequests.splice(i, 1);
				requestHandler.hide(activeRequest, { reason: DisplayHideReason.Close });
				this.updatePending = true;
				return true;
			}
		}

		return false;
	}

	/**
	 * Finds matching active requests for a given criteria
	 * @param criteria A category, request id, or selector function to match items
	 * @returns A list of found display requests
	 */
	public findAll(criteria: requestMatchCriteria): IDisplayRequest[] {
		const resolvedCriteria = this.resolveCriteria(criteria);
		const found = this.queue.findAll(resolvedCriteria);

		for (const activeRequest of this.activeRequests) {
			if (resolvedCriteria(activeRequest)) {
				found.push(activeRequest);
			}
		}

		return found;
	}

	public isSuspended() {
		return this._isSuspended;
	}

	/**
	 * Hides all active displays, and prevents new displays from being displayed
	 * @returns True if all displays were suspended
	 */
	public suspend() {
		if (this._isSuspended) {
			return;
		}

		this._isSuspended = true;

		// Suspend active items in the queue
		for (let i = this.activeRequests.length - 1; i >= 0; --i) {
			const activeRequest = this.activeRequests[i];
			if (this.trySuspend(activeRequest)) {
				this.suspendedRequests.push(activeRequest);
				this.activeRequests.splice(i, 1);
				this.updatePending = true;
			}
		}

		// Suspend pending items in the queue
		const stillVisibleRequests: IDisplayRequest[] = []
		while (!this.queue.isEmpty()) {
			const request = this.queue.pop();
			const targetQueue = request.forceShow ? stillVisibleRequests : this.suspendedRequests;
			targetQueue.push(request);
			this.updatePending = true;
		}

		for (const request of stillVisibleRequests) {
			this.queue.insert(request);
		}
	}

	private resolveCriteria(criteria: requestMatchCriteria): (request: IDisplayRequest) => boolean {
		const type = typeof criteria;
		switch (type) {
			case "string":
				return (request: IDisplayRequest) => request.category === criteria;
			case "number":
				return (request: IDisplayRequest) => request.id === criteria;
			default:
				return criteria as (request: IDisplayRequest) => boolean;
		}
	}

	private trySuspend(request: IDisplayRequest) {
		const handler = this.registeredHandlers.get(request.category);

		if (handler && !request.forceShow) {
			handler.hide(request, { reason: DisplayHideReason.Suspend });
			return true;
		}

		return false;
	}

	public resume() {
		if (!this._isSuspended) {
			console.error('Display Queue Manager: resume was called even though it was not suspened');
			return;
		}

		this._isSuspended = false;

		if (this.suspendedRequests.length > 0) {
			for (const suspendedRequest of this.suspendedRequests) {
				this.queue.insert(suspendedRequest);
			}

			this.suspendedRequests.length = 0;
		}

		this.updatePending = true;
	}

	private update() {
		if (!this.updatePending) {
			return;
		}

		// Wait for frame stall
		if (this.debounceStallLeft > 0 && this.curDebounceStall < MAX_DEBOUNCE_STALL) {
			this.debounceStallLeft--;
			this.curDebounceStall++;
			return;
		}

		this.curDebounceStall = 0;
		this.updatePending = false;

		// Try to show the next item in the queue
		while (!this.queue.isEmpty()) {
			// Check for queue item with higher priority than current top-most display
			this.tryReshuffle();

			// Try to show the next queue item and stop if we can't
			if (!this.tryShowNextQueueItem()) {
				break;
			}
		};
	}

	private tryReshuffle() {
		if (this.queue.isEmpty() || this.activeRequests.length == 0) {
			return;
		}

		// The order of active displays is always newest last, ignoring priority
		// Therefore, we need to iterate all of them to see if any need to be hidden
		for (let i = this.activeRequests.length - 1; i >= 0; --i) {
			const activeRequest = this.activeRequests[i];

			if (requestLessThan(this.queue.peek(), activeRequest)) {
				const handler = this.registeredHandlers.get(activeRequest.category);
				if (handler && handler.canHide(activeRequest, this.activeRequests)) {
					this.activeRequests.splice(i, 1);
					handler.hide(activeRequest, { reason: DisplayHideReason.Reshuffle });
					this.queue.insert(activeRequest);
				}
			}
		}
	}

	private tryShowNextQueueItem(): boolean {
		const nextItem = this.queue.peek();
		const handler = this.registeredHandlers.get(nextItem.category);

		if (!handler) {
			console.error(`Display Queue Manager - Item in queue does not have a handler - ${nextItem.category}!`);
		} else if (handler.canShow(nextItem, this.activeRequests)) {
			this.activeRequests.push(this.queue.pop());
			handler.show(nextItem);
			return true;
		}

		return false;
	}
}

export const DisplayQueueManager = new DisplayQueueManagerImpl();