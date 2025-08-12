/**
 * @file watch-out-manager.ts
 * @copyright 2024, Firaxis Games
 * @description Main coordinator for Watch Out Notifications.
*/
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { NotificationModel } from "/base-standard/ui/notification-train/model-notification-train.js";
import TutorialItem, { TutorialAdvisorType, TutorialAnchorPosition, TutorialCalloutType, TutorialLevel } from "/base-standard/ui/tutorial/tutorial-item.js";
import { DisplayHandlerBase } from "/core/ui/context-manager/display-handler.js";
import { DisplayQueueManager } from "/core/ui/context-manager/display-queue-manager.js";
import { PlotCoord } from "/core/ui/utilities/utilities-plotcoord.js";
/**
  * The main class of the watch out notification system.
*/
class WatchOutManagerClass extends DisplayHandlerBase {
    get isManagerActive() {
        return Configuration.getUser().tutorialLevel >= TutorialLevel.WarningsOnly;
    }
    constructor() {
        super("WatchOutManager", 8500);
        this.isNotificationPanelRaised = false;
        this.currentWatchOutPopupData = null;
        this.closePopup = () => {
            if (this.currentWatchOutPopupData) {
                DisplayQueueManager.close(this.currentWatchOutPopupData);
                this.isNotificationPanelRaised = false;
            }
        };
        if (WatchOutManagerClass.instance) {
            console.error("Only one instance of the WatchOut manager class can exist at a time!");
        }
        WatchOutManagerClass.instance = this;
    }
    isShowing() {
        // Check if is in the DOM
        return ContextManager.hasInstanceOf("screen-watch-out");
    }
    /**
      * @implements {IDisplayQueue}
    */
    show(request) {
        this.currentWatchOutPopupData = request;
        ContextManager.push("screen-watch-out", { singleton: true });
    }
    /**
      * @implements {IDisplayQueue}
    */
    hide(_request, _options) {
        this.currentWatchOutPopupData = null;
        ContextManager.pop("screen-watch-out");
        this.isNotificationPanelRaised = false;
    }
    canShow(_request, _activeRequests) {
        return !ContextManager.hasInstanceOf("screen-watch-out");
    }
    ;
    raiseNotificationPanel(notificationId, advisorType, lookAtCallback) {
        if (!this.isManagerActive) {
            NotificationModel.manager.dismiss(notificationId);
            return;
        }
        if (this.isShowing() || this.isNotificationPanelRaised) {
            console.warn("watch-out-manager: raiseNotificationPanel(): A blocking notification " + notificationId.id + " cannot be added to the display queue, dismiss the previous before.");
            return;
        }
        const type = Game.Notifications.getType(notificationId);
        if (!type) {
            console.error(`Tutorial: Cannot push a notification with an invalid type for notification id: ${notificationId}`);
            return;
        }
        const name = Game.Notifications.getTypeName(type) || type.toString();
        const message = Game.Notifications.getMessage(notificationId) || "";
        const summary = Game.Notifications.getSummary(notificationId) || "";
        const notification = Game.Notifications.find(notificationId);
        const location = notification?.Location;
        const calloutDismiss = {
            callback: () => {
                // Should not allow multiple tutorial elements activation. Any way to hide a notification without dismissing?
                // Use the notification model to dismiss, so that any script side dismiss code is called
                NotificationModel.manager.dismiss(notificationId);
            }, text: "LOC_TUTORIAL_CALLOUT_DISMISS", actionKey: "inline-cancel", closes: true
        };
        const calloutTakeMe = {
            callback: () => {
                // Do the effects here...
                const notification = Game.Notifications.find(notificationId);
                if (lookAtCallback && notification) {
                    lookAtCallback(notificationId);
                }
                //? Current advisor notifications are dismissed after the action button is activated.
                //?	For UT we're saving the location in the raiseNotificationPanel scope.
                else if (location && PlotCoord.isValid(location)) {
                    Camera.lookAtPlot(location);
                }
                NotificationModel.manager.dismiss(notificationId);
            }, text: "LOC_TUTORIAL_CALLOUT_TAKE_ME", actionKey: "inline-accept", closes: true
        };
        const hasExtraContent = notification?.Location != undefined && PlotCoord.isValid(notification?.Location);
        const dialogTutorialDef = {
            ID: name,
            callout: {
                title: message,
                advisor: {
                    text: summary
                },
                advisorType: advisorType || TutorialAdvisorType.Default,
                anchorPosition: TutorialAnchorPosition.MiddleRight,
                type: TutorialCalloutType.NOTIFICATION,
                option1: hasExtraContent ? calloutTakeMe : calloutDismiss,
                option2: hasExtraContent ? calloutDismiss : undefined,
            }
        };
        const TutorialData = new TutorialItem(dialogTutorialDef);
        const watchOutPopupData = {
            category: this.getCategory(),
            item: TutorialData
        };
        this.isNotificationPanelRaised = true;
        this.addDisplayRequest(watchOutPopupData);
    }
}
WatchOutManagerClass.instance = null;
const WatchOutManager = new WatchOutManagerClass();
export { WatchOutManager as default };
DisplayQueueManager.registerHandler(WatchOutManager);

//# sourceMappingURL=file:///base-standard/ui/watch-out/watch-out-manager.js.map
