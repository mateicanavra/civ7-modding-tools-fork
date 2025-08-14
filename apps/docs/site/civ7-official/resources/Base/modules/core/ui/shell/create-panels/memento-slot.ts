/**
 * @file memento-slot.ts
 * @copyright 2024, Firaxis Games
 * @description Displays information for a given memento slot
 */

import { FxsActivatable } from "/core/ui/components/fxs-activatable.js";
import { MementoSlotData, MementoSlotType } from "/core/ui/shell/create-panels/leader-select-model.js";

export const MementoSlotSelectedEventName: string = 'memento-slot-selected';

export class MementoSlot extends FxsActivatable {
	private backgroundEle = document.createElement("div");
	private iconEle = document.createElement("div");
	private labelEle = document.createElement("div");

	private _slotData?: MementoSlotData;
	private _slottedMemento?: MementosUIData;
	private _selected = false;

	private mementoDisplayData = Online.Metaprogression.getMementosData();

	public set slotData(value: MementoSlotData | undefined) {
		this._slotData = value;
		this.updateCurrentMemento();
	}

	public get slotData() {
		return this._slotData;
	}

	public set selected(value: boolean) {
		this._selected = value;
		this.backgroundEle.classList.toggle("memento-border-selected", value);
	}

	public get selected() {
		return this._selected;
	}

	constructor(root: ComponentRoot<MementoSlot>) {
		super(root);

		this.Root.classList.add("memento-slot", "flex", "flex-col", "mx-3", "items-center", "justify-center", "w-40");

		this.backgroundEle.classList.add("memento-border", "w-24", "h-24", "relative");
		this.Root.appendChild(this.backgroundEle);

		this.iconEle.classList.add("absolute", "inset-4");
		this.backgroundEle.appendChild(this.iconEle);

		this.labelEle.classList.add("memento-slot-label", "font-body-base", "text-secondary", "text-center", "mt-1", "font-fit-shrink");
		this.Root.appendChild(this.labelEle);

		this.Root.setAttribute("data-audio-group-ref", "memento-slot");
	}

	public setActiveMemento(mementoId: string) {
		if (this._slotData) {
			const foundMemento = this._slotData.availableMementos.find(m => m.value == mementoId);

			if (foundMemento) {
				this._slotData.currentMemento = foundMemento;
				this.updateCurrentMemento();
				return true;
			}
		}

		return false;
	}

	private updateCurrentMemento() {
		this._slottedMemento = this.mementoDisplayData.find(m => m.mementoTypeId == this._slotData?.currentMemento.value);
		this.iconEle.style.backgroundImage = this.getMementoSlotIcon();
		this.iconEle.style.backgroundSize = 'cover';
		this.iconEle.style.backgroundRepeat = 'no-repeat';
		this.iconEle.style.backgroundPosition = 'center';
		this.Root.setAttribute("data-tooltip-content", this.getToolTip());
		this.labelEle.innerHTML = this.getLabel();
	}

	private getMementoSlotIcon() {
		const data = this._slotData!;
		let icon = "";

		if (data.currentMemento.value != "NONE") {
			if (this._slottedMemento?.mementoIcon) {
				icon = `url("fs://game/${this._slottedMemento.mementoIcon}")`
			} else {
				icon = `url("fs://game/mem_min_leader.png")`
			}

		} else if (data.slotType == MementoSlotType.Minor) {
			icon = data.isLocked
				? 'url("fs://game/shell_memento-lock.png")'
				: 'url("fs://game/shell_memento-plus.png")';
		} else {
			icon = data.isLocked
				? 'url("fs://game/shell_memento-maj-lock.png")'
				: 'url("fs://game/shell_memento-maj-plus.png")';
		}

		return icon;
	}

	private getToolTip() {
		// TODO: This probably needs to be a seperate control to match how it looks in the wireframes
		if (this._slotData!.currentMemento.name == "LOC_MEMENTO_NONE_NAME") {
			if (this._slotData!.isLocked) {
				return Locale.stylize(this._slotData!.unlockReason);
			} else {
				const addTooltip = "LOC_CREATE_GAME_ADD_MEMENTO_MINOR";
				return Locale.stylize(addTooltip);
			}
		}

		const name = Locale.stylize(this._slotData!.currentMemento.name as string);
		const desc = Locale.stylize(this._slotData!.currentMemento.functionalDescription as string);
		const flavor = Locale.stylize(this._slotData!.currentMemento.description as string);
		return `[n][style:font-title-lg]${name}[/style][n][style:font-body-base]${desc}[/style][n][style:font-body-sm]${flavor}[/style]`;
	}

	private getLabel() {
		const label = this._slotData!.isLocked
			? "LOC_MEMENTO_LOCKED_NAME"
			: this._slotData!.currentMemento.name as string;

		// TODO: Remove the replace when breaking hyphen support is added to stylize
		return Locale.stylize(label).replace("-", "&hyphen;");
	}
}

Controls.define('memento-slot', {
	createInstance: MementoSlot,
	description: 'A memento slot',
	styles: ['fs://game/core/ui/shell/create-panels/memento-slot.css'],
});

declare global {
	interface HTMLElementTagNameMap {
		'memento-slot': ComponentRoot<MementoSlot>
	}
}