/**
 * @file save-load-card.ts
 * @copyright 2023, Firaxis Games
 * @description Activatable styled component as a card used in the SaveLoad screen
 */
import FxsActivatable from '/core/ui/components/fxs-activatable.js';
export const ActionConfirmEventName = "action-confirm";
export class ActionConfirmEvent extends CustomEvent {
    constructor() {
        super('action-confirm', { bubbles: true, cancelable: true });
    }
}
class SaveLoadCard extends FxsActivatable {
    constructor() {
        super(...arguments);
        this.handleDoubleClick = this.onDoubleClick.bind(this);
        this.handleFocusIn = this.onFocusIn.bind(this);
    }
    onAttach() {
        super.onAttach();
        this.Root.ondblclick = this.handleDoubleClick;
        this.Root.addEventListener("focusin", this.handleFocusIn);
    }
    onDoubleClick() {
        this.Root.dispatchEvent(new ActionConfirmEvent());
    }
    onFocusIn(_event) {
        this.Root.dispatchEvent(new FocusEvent("focus"));
    }
}
Controls.define('save-load-card', {
    createInstance: SaveLoadCard,
    styles: ['fs://game/core/ui/save-load/save-load-card.css'],
    content: ['fs://game/core/ui/save-load/save-load-card.html'],
});

//# sourceMappingURL=file:///core/ui/save-load/save-load-card.js.map
