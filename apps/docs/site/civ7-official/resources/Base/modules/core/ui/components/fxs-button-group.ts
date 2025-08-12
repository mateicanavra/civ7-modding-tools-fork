/**
 * @file fxs-button-group.ts
 * @copyright 2023, Firaxis Games
 * @description A container component for managing the sizing of a group of buttons.
 */

import { ActiveDeviceTypeChangedEventName } from "/core/ui/input/action-handler.js";
import { ElementToDebugString } from "/core/ui/utilities/utilities-dom.js";

export class FxsButtonGroup extends Component {

	private containerType: string | null = null;
	private onResizeEventListener = this.setButtonWidth.bind(this);
	private activeDeviceTypeListener = this.setButtonWidth.bind(this)

	onInitialize(): void {
		this.containerType = this.Root.getAttribute("type");
	}

	onAttach() {
		super.onAttach();

		this.setButtonWidth();

		this.Root.listenForWindowEvent('resize', this.onResizeEventListener);
		this.Root.listenForWindowEvent(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
	}

	/**
	 * Waits for the next layout cycle and then resizes all buttons to the size of the longest button.
	 * 
	 * This is used as a workaround for Coherent Gameface not supporting grid layouts.
	 * 
	 * Note: You don't need this for vertical button groups, only horizontal.
	 */
	private setButtonWidth(): void {
		if (this.containerType === 'fixed-internal') {
			return;
		}

		const buttonList = this.Root.children;

		for (let i = 0; i < buttonList.length; i++) {
			const button = buttonList[i];
			if (button instanceof HTMLElement) {
				button.style.width = `auto`;
			}
		};

		waitForLayout(() => {
			let length = 0;
			for (let i = 0; i < buttonList.length; i++) {
				const { offsetWidth } = buttonList[i] as HTMLElement;
				if (offsetWidth === 0) {
					console.error('fxs-button-group: found a button with width 0, unable to resize buttons', ElementToDebugString(buttonList[i]));
					return;
				}

				length = Math.max(length, offsetWidth);
			}

			// update all buttons to the longest width
			for (let i = 0; i < buttonList.length; i++) {
				const button = buttonList[i];
				if (button instanceof HTMLElement) {
					button.style.widthPX = length
				}
			}
		});
	}
}

Controls.define('fxs-button-group', {
	createInstance: FxsButtonGroup,
	description: 'A container component for managing the layout of buttons.',
	classNames: ['fxs-button-group']
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-button-group': ComponentRoot<FxsButtonGroup>
	}
}