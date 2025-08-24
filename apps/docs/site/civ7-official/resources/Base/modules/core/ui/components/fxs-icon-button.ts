/**
 * @file fxs-icon-button.ts
 * @copyright 2024, Firaxis Games
 * @description An activatable button that uses one or more icons for its states.
 */

import { FxsActivatable } from '/core/ui/components/fxs-activatable.js'
import { StatefulIcon } from '../stateful-icon/index.js'



/**
 * FxsIconButton creates a button icon where the you can supply a separate icon for each button state.
 * 
 * @example
 * <fxs-icon-button 
 * 	data-icon="icon-default.png" 
 * 	data-icon-hover="icon-hover.png"
 * 	data-icon-focus="icon-focus.png"
 * 	data-icon-active="icon-active.png"
 * 	data-icon-disabled="icon-disabled.png"
 * </fxs-icon-button>
 */
export class FxsIconButton extends FxsActivatable {
	
	controller: StatefulIcon.Controller;
	constructor(root: ComponentRoot) {
		super(root);

		const [, controller] = StatefulIcon.FromElement(root);

		this.controller = controller;
	}


	onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
		switch(name) {
			case 'disabled':
				super.onAttributeChanged(name, oldValue, newValue);
				this.controller.disabled = this.disabled;
				break;
			case 'data-state':
				if (newValue && this.controller.isValidState(newValue)) {
					this.controller.state = newValue;
					if (newValue === StatefulIcon.IconState.Disabled) {
						super.onAttributeChanged('disabled', this.Root.getAttribute('disabled'), 'true');
					}
				}
				break;
			default:
				super.onAttributeChanged(name, oldValue, newValue);
		}
		super.onAttributeChanged(name, oldValue, newValue);
	}
}

Controls.define('fxs-icon-button', {
	createInstance: FxsIconButton,
	attributes: [
		{
			name: "caption"
		},
		{
			name: "action-key"
		},
		{
			name: "disabled"
		},
		{
			name: 'data-state'
		}
	]
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-icon-button': ComponentRoot<FxsIconButton>
	}
}