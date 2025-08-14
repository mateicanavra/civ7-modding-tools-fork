/**
 * @file panel-player-chat.ts
 * @copyright 2020-2022, Firaxis Games
 * @description Multiplayer Chat panel
 */
import { ActionActivateEvent } from "/core/ui/components/fxs-activatable.js";
import Panel from "/core/ui/panel-support.js";
export class PanelPlayerChat extends Panel {
    constructor() {
        super(...arguments);
        this.chatComponent = null;
    }
    onAttach() {
        if (Configuration.getGame().isAnyMultiplayer) {
            const chatContainer = document.createElement("div");
            chatContainer.classList.add("panel-chat-container");
            chatContainer.setAttribute("tabindex", "-1");
            chatContainer.addEventListener("engine-input", this.onEngineInput.bind(this));
            this.chatComponent = document.createElement("screen-mp-chat");
            chatContainer.appendChild(this.chatComponent);
            this.Root.appendChild(chatContainer);
        }
    }
    onEngineInput(inputEvent) {
        if (!this.handleEngineInput(inputEvent)) {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    handleEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return true;
        }
        switch (inputEvent.detail.name) {
            case 'accept':
                this.Root.dispatchEvent(new ActionActivateEvent(inputEvent.detail.x, inputEvent.detail.y));
                this.chatComponent?.component.triggerFocus();
                return false;
        }
        return true;
    }
}
Controls.define('panel-player-chat', {
    createInstance: PanelPlayerChat,
    description: 'Multiplayer Chat panel.',
    classNames: ['panel-player-chat'],
    styles: ['fs://game/core/ui/mp-chat/panel-player-chat.css'],
});

//# sourceMappingURL=file:///core/ui/mp-chat/panel-player-chat.js.map
