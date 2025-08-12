/**
 * @file fxs-icon-group.ts
 * @copyright 2024, Firaxis Games
 * @description A component that uses the icon-group utility to create a group of icons that can be toggled between states.
 */

import { StatefulIcon } from '/core/ui/stateful-icon/index.js'



/**
 * FxsStatefulIcon creates a non activatable icon group where the you can supply a separate icon for each button state.
 * 
 * @example
 * <fxs-stateful-icon 
 * 	data-icon="icon-default.png" 
 * 	data-icon-hover="icon-hover.png"
 * 	data-icon-focus="icon-focus.png"
 * 	data-icon-active="icon-active.png"
 * 	data-icon-disabled="icon-disabled.png"
 * </fxs-stateful-icon>
 */
export class FxsStatefulIcon extends Component {

	controller: StatefulIcon.Controller;
	constructor(root: ComponentRoot) {
		super(root);
		const [, controller] = StatefulIcon.FromElement(root, true);
		this.controller = controller;
	}

	onInitialize(): void {
		this.Root.classList.add('flex', 'items-center');
		for (const iconElement of Object.values(this.controller.elements)) {
			iconElement.classList.add('flex-initial', 'max-h-full', 'max-w-full', "size-full");
		}
	}

	onAttributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
		switch (name) {
			case 'data-state':
				if (this.controller.isValidState(newValue)) {
					this.controller.state = newValue;
				}
				break;
			default:
				super.onAttributeChanged(name, oldValue, newValue);
		}
		super.onAttributeChanged(name, oldValue, newValue);
	}
}

Controls.define('fxs-stateful-icon', {
	createInstance: FxsStatefulIcon,
	attributes: [
		{
			name: 'data-state'
		}
	]
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-stateful-icon': ComponentRoot<FxsStatefulIcon>
	}
}