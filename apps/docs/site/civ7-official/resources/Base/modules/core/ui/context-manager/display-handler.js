/**
 * @file display-queue.ts
 * @copyright 2022, Firaxis Games
 * @description An interface for managers that queue important messages/events
 */
import { DisplayQueueManager, DisplayHideReason } from "/core/ui/context-manager/display-queue-manager.js";
export { DisplayHideReason };
let currentDisplayRequestId = 1;
export function displayRequestUniqueId() {
    return currentDisplayRequestId++;
}
export class DisplayHandlerBase {
    /**
     *
     * @param _category The category of this display handlers
     * @param defaultPriority The priority of this display handler
     */
    constructor(_category, defaultPriority) {
        this._category = _category;
        this._frontSubcategoryPriority = 0;
        this._backSubcategoryPriority = 0;
        this._categoryPriority = 0;
        if (UI.isInGame()) {
            const dbPriority = GameInfo.DisplayQueuePriorities.find(entry => entry.Category === _category);
            this.updateHandlerPriority(dbPriority ? dbPriority.Priority : defaultPriority);
        }
        else {
            this.updateHandlerPriority(defaultPriority);
        }
    }
    /**
     * Updates the category priority of this handler
     * Note: Existing display requests will not have their priorities updated
     * @param priority The new priority
     */
    updateHandlerPriority(priority) {
        this._categoryPriority = priority;
    }
    /**
     * The category the display handler gets registered as
     */
    getCategory() {
        return this._category;
    }
    /**
     * Sets priority and id for a given request, whenever a request is added to the queue.
     * May be called by other handlers to position elements nearby in the queue
     * @param request The request to set id and priority on
     */
    setRequestIdAndPriority(request) {
        request.id ?? (request.id = displayRequestUniqueId());
        if (!request.priority) {
            request.priority = this._categoryPriority;
        }
        if (!request.subpriority) {
            if (request.addToFront) {
                request.subpriority = --this._frontSubcategoryPriority;
            }
            else {
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
    canShow(_request, activeRequests) {
        return activeRequests.length == 0;
    }
    /**
     * Can the given request be closed?
     * @param _request The request to check
     * @param _activeRequests The currently displayed requests
     * @returns
     */
    canHide(_request, _activeRequests) {
        return true;
    }
    /**
     * Generates a new display request and adds it to the Display Queue
     * @param requestInfo The information used to generate the request
     * @returns The created request
     */
    addDisplayRequest(requestInfo = { addToFront: false }, forceShow = false) {
        const request = Object.assign({ category: this.getCategory(), forceShow: forceShow }, requestInfo);
        DisplayQueueManager.add(request);
        return request;
    }
}
//# sourceMappingURL=file:///core/ui/context-manager/display-handler.js.map
