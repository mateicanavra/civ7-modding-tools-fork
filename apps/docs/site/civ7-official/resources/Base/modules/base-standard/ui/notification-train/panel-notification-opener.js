/**
 * @file panel-notification-opener.ts
 * @copyright 2020-2023, Firaxis Games
 * @description Show a button to open a panel of notifications resulting from the previous turn.
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import Panel from '/core/ui/panel-support.js';
class NotificationOpener extends Panel {
    constructor() {
        super(...arguments);
        this.notificationButton = null;
    }
    onAttach() {
        this.notificationButton = document.createElement('fxs-button');
        this.notificationButton.setAttribute('action-key', "inline-confirm");
        this.notificationButton.setAttribute('hover-only-trigger', "true");
        this.notificationButton.setAttribute('caption', 'LOC_UI_NOTIFICATIONS_TITLE');
        this.notificationButton.setAttribute('tab-index', '-1');
        this.notificationButton.addEventListener('action-activate', (event) => { this.onButtonActivated(event); });
        this.Root.appendChild(this.notificationButton);
    }
    onButtonActivated(event) {
        event.stopPropagation();
        event.preventDefault();
        if (ContextManager.hasInstanceOf("panel-notifications-left")) {
            ContextManager.pop("panel-notifications-left");
        }
        else {
            ContextManager.push("panel-notifications-left", { singleton: true });
        }
    }
}
Controls.define('panel-notification-opener', {
    createInstance: NotificationOpener,
    description: 'Area for sub system button icons.',
    classNames: ['notification-opener', 'allowCameraMovement'],
    styles: ["fs://game/base-standard/ui/notification-train/panel-notification-opener.css"]
});

//# sourceMappingURL=file:///base-standard/ui/notification-train/panel-notification-opener.js.map
