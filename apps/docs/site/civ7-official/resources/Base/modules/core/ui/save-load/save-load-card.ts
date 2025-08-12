/**
 * @file save-load-card.ts
 * @copyright 2023, Firaxis Games
 * @description Activatable styled component as a card used in the SaveLoad screen
 */

import FxsActivatable from '/core/ui/components/fxs-activatable.js';

export const ActionConfirmEventName = "action-confirm" as const;
export class ActionConfirmEvent extends CustomEvent<{}> {
	constructor() {
		super('action-confirm', { bubbles: true, cancelable: true });
	}
}

class SaveLoadCard extends FxsActivatable {
	private handleDoubleClick = this.onDoubleClick.bind(this);
	private handleFocusIn = this.onFocusIn.bind(this);

	onAttach(): void {
		super.onAttach();
		this.Root.ondblclick = this.handleDoubleClick;
		this.Root.addEventListener("focusin", this.handleFocusIn);
	}

	private onDoubleClick(): void {
		this.Root.dispatchEvent(new ActionConfirmEvent());
	}

	private onFocusIn(_event: FocusEvent): void {
		this.Root.dispatchEvent(new FocusEvent("focus"));
	}
}

Controls.define('save-load-card', {
	createInstance: SaveLoadCard,
	styles: ['fs://game/core/ui/save-load/save-load-card.css'],
	content: ['fs://game/core/ui/save-load/save-load-card.html'],
});

declare global {
	interface HTMLElementEventMap {
		[ActionConfirmEventName]: ActionConfirmEvent;
	}
}