/**
 * @file narrative-popup-manager.ts
 * @copyright 2024, Firaxis Games
 * @description The manager for the narrative story popups
 *  
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { IDisplayRequestBase, DisplayHandlerBase, DisplayHideOptions } from '/core/ui/context-manager/display-handler.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import { NotificationID } from "/base-standard/ui/notification-train/model-notification-train.js";

enum NarrativePopupTypes {
	REGULAR,
	MODEL,
	DISCOVERY
}

interface NarrativePopupData {
	storyID: number | null,
	type: number | null,
	playerID: PlayerId
}

interface NarrativePopupRequest extends NarrativePopupData, IDisplayRequestBase { };

class NarrativePopupManagerImpl extends DisplayHandlerBase<NarrativePopupRequest> {

	private currentNarrativeData: NarrativePopupRequest | null = null;
	private isNotificationPanelRaised: boolean = false;
	private notificationID: NotificationID | null = null;
	private static instance: NarrativePopupManagerImpl | null = null;

	constructor() {
		super("Narrative", 7500);
		if (NarrativePopupManagerImpl.instance) {
			console.error("Only one instance of the NarrativePopupManager class can exist at a time!")
		}
		NarrativePopupManagerImpl.instance = this;
	}

	public raiseNotificationPanel(notificationId: NotificationID, _activatedBy: PlayerId | null) {
		if (this.isShowing() || this.isNotificationPanelRaised) {
			console.warn("narrative-popup-manager: raiseNotificationPanel(): A blocking notification " + notificationId.id + " cannot be added to the display queue, dismiss the previous before.")
			return;
		}
		this.notificationID = notificationId;
		const notification: Notification | null = Game.Notifications.find(notificationId);
		if (!notification) {
			return;
		}
		if (_activatedBy == null) {
			return false;
		}
		const player: PlayerLibrary | null = Players.get(_activatedBy);
		if (!player) {
			return false;
		}

		let currentStoryType: number = NarrativePopupTypes.REGULAR;
		let currentStoryID: number = 0;

		const playerStories: PlayerStories | undefined = player?.Stories;
		if (playerStories) {
			const targetStoryId: ComponentID | null = playerStories?.getFirstPendingMetId();
			if (targetStoryId) {
				const story: NarrativeStory | null = playerStories.find(targetStoryId);
				if (story) {
					currentStoryID = story.id;
					const storyDef: NarrativeStoryDefinition | null = GameInfo.NarrativeStories.lookup(story.type);
					if (storyDef) {
						if (storyDef.UIActivation == "LIGHT" || storyDef.UIActivation == "DISCOVERY") {
							currentStoryType = NarrativePopupTypes.DISCOVERY;
							this.isNotificationPanelRaised = true;
						}
						if (storyDef.UIActivation == "3DPANEL") {
							currentStoryType = NarrativePopupTypes.MODEL;
							this.isNotificationPanelRaised = true;
						}
					}
				}
			}
		}
		this.isNotificationPanelRaised = true;

		const narrativePopupData: NarrativePopupData = {
			type: currentStoryType,
			storyID: currentStoryID,
			playerID: _activatedBy
		}

		this.addDisplayRequest(narrativePopupData);
		return;
	}

	closePopup = () => {
		if (this.currentNarrativeData) {
			DisplayQueueManager.close(this.currentNarrativeData);
			this.isNotificationPanelRaised = false;
		}
	}

	/**
	  * @implements {IDisplayQueue}
	  */
	show(request: NarrativePopupRequest) {
		this.currentNarrativeData = request;
		if (request.type == NarrativePopupTypes.MODEL) {
			ContextManager.push("graphic-narrative-event", {
				singleton: true,
				createMouseGuard: false,
				viewChangeMethod: UIViewChangeMethod.PlayerInteraction,
				panelOptions: { notificationId: this.notificationID }
			});
		} else if (request.type == NarrativePopupTypes.DISCOVERY) {
			ContextManager.push("small-narrative-event", {
				singleton: true,
				createMouseGuard: false,
				viewChangeMethod: UIViewChangeMethod.PlayerInteraction,
				panelOptions: { notificationId: this.notificationID }
			});
		} else if (request.type == NarrativePopupTypes.REGULAR) {
			ContextManager.push("screen-narrative-event", {
				singleton: true,
				createMouseGuard: true,
				viewChangeMethod: UIViewChangeMethod.PlayerInteraction,
				panelOptions: { notificationId: this.notificationID }
			});
		} else {
			console.warn("narrative-popup-manager: unhandled narrative " + request.type);
		}
		// For Narrative Telemetry
		let narrativeData: NarrativeData = {
			PlayerId: request.playerID,
			StoryId: request.storyID
		};
		Telemetry.sendNarrativeOpened(narrativeData);
	}

	isShowing(): boolean {
		if (ContextManager.hasInstanceOf("graphic-narrative-event") || ContextManager.hasInstanceOf("small-narrative-event") || ContextManager.hasInstanceOf("screen-narrative-event")) {
			return true;
		}
		return false
	}

	/**
	  * @implements {IDisplayQueue}
	  */
	hide(request: NarrativePopupRequest, _options?: DisplayHideOptions) {
		if (request.type == NarrativePopupTypes.MODEL) {
			ContextManager.pop("graphic-narrative-event");
		} else if (request.type == NarrativePopupTypes.DISCOVERY) {
			ContextManager.pop("small-narrative-event");
		} else if (request.type == NarrativePopupTypes.REGULAR) {
			ContextManager.pop("screen-narrative-event");
		} else {
			console.warn("narrative-popup-manager: unhandled narrative " + request.type);
		}

		if (this.currentNarrativeData == request) {
			this.currentNarrativeData = null;
		}

		this.isNotificationPanelRaised = false;
	}
}

export const NarrativePopupManager = new NarrativePopupManagerImpl();
export { NarrativePopupManager as default }

DisplayQueueManager.registerHandler(NarrativePopupManager);