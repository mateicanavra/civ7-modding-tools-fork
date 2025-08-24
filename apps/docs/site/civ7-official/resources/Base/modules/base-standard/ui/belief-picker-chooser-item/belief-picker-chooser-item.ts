import { ChooserItem } from "/base-standard/ui/chooser-item/chooser-item.js";
import { BeliefPickerChooserNode } from "/base-standard/ui/belief-picker-chooser-item/model-belief-picker-chooser-item.js";

export class BeliefPickerChooserItem extends ChooserItem {
	public get beliefPickerChooserNode(): BeliefPickerChooserNode | null {
		return this._chooserNode as BeliefPickerChooserNode;
	}

	public set beliefPickerChooserNode(value: BeliefPickerChooserNode | null) {
		this._chooserNode = value;
	}

	render() {
		super.render();
		const chooserItem = document.createDocumentFragment();

		const node = this.beliefPickerChooserNode;
		if (!node) {
			console.error("belief-picker-chooser-item: render() - beliefPickerChooserNode was null!");
			return;
		}

		this.Root.classList.add("flex", "my-1", "ml-3", "min-h-20", "w-full");

		//open slot
		if (!node.isLocked && node.name == "") {
			this.Root.classList.add("belief-picker_slot", "items-center", "justify-center");

			const borderContainer = document.createElement("div");
			borderContainer.classList.value = "absolute size-full flex relative";
			chooserItem.appendChild(borderContainer);

			const leftBorder = document.createElement("div");
			leftBorder.classList.value = "belief-picker-chooser-item_border belief-border-left bg-no-repeat bg-cover h-full w-1\\/2";
			borderContainer.appendChild(leftBorder);

			const rightBorder = document.createElement("div");
			rightBorder.classList.value = "belief-picker-chooser-item_border -scale-x-100 bg-no-repeat bg-cover h-full w-1\\/2";
			borderContainer.appendChild(rightBorder);

			const textContainer = document.createElement("div");
			textContainer.classList.value = "flex absolute items-center relative";
			chooserItem.appendChild(textContainer);

			const plusIcon = document.createElement("div");
			plusIcon.classList.value = "belief-picker-chooser-item_plus size-8 bg-contain bg-no-repeat";
			textContainer.appendChild(plusIcon);

			const descriptionText = document.createElement("div");
			descriptionText.classList.value = "font-title-lg text-accent-1 tracking-150";
			descriptionText.setAttribute("data-l10n-id", node.description);
			textContainer.appendChild(descriptionText);
		}
		//filled slot
		else if (node.name.length > 0) {
			this.Root.classList.add("items-center", "items-start");

			this.Root.classList.toggle('cursor-not-allowed', !node.isSwappable);
			this.Root.classList.toggle('cursor-pointer', node.isSwappable);

			if (node.isSwappable) {
				this.Root.classList.add("chooser-item_unlocked", "grow");
			}
			else {
				this.Root.classList.add("belief-picker_slot");
				this.Root.removeAttribute("tabindex");
			}

			const primaryIcon: HTMLElement = this.createChooserIcon(node.primaryIcon);
			chooserItem.appendChild(primaryIcon);

			const textContainer: HTMLDivElement = document.createElement("div");
			textContainer.classList.value = "flex flex-col flex-auto px-1 pt-3 relative";
			chooserItem.appendChild(textContainer);

			const title: HTMLDivElement = document.createElement("div");
			title.classList.value = "font-title-sm";
			title.setAttribute("data-l10n-id", node.name);
			textContainer.appendChild(title);

			const description: HTMLDivElement = document.createElement("div");
			description.classList.value = "font-body-sm";
			description.setAttribute("data-l10n-id", node.description);
			textContainer.appendChild(description);
		}

		//locked slot
		else {
			this.Root.classList.add("belief-picker_slot", "items-center", 'cursor-not-allowed', 'grow');
			this.Root.classList.remove('cursor-pointer');
			this.Root.setAttribute("disabled", "true");

			const primaryIcon: HTMLElement = this.createChooserIcon(node.primaryIcon);
			chooserItem.appendChild(primaryIcon);

			const description: HTMLDivElement = document.createElement("div");
			description.classList.value = "font-body-sm text-accent-2 px-1 relative";
			description.setAttribute("data-l10n-id", node.description);
			chooserItem.appendChild(description);

			this.Root.removeAttribute("tabindex");
		}

		this.Root.appendChild(chooserItem);
	}

}

Controls.define('belief-picker-chooser-item', {
	createInstance: BeliefPickerChooserItem,
	description: 'A chooser item to be used with the belief picker',
	classNames: ['belief-picker-chooser-item', "relative", "group"],
	styles: [
		'fs://game/base-standard/ui/chooser-item/chooser-item.css',
		'fs://game/base-standard/ui/belief-picker-chooser-item/belief-picker-chooser-item.css'
	],
	images: ['fs://game/hud_sidepanel_list-bg.png', 'fs://game/hud_list-focus_frame.png', 'fs://game/hud_turn-timer.png', 'fs://game/hud_civics-icon_frame.png'],
	attributes: [{ name: 'reveal' }, { name: 'selected' }, {name: 'disabled'}]
});

declare global {
	interface HTMLElementTagNameMap {
		'belief-picker-chooser-item': ComponentRoot<BeliefPickerChooserItem>
	}
}
