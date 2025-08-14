/**
 * @file yield-bar.ts
 * @copyright 2025, Firaxis Games
 * @description Basic component used to display a cities current yields
 */

import YieldBar from "/base-standard/ui/yield-bar/model-yield-bar.js";

class YieldBarComponent extends Component {

	private yieldBarUpdateListener = this.render.bind(this);

	onInitialize() {
		YieldBar.yieldBarUpdateEvent.on(this.yieldBarUpdateListener);
	}

	onAttach() {
		this.render();
	}

	onDetach() {
		YieldBar.yieldBarUpdateEvent.off(this.yieldBarUpdateListener);
	}

	private render() {
		this.Root.innerHTML = "";
		for (const yieldData of YieldBar.cityYields) {
			const yieldDiv = document.createElement("div");
			yieldDiv.classList.add("flex", "flex-col", "mx-2");
			this.Root.appendChild(yieldDiv);

			const yieldIcon = document.createElement("fxs-icon");
			yieldIcon.classList.add("size-8");
			yieldIcon.setAttribute("data-icon-id", yieldData.type);
			yieldDiv.appendChild(yieldIcon);

			const yieldValue = document.createElement("div");
			yieldValue.classList.add("self-center");
			yieldValue.textContent = Locale.compose("LOC_UI_YIELD_ONE_DECIMAL_NO_PLUS", yieldData.value)
			yieldDiv.appendChild(yieldValue);
		}
	}
}

Controls.define('yield-bar', {
	createInstance: YieldBarComponent,
	description: 'Displays a cities current yields',
	classNames: ['flex', 'self-center'],
});