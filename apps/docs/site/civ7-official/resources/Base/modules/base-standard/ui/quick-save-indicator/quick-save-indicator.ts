/**
 * @file player-yields-report-screen.ts
 * @copyright 2020-2022, Firaxis Games
 * @description Breakdown of each of the yields available in game.
 */

import Panel from '/core/ui/panel-support.js';
import { QuickSaveDoneEventName } from '/core/ui/save-load/model-save-load.js';

class QuickSaveIndicator extends Panel {

	private onQuickSave: EventListener = this.createQuickSaveIndicator.bind(this);

	onAttach() {
		super.onAttach();
		window.addEventListener(QuickSaveDoneEventName, this.onQuickSave);
	}

	onDetach() {
		window.removeEventListener(QuickSaveDoneEventName, this.onQuickSave);
		super.onDetach();
	}

	private createQuickSaveIndicator() {
		const previousQuickSaveIndicator: Element | null = this.Root.querySelector(".save-container");
		if (previousQuickSaveIndicator) {
			this.Root.removeChild(previousQuickSaveIndicator);
		}
		const itemContainer: HTMLDivElement = document.createElement("div");
		itemContainer.classList.add("save-container", "save-animation");
		const itemElement: HTMLDivElement = document.createElement("div");
		itemElement.classList.add("save-item");
		itemContainer.appendChild(itemElement);
		const itemIcon: HTMLDivElement = document.createElement("div");
		itemIcon.classList.add("save-icon");
		itemElement.appendChild(itemIcon);
		const itemInfo: HTMLDivElement = document.createElement("div");
		itemInfo.classList.add("save-info");
		itemElement.appendChild(itemInfo);
		const itemTitle: HTMLDivElement = document.createElement("div");
		itemTitle.classList.add("save-title");
		itemTitle.innerHTML = Locale.compose("LOC_QUICK_SAVE_INDICATOR_TITLE");
		itemInfo.appendChild(itemTitle);
		const itemDescription: HTMLDivElement = document.createElement("div");
		itemDescription.classList.add("save-description");
		itemDescription.innerHTML = Locale.compose("LOC_QUICK_SAVE_INDICATOR_DESCRIPTION", "LOC_QUICK_SAVE_NAME")
		itemInfo.appendChild(itemDescription);
		this.Root.appendChild(itemContainer);
	}

}

Controls.define('quick-save-indicator', {
	createInstance: QuickSaveIndicator,
	description: 'Indicator when a quick save happens',
	classNames: ['quick-save'],
	styles: ['fs://game/base-standard/ui/quick-save-indicator/quick-save-indicator.css']
});