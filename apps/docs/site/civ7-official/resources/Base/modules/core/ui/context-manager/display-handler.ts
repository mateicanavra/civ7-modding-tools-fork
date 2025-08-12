/**
 * @file display-queue.ts
 * @copyright 2022, Firaxis Games
 * @description An interface for managers that queue important messages/events
 */

import { DisplayQueueManager, IDisplayHandler, IDisplayRequest, IDisplayRequestBase, DisplayRequestId, DisplayRequestCategory, DisplayHideOptions, DisplayHideReason } from "/core/ui/context-manager/display-queue-manager.js";

export type { DisplayHideOptions, DisplayRequestCategory, IDisplayRequestBase };
export { DisplayHideReason };

let currentDisplayRequestId: DisplayRequestId = 1;

export function displayRequestUniqueId() {
	return currentDisplayRequestId++;
}

export abstract class DisplayHandlerBase<TDisplayRequestType extends IDisplayRequestBase = IDisplayRequestBase> implements IDisplayHandler<TDisplayRequestType> {
	protected _frontSubcategoryPriority = 0;
	protected _backSubcategoryPriority = 0;
	protected _categoryPriority = 0;

	/**
	 * 
	 * @param _category The category of this display handlers
	 * @param defaultPriority The priority of this display handler
	 */
	constructor(protected _category: DisplayRequestCategory, defaultPriority: number) {
		if (UI.isInGame()) {
			const dbPriority = GameInfo.DisplayQueuePriorities.find(entry => entry.Category === _category);
			this.updateHandlerPriority(dbPriority ? dbPriority.Priority : defaultPriority);
		} else {
			this.updateHandlerPriority(defaultPriority);
		}
	}

	/**
	 * Updates the category priority of this handler
	 * Note: Existing display requests will not have their priorities updated
	 * @param priority The new priority
	 */
	public updateHandlerPriority(priority: number) {
		this._categoryPriority = priority;
	}

	/**
	 * The category the display handler gets registered as
	 */
	public getCategory(): DisplayRequestCategory {
		return this._category;
	}

	/**
	 * Sets priority and id for a given request, whenever a request is added to the queue.
	 * May be called by other handlers to position elements nearby in the queue
	 * @param request The request to set id and priority on
	 */
	public setRequestIdAndPriority(request: IDisplayRequestBase): void {
		request.id ??= displayRequestUniqueId();

		if (!request.priority) {
			request.priority = this._categoryPriority;
		}

		if (!request.subpriority) {
			if (request.addToFront) {
				request.subpriority = --this._frontSubcategoryPriority;
			} else {
				request.subpriority = ++this._backSubcategoryPriority;
			}
		}
	}

	/**
	 * Can the given request be shown?
	 * @param _request The request to check
	 * @param _activeRequests The currently displayed requests
	 * @returns 
	 */
	public canShow(_request: TDisplayRequestType, activeRequests: readonly IDisplayRequest[]): boolean {
		return activeRequests.length == 0;
	}

	/**
	 * Can the given request be closed?
	 * @param _request The request to check
	 * @param _activeRequests The currently displayed requests
	 * @returns 
	 */
	public canHide(_request: TDisplayRequestType, _activeRequests: readonly IDisplayRequest[]): boolean {
		return true;
	}

	/**
	 * Generates a new display request and adds it to the Display Queue
	 * @param requestInfo The information used to generate the request
	 * @returns The created request
	 */
	public addDisplayRequest(requestInfo: Omit<TDisplayRequestType, keyof IDisplayRequest> = { addToFront: false } as TDisplayRequestType, forceShow = false) {
		const request = Object.assign({ category: this.getCategory(), forceShow: forceShow }, requestInfo) as TDisplayRequestType;
		DisplayQueueManager.add(request);
		return request;
	}

	abstract show(request: TDisplayRequestType): void;
	abstract hide(request: TDisplayRequestType, options: DisplayHideOptions): void;
}
