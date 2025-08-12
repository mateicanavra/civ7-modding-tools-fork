/**
 * @file screen-events.ts
 * @copyright 2023-2025, Firaxis Games
 * @description Show available online events
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { MainMenuReturnEvent } from '/core/ui/events/shell-events.js';
import { UnlockableRewardItems } from '/core/ui/utilities/utilities-liveops.js';
export const EventsScreenGoSinglePlayerEventName = 'screen-events-sp';
class EventsScreenGoSinglePlayerEvent extends CustomEvent {
    constructor() {
        super(EventsScreenGoSinglePlayerEventName, { bubbles: false, cancelable: true });
    }
}
export const EventsScreenLoadEventName = 'screen-events-loading';
class EventsScreenLoadEvent extends CustomEvent {
    constructor() {
        super(EventsScreenLoadEventName, { bubbles: false, cancelable: true });
    }
}
export const EventsScreenContinueEventName = 'screen-events-continue';
class EventsScreenContinueEvent extends CustomEvent {
    constructor() {
        super(EventsScreenContinueEventName, { bubbles: false, cancelable: true });
    }
}
export const EventsScreenGoMultiPlayerEventName = 'screen-events-mp';
class EventsScreenGoMultiPlayerEvent extends CustomEvent {
    constructor() {
        super(EventsScreenGoMultiPlayerEventName, { bubbles: false, cancelable: true });
    }
}
export class ScreenEvents extends Panel {
    constructor(root) {
        super(root);
        this.closeButtonListener = () => { this.close(); };
        this.singlePlayerListener = () => { this.onSinglePlayer(); };
        this.loadListener = () => { this.onLoadEvent(); };
        //private continueListener = () => { this.onContinueEvent(); }
        this.multiPlayerListener = () => { this.onMultiPlayer(); };
        this.engineInputListener = (inputEvent) => { this.onEngineInput(inputEvent); };
        this.activeLiveEventListener = this.onActiveLiveEvent.bind(this);
        this.connIcon = null;
        this.connStatus = null;
        this.accountStatus = null;
        this.carouselMain = null;
    }
    ;
    onAttach() {
        super.onAttach();
        this.Root.addEventListener('engine-input', this.engineInputListener);
        const exitToMain = MustGetElement(".events-item-exit", this.Root);
        exitToMain.addEventListener('action-activate', () => { Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.EventsPage, MenuAction: TelemetryMenuActionType.Select, Item: "Exit" }); });
        exitToMain.addEventListener('action-activate', this.closeButtonListener);
        const singlePlayer = MustGetElement(".events-item-sp", this.Root);
        singlePlayer.addEventListener('action-activate', () => { Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.EventsPage, MenuAction: TelemetryMenuActionType.Select, Item: "SP" }); });
        singlePlayer.addEventListener('action-activate', this.singlePlayerListener);
        const loadEvent = MustGetElement(".events-item-load", this.Root);
        loadEvent.addEventListener('action-activate', this.loadListener);
        const multiPlayer = MustGetElement(".events-item-mp", this.Root);
        multiPlayer.addEventListener('action-activate', () => { Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.EventsPage, MenuAction: TelemetryMenuActionType.Select, Item: "MP" }); });
        multiPlayer.addEventListener('action-activate', this.multiPlayerListener);
        const scrollable = MustGetElement(".events-scrollable", this.Root);
        scrollable.whenComponentCreated((component) => {
            component.setEngineInputProxy(this.Root);
        });
        this.hideMultiplayerStatus();
        engine.on("LiveEventActiveUpdated", this.activeLiveEventListener);
        if (Online.LiveEvent.getCurrentLiveEvent() != "") {
            const currentEventPrefix = "LOC_" + Online.LiveEvent.getCurrentLiveEvent();
            const rewardData = Online.Achievements.getAvaliableRewardsForLiveEvent(Online.LiveEvent.getCurrentLiveEvent());
            this.updateText(currentEventPrefix, rewardData);
        }
        const dismissButton = MustGetElement(".event-rules-dismiss", this.Root);
        dismissButton.addEventListener("action-activate", this.closeButtonListener);
        const closeButton = MustGetElement(".events-close-button", this.Root);
        closeButton.addEventListener("action-activate", this.closeButtonListener);
        Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.EventsPage, MenuAction: TelemetryMenuActionType.Load });
    }
    onDetach() {
        Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.EventsPage, MenuAction: TelemetryMenuActionType.Exit });
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        super.onDetach();
        this.showMultiplayerStatus();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        NavTray.clear();
        NavTray.addOrUpdateGenericBack();
        NavTray.addOrUpdateGenericSelect();
        const menu = MustGetElement(".events-menu", this.Root);
        FocusManager.setFocus(menu);
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    close() {
        ContextManager.popUntil("main-menu");
        window.dispatchEvent(new MainMenuReturnEvent());
    }
    onSinglePlayer() {
        Online.LiveEvent.setLiveEventGameFlag();
        ContextManager.popUntil("main-menu");
        window.dispatchEvent(new EventsScreenGoSinglePlayerEvent());
    }
    onLoadEvent() {
        Online.LiveEvent.setLiveEventGameFlag();
        ContextManager.popUntil("main-menu");
        window.dispatchEvent(new MainMenuReturnEvent());
        window.dispatchEvent(new EventsScreenLoadEvent());
    }
    // @ts-ignore - TODO: bring back if/when continue added back
    onContinueEvent() {
        Online.LiveEvent.setLiveEventGameFlag();
        ContextManager.popUntil("main-menu");
        window.dispatchEvent(new MainMenuReturnEvent());
        window.dispatchEvent(new EventsScreenContinueEvent());
    }
    onActiveLiveEvent() {
        const currentEventPrefix = "LOC_" + Online.LiveEvent.getCurrentLiveEvent();
        const rewardData = Online.Achievements.getAvaliableRewardsForLiveEvent(Online.LiveEvent.getCurrentLiveEvent());
        this.updateText(currentEventPrefix, rewardData);
    }
    onMultiPlayer() {
        Online.LiveEvent.setLiveEventGameFlag();
        ContextManager.popUntil("main-menu");
        window.dispatchEvent(new MainMenuReturnEvent());
        window.dispatchEvent(new EventsScreenGoMultiPlayerEvent());
    }
    updateText(currentEventPrefix, rewardData) {
        const title = MustGetElement(".events-desc-title", this.Root);
        title.setAttribute("data-l10n-id", currentEventPrefix);
        const subTitle = MustGetElement(".events-desc-subtitle", this.Root);
        subTitle.setAttribute("data-l10n-id", currentEventPrefix + "_SHORT_DESC");
        const description = MustGetElement(".events-desc-text", this.Root);
        description.setAttribute("data-l10n-id", currentEventPrefix + "_DESCRIPTION");
        const rules = MustGetElement(".events-rules-text", this.Root);
        rules.setAttribute("data-l10n-id", currentEventPrefix + "_RULES");
        const rewardArea = MustGetElement(".events-reward-container", this.Root);
        while (rewardArea.children.length > 0) {
            rewardArea.removeChild(rewardArea.children[0]);
        }
        for (let i = 0; i < rewardData.length; i++) {
            const reward = rewardData[i];
            const rewardItem = UnlockableRewardItems.badgeRewardItems.find(b => b.dnaId == reward.dnaID);
            const rewardDescription = rewardItem != undefined ? rewardItem.unlockCondition : reward.description;
            const rewardDiv = document.createElement("div");
            rewardDiv.innerHTML =
                `	<fxs-hslot class="mt-2 mb-2">
					<div class="bg-cover bg-no-repeat w-16 h-16" style="background-image: url('fs://game/${reward.reward}')"></div>
					<fxs-vslot class="ml-2">
						<div class="font-title text-lg text-accent-2 uppercase" data-l10n-id="${reward.name}"></div>
						<div class="font-body text-base text-primary-1" data-l10n-id="${rewardDescription}"></div>
					</fxs-vslot>
				</fxs-hslot>
			`;
            rewardArea.appendChild(rewardDiv);
        }
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.detail.name == 'cancel' || inputEvent.detail.name == 'sys-menu' || inputEvent.detail.name == 'keyboard-escape' || inputEvent.detail.name == 'mousebutton-right') {
            this.close();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    hideMultiplayerStatus() {
        this.connIcon = document.querySelector('.connection-icon-img');
        if (!this.connIcon) {
            console.error("screen-credits: Missing this.connIcon with '.connection-icon-img'");
            return;
        }
        this.connStatus = document.querySelector('.connection-status');
        if (!this.connStatus) {
            console.error("screen-credits: Missing this.connStatus with '.connection-status'");
            return;
        }
        this.accountStatus = document.querySelector('.account-status');
        if (!this.accountStatus) {
            console.error("screen-credits: Missing this.accountStatus with '.account-status'");
            return;
        }
        this.carouselMain = document.querySelector('.carousel');
        if (!this.carouselMain) {
            console.error("screen-credits: Missing this.carouselMain with '.carousel'");
            return;
        }
        this.connIcon.style.display = "none";
        this.connStatus.style.display = "none";
        this.accountStatus.style.display = "none";
        this.carouselMain.style.display = "none";
    }
    showMultiplayerStatus() {
        this.connIcon = document.querySelector('.connection-icon-img');
        if (!this.connIcon) {
            console.error("screen-credits: Missing this.connIcon with '.connection-icon-img'");
            return;
        }
        if (!this.connStatus) {
            console.error("screen-credits: Missing this.connStatus with '.connection-status'");
            return;
        }
        if (!this.accountStatus) {
            console.error("screen-credits: Missing this.accountStatus with '.account-status'");
            return;
        }
        if (!this.carouselMain) {
            console.error("screen-credits: Missing this.carouselMain with '.carousel'");
            return;
        }
        this.connIcon.style.display = "flex";
        this.connStatus.style.display = "flex";
        this.accountStatus.style.display = "flex";
        this.carouselMain.style.display = "flex";
    }
}
Controls.define('screen-events', {
    createInstance: ScreenEvents,
    description: 'Events screen.',
    classNames: ['screen-events'],
    styles: ['fs://game/core/ui/shell/events/screen-events.css'],
    content: ['fs://game/core/ui/shell/events/screen-events.html'],
    attributes: [],
    tabIndex: -1
});

//# sourceMappingURL=file:///core/ui/shell/events/screen-events.js.map
