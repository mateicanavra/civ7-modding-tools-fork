/**
 * @file fxs-minimize-button.ts
 * @copyright 2023, Firaxis Games
 * @description A UI button control to minimize a panel/screen/window.
 * 
 */

import { FxsMinusPlusButton } from '/core/ui/components/fxs-minus-plus.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';

class FxsMinimizeButton extends FxsMinusPlusButton {

	private engineInputListener: EventListener = this.onEngineInputMinimize.bind(this);
	private minimized: boolean = false;

	constructor(root: ComponentRoot) {
		super(root);
	}

	onAttach() {
		this.Root.setAttribute("type", "minus");
		this.Root.classList.add('fxs-minimize-button', 'minusplus-button');


		this.Root.setAttribute("data-tooltip-content", Locale.compose('LOC_PANEL_X_MINIMIZE'));

		this.Root.addEventListener('engine-input', this.engineInputListener);
		if (this.Root.parentElement) {
			let frame = this.Root.parentElement.querySelector(".outerfill.main-window.fxs-frame");
			frame?.classList.add("maximized-frame");
		}

		this.updateImage();

		super.onAttach();
	}

	onDetach() {
		this.Root.removeEventListener('engine-input', this.engineInputListener);

		super.onDetach();
	}

	private onEngineInputMinimize(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.detail.name == 'mousebutton-left') {
			this.playActivateSound();


			if (this.Root.parentElement) {
				let content = this.Root.parentElement.querySelector(".content");
				let frame = this.Root.parentElement.querySelector(".outerfill.main-window.fxs-frame");
				this.minimized = !this.minimized;
				if (this.minimized) {
					this.Root.setAttribute('type', 'plus');
				} else {
					this.Root.setAttribute('type', 'minus');
				}
				content?.classList.toggle("minimized-content", this.minimized);
				content?.classList.toggle("maximized-content", !this.minimized);
				frame?.classList.toggle("minimized-frame", this.minimized);
				frame?.classList.toggle("maximized-frame", !this.minimized);
				this.updateImage();
			}

			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private updateImage() {
		this.Root.classList.toggle('minusplus-button--minus', !this.minimized);
	}

}

Controls.define('fxs-minimize-button', {
	createInstance: FxsMinimizeButton,
	description: 'A minimize button primitive',
	classNames: [],
	images: []
});

declare global {
	interface HTMLElementTagNameMap {
		'fxs-minimize-button': ComponentRoot<FxsMinimizeButton>;
	}
}