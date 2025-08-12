/**
 * @file narrative-popup-manager.ts
 * @copyright 2024, Firaxis Games
 * @description The manager for the narrative story popups
 *
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { DisplayHandlerBase } from '/core/ui/context-manager/display-handler.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
var NarrativePopupTypes;
(function (NarrativePopupTypes) {
    NarrativePopupTypes[NarrativePopupTypes["REGULAR"] = 0] = "REGULAR";
    NarrativePopupTypes[NarrativePopupTypes["MODEL"] = 1] = "MODEL";
    NarrativePopupTypes[NarrativePopupTypes["DISCOVERY"] = 2] = "DISCOVERY";
})(NarrativePopupTypes || (NarrativePopupTypes = {}));
;
class NarrativePopupManagerImpl extends DisplayHandlerBase {
    constructor() {
        super("Narrative", 7500);
        this.currentNarrativeData = null;
        this.isNotificationPanelRaised = false;
        this.notificationID = null;
        this.closePopup = () => {
            if (this.currentNarrativeData) {
                DisplayQueueManager.close(this.currentNarrativeData);
                this.isNotificationPanelRaised = false;
            }
        };
        if (NarrativePopupManagerImpl.instance) {
            console.error("Only one instance of the NarrativePopupManager class can exist at a time!");
        }
        NarrativePopupManagerImpl.instance = this;
    }
    raiseNotificationPanel(notificationId, _activatedBy) {
        if (this.isShowing() || this.isNotificationPanelRaised) {
            console.warn("narrative-popup-manager: raiseNotificationPanel(): A blocking notification " + notificationId.id + " cannot be added to the display queue, dismiss the previous before.");
            return;
        }
        this.notificationID = notificationId;
        const notification = Game.Notifications.find(notificationId);
        if (!notification) {
            return;
        }
        if (_activatedBy == null) {
            return false;
        }
        const player = Players.get(_activatedBy);
        if (!player) {
            return false;
        }
        let currentStoryType = NarrativePopupTypes.REGULAR;
        let currentStoryID = 0;
        const playerStories = player?.Stories;
        if (playerStories) {
            const targetStoryId = playerStories?.getFirstPendingMetId();
            if (targetStoryId) {
                const story = playerStories.find(targetStoryId);
                if (story) {
                    currentStoryID = story.id;
                    const storyDef = GameInfo.NarrativeStories.lookup(story.type);
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
        const narrativePopupData = {
            type: currentStoryType,
            storyID: currentStoryID,
            playerID: _activatedBy
        };
        this.addDisplayRequest(narrativePopupData);
        return;
    }
    /**
      * @implements {IDisplayQueue}
      */
    show(request) {
        this.currentNarrativeData = request;
        if (request.type == NarrativePopupTypes.MODEL) {
            ContextManager.push("graphic-narrative-event", {
                singleton: true,
                createMouseGuard: false,
                viewChangeMethod: UIViewChangeMethod.PlayerInteraction,
                panelOptions: { notificationId: this.notificationID }
            });
        }
        else if (request.type == NarrativePopupTypes.DISCOVERY) {
            ContextManager.push("small-narrative-event", {
                singleton: true,
                createMouseGuard: false,
                viewChangeMethod: UIViewChangeMethod.PlayerInteraction,
                panelOptions: { notificationId: this.notificationID }
            });
        }
        else if (request.type == NarrativePopupTypes.REGULAR) {
            ContextManager.push("screen-narrative-event", {
                singleton: true,
                createMouseGuard: true,
                viewChangeMethod: UIViewChangeMethod.PlayerInteraction,
                panelOptions: { notificationId: this.notificationID }
            });
        }
        else {
            console.warn("narrative-popup-manager: unhandled narrative " + request.type);
        }
        // For Narrative Telemetry
        let narrativeData = {
            PlayerId: request.playerID,
            StoryId: request.storyID
        };
        Telemetry.sendNarrativeOpened(narrativeData);
    }
    isShowing() {
        if (ContextManager.hasInstanceOf("graphic-narrative-event") || ContextManager.hasInstanceOf("small-narrative-event") || ContextManager.hasInstanceOf("screen-narrative-event")) {
            return true;
        }
        return false;
    }
    /**
      * @implements {IDisplayQueue}
      */
    hide(request, _options) {
        if (request.type == NarrativePopupTypes.MODEL) {
            ContextManager.pop("graphic-narrative-event");
        }
        else if (request.type == NarrativePopupTypes.DISCOVERY) {
            ContextManager.pop("small-narrative-event");
        }
        else if (request.type == NarrativePopupTypes.REGULAR) {
            ContextManager.pop("screen-narrative-event");
        }
        else {
            console.warn("narrative-popup-manager: unhandled narrative " + request.type);
        }
        if (this.currentNarrativeData == request) {
            this.currentNarrativeData = null;
        }
        this.isNotificationPanelRaised = false;
    }
}
NarrativePopupManagerImpl.instance = null;
export const NarrativePopupManager = new NarrativePopupManagerImpl();
export { NarrativePopupManager as default };
DisplayQueueManager.registerHandler(NarrativePopupManager);

//# sourceMappingURL=file:///base-standard/ui/narrative-event/narrative-popup-manager.js.map
