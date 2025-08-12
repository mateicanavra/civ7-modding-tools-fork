import ContextManager from '/core/ui/context-manager/context-manager.js';
import Panel from '/core/ui/panel-support.js';
import { NotificationModel } from '/base-standard/ui/notification-train/model-notification-train.js';
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
class NotificationPanelOpener extends Panel {
    constructor() {
        super(...arguments);
        this.notificationCount = 0;
        this.buttonNtfAmt = document.createElement("div");
        this.navHelpContainer = document.createElement("div");
        this.button = document.createElement("fxs-activatable");
        this.needRebuild = true;
        this.activeDeviceChangedListener = this.onActiveDeviceChanged.bind(this);
        this.focusNotificationsListener = this.onOpenMobileTrain.bind(this);
        this.notificationAddedListener = this.onNotificationAdded.bind(this);
        this.notificationRemovedListener = this.onNotificationRemoved.bind(this);
        this.notificationUpdateListener = this.onNotificationUpdated.bind(this);
        this.notificationRebuildEventListener = this.onNotificationRebuild.bind(this);
    }
    onInitialize() {
        super.onInitialize();
        const notificationTrainDecor = document.createElement("div");
        notificationTrainDecor.classList.add("notification-train__decor");
        this.navHelpContainer.classList.add('notification-train__nav-help-container');
        this.navHelpContainer.classList.toggle('gamepad-active', ActionHandler.isGamepadActive);
        notificationTrainDecor.appendChild(this.navHelpContainer);
        const navHelp = document.createElement("fxs-nav-help");
        navHelp.setAttribute('action-key', 'inline-notification');
        navHelp.setAttribute('decoration-mode', 'border');
        const navHelpExt = document.createElement('div');
        navHelpExt.classList.add('notification-train__nav-help-ext');
        this.navHelpContainer.append(navHelp, navHelpExt);
        this.Root.append(notificationTrainDecor, this.createButton());
    }
    onAttach() {
        super.onAttach();
        NotificationModel.manager.eventNotificationAdd.on(this.notificationAddedListener);
        NotificationModel.manager.eventNotificationRemove.on(this.notificationRemovedListener);
        NotificationModel.manager.eventNotificationUpdate.on(this.notificationUpdateListener);
        NotificationModel.manager.eventNotificationRebuild.on(this.notificationRebuildEventListener);
        window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangedListener);
        window.addEventListener('focus-notifications', this.focusNotificationsListener);
    }
    onDetach() {
        window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangedListener);
        window.removeEventListener('focus-notifications', this.focusNotificationsListener);
        NotificationModel.manager.eventNotificationAdd.off(this.notificationAddedListener);
        NotificationModel.manager.eventNotificationRemove.off(this.notificationRemovedListener);
        NotificationModel.manager.eventNotificationUpdate.off(this.notificationUpdateListener);
        NotificationModel.manager.eventNotificationRebuild.off(this.notificationRebuildEventListener);
        super.onDetach();
    }
    onActiveDeviceChanged() {
        this.navHelpContainer?.classList.toggle('gamepad-active', ActionHandler.isGamepadActive);
    }
    createButton() {
        this.button.classList.add("nmo__button");
        this.button.addEventListener('action-activate', (event) => {
            event.stopPropagation();
            event.preventDefault();
            this.onOpenMobileTrain();
        });
        const buttonBackground = document.createElement("div");
        buttonBackground.classList.add('nmo__button-bk');
        this.button.appendChild(buttonBackground);
        const buttonIcon = document.createElement("div");
        buttonIcon.classList.add("nmo__button-icon");
        this.button.appendChild(buttonIcon);
        this.buttonNtfAmt.classList.add("nmo__button-notification-amt");
        this.refreshNotificationAmount();
        this.button.appendChild(this.buttonNtfAmt);
        return this.button;
    }
    onNotificationAdded(notificationId) {
        if (notificationId.owner == GameContext.localPlayerID) {
            this.refreshNotificationAmount();
        }
    }
    onNotificationRemoved(notificationId) {
        if (notificationId.owner == GameContext.localPlayerID) {
            this.refreshNotificationAmount();
        }
    }
    onNotificationRebuild() {
        this.needRebuild = true;
    }
    onNotificationUpdated() {
        if (this.needRebuild) {
            this.refreshNotificationAmount();
        }
    }
    onOpenMobileTrain() {
        if (this.notificationCount > 0) {
            ContextManager.push("notifications-train-mobile", { singleton: true, createMouseGuard: true });
        }
    }
    refreshNotificationAmount() {
        if (this.buttonNtfAmt) {
            while (this.buttonNtfAmt.lastChild) {
                this.buttonNtfAmt.removeChild(this.buttonNtfAmt.lastChild);
            }
            this.notificationCount = NotificationModel.manager.getNotificationCount(GameContext.localObserverID);
            if (this.notificationCount > 0) {
                const text = document.createElement("div");
                text.classList.add("nmo__button-number-text", "font-fit-shrink", "font-title-sm", "text-center", "text-secondary");
                text.innerHTML = this.notificationCount.toString();
                this.buttonNtfAmt.appendChild(text);
            }
            const indicatorIsHidden = this.button.classList.contains("hidden");
            if (!indicatorIsHidden && this.notificationCount == 0) {
                // wait 1/2 second in case we suddenly get new notifications in
                setTimeout(() => {
                }, 500);
            }
            this.button.classList.toggle('hidden', this.notificationCount == 0);
            this.navHelpContainer?.classList.toggle('notification-available', this.notificationCount > 0);
        }
        this.needRebuild = false;
    }
}
Controls.define('notification-panel-opener', {
    createInstance: NotificationPanelOpener,
    description: 'Button to open the notification panel',
    classNames: ['notification-panel-opener'],
    styles: ["fs://game/base-standard/ui/notification-train-mobile/panel-notification-mobile-opener.css"]
});

//# sourceMappingURL=file:///base-standard/ui/notification-train-mobile/panel-notification-mobile-opener.js.map
