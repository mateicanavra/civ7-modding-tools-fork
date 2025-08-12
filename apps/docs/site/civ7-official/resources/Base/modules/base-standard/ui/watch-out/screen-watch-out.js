/**
 * @file screen-watch-out.ts
 * @copyright 2024, Firaxis Games
 * @description Displays a Watch Out notification
 */
import FocusManager from '/core/ui/input/focus-manager.js';
import Panel from '/core/ui/panel-support.js';
import WatchOutManager from '/base-standard/ui/watch-out/watch-out-manager.js';
import { LowerCalloutEvent } from '/base-standard/ui/tutorial/tutorial-events.js';
class ScreenWatchOut extends Panel {
    constructor() {
        super(...arguments);
        this.lowerTutorialCalloutListener = (event) => { this.onLowerTutorialCallout(event); };
        this.popupData = WatchOutManager.currentWatchOutPopupData;
        this.callout = document.createElement("tutorial-callout");
    }
    onInitialize() {
        super.onInitialize();
        if (!this.popupData) {
            console.error("screen-watch-out: WatchOutPopupData was null/undefined.");
            WatchOutManager.closePopup();
            return;
        }
        this.render();
    }
    onAttach() {
        super.onAttach();
        window.addEventListener(LowerCalloutEvent.name, this.lowerTutorialCalloutListener);
    }
    onDetach() {
        window.removeEventListener(LowerCalloutEvent.name, this.lowerTutorialCalloutListener);
        FocusManager.unlockFocus(this.callout, "tutorial-callout");
        WatchOutManager.closePopup();
        super.onDetach();
    }
    render() {
        const item = this.popupData.item;
        const calloutDefine = item.callout;
        if (!calloutDefine) {
            console.error("Tutorial: Callout data missing; cannot raise. id: ", item.ID);
            return;
        }
        this.callout.setAttribute("value", JSON.stringify(calloutDefine));
        this.callout.setAttribute("itemID", item.ID);
        this.callout.setAttribute("minimize-disabled", "true");
        if (item.callout?.anchorPosition && !item.callout?.anchorHost) {
            this.callout.classList.add(item.callout.anchorPosition);
        }
        this.Root.appendChild(this.callout);
    }
    onLowerTutorialCallout(event) {
        const itemID = event.detail.itemID;
        if (itemID) {
            const item = this.popupData.item;
            if (item) {
                // If callout is from "closing" the item, mark complete.
                const isClosed = event.detail.closed;
                if (isClosed) {
                    WatchOutManager.closePopup();
                }
                const idx = event.detail.optionNum;
                const key = 'option' + idx;
                item.callout?.[key]?.callback?.();
                return;
            }
            else {
                console.error(`screen-watch-out: Screen received a lower callout event for '${itemID}' but there is no popupData with that ID.`);
            }
        }
        // Close anyways
        WatchOutManager.closePopup();
    }
}
Controls.define('screen-watch-out', {
    createInstance: ScreenWatchOut,
    classNames: ["fullscreen"],
    description: 'Screen for displaying Watch Out moment callouts.',
});

//# sourceMappingURL=file:///base-standard/ui/watch-out/screen-watch-out.js.map
