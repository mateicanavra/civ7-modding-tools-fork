

/**
 * @file watch-out-manager.ts
 * @copyright 2024, Firaxis Games
 * @description Main coordinator for Watch Out Notifications. 
*/

import ContextManager from '/core/ui/context-manager/context-manager.js'
import { NotificationID, NotificationModel } from "/base-standard/ui/notification-train/model-notification-train.js";
import TutorialItem, { TutorialAdvisorType, TutorialAnchorPosition, TutorialCalloutType, TutorialDefinition, TutorialLevel } from "/base-standard/ui/tutorial/tutorial-item.js";
import { DisplayHandlerBase } from "/core/ui/context-manager/display-handler.js";
import { DisplayHideOptions, DisplayQueueManager, IDisplayRequest, IDisplayRequestBase } from "/core/ui/context-manager/display-queue-manager.js";
import { PlotCoord } from "/core/ui/utilities/utilities-plotcoord.js";

export interface WatchOutPopupData extends IDisplayRequestBase {
	item: TutorialItem,
}

/**
  * The main class of the watch out notification system. 
*/
class WatchOutManagerClass extends DisplayHandlerBase<WatchOutPopupData> {

	private static instance: WatchOutManagerClass | null = null;
	private isNotificationPanelRaised: boolean = false;

	currentWatchOutPopupData: WatchOutPopupData | null = null;

	get isManagerActive(): boolean {
		return Configuration.getUser().tutorialLevel >= TutorialLevel.WarningsOnly;
	}

	constructor() {
		super("WatchOutManager", 8500);

		if (WatchOutManagerClass.instance) {
			console.error("Only one instance of the WatchOut manager class can exist at a time!")
		}
		WatchOutManagerClass.instance = this;
	}

	isShowing(): boolean {
		// Check if is in the DOM
		return ContextManager.hasInstanceOf("screen-watch-out");
	}

	/**
	  * @implements {IDisplayQueue}
	*/
	show(request: WatchOutPopupData): void {
		this.currentWatchOutPopupData = request;
		ContextManager.push("screen-watch-out", { singleton: true });
	}

	/**
	  * @implements {IDisplayQueue}
	*/
	hide(_request: WatchOutPopupData, _options?: DisplayHideOptions): void {
		this.currentWatchOutPopupData = null;
		ContextManager.pop("screen-watch-out");
		this.isNotificationPanelRaised = false;
	}

	canShow(_request: WatchOutPopupData, _activeRequests: ReadonlyArray<IDisplayRequest>): boolean {
		return !ContextManager.hasInstanceOf("screen-watch-out");
	};

	closePopup = () => {
		if (this.currentWatchOutPopupData) {
			DisplayQueueManager.close(this.currentWatchOutPopupData);
			this.isNotificationPanelRaised = false;
		}
	}

	public raiseNotificationPanel(notificationId: NotificationID, advisorType?: TutorialAdvisorType, lookAtCallback?: (notificationId: NotificationID) => void) {
		if (!this.isManagerActive) {
			NotificationModel.manager.dismiss(notificationId);
			return;
		}
		if (this.isShowing() || this.isNotificationPanelRaised) {
			console.warn("watch-out-manager: raiseNotificationPanel(): A blocking notification " + notificationId.id + " cannot be added to the display queue, dismiss the previous before.")
			return;
		}

		const type: number | null = Game.Notifications.getType(notificationId);
		if (!type) {
			console.error(`Tutorial: Cannot push a notification with an invalid type for notification id: ${notificationId}`);
			return;
		}
		const name: string = Game.Notifications.getTypeName(type) || type.toString();
		const message: string = Game.Notifications.getMessage(notificationId) || "";
		const summary: string = Game.Notifications.getSummary(notificationId) || "";
		const notification: Notification | null = Game.Notifications.find(notificationId);
		const location: PlotCoord | undefined = notification?.Location;

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
				const notification: Notification | null = Game.Notifications.find(notificationId);
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

		const hasExtraContent: boolean = notification?.Location != undefined && PlotCoord.isValid(notification?.Location);
		const dialogTutorialDef: TutorialDefinition = {
			ID: name,
			callout: {
				title: message,
				advisor: {
					text: summary
				},
				advisorType: advisorType || TutorialAdvisorType.Default,
				anchorPosition: TutorialAnchorPosition.MiddleRight,
				type: TutorialCalloutType.NOTIFICATION,
				option1: hasExtraContent ? calloutTakeMe : calloutDismiss, // TODO: should take us to a point in the map or screen
				option2: hasExtraContent ? calloutDismiss : undefined,
			}
		}

		const TutorialData: TutorialItem = new TutorialItem(dialogTutorialDef);
		const watchOutPopupData: WatchOutPopupData = {
			category: this.getCategory(),
			item: TutorialData
		}
		this.isNotificationPanelRaised = true;
		this.addDisplayRequest(watchOutPopupData);
	}
}

const WatchOutManager = new WatchOutManagerClass();
export { WatchOutManager as default };

DisplayQueueManager.registerHandler(WatchOutManager);
