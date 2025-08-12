/**
 * @file memento-slot.ts
 * @copyright 2024, Firaxis Games
 * @description Displays information for a given memento slot
 */
import { FxsActivatable } from "/core/ui/components/fxs-activatable.js";
import { MementoSlotType } from "/core/ui/shell/create-panels/leader-select-model.js";
export const MementoSlotSelectedEventName = 'memento-slot-selected';
export class MementoSlot extends FxsActivatable {
    set slotData(value) {
        this._slotData = value;
        this.updateCurrentMemento();
    }
    get slotData() {
        return this._slotData;
    }
    set selected(value) {
        this._selected = value;
        this.backgroundEle.classList.toggle("memento-border-selected", value);
    }
    get selected() {
        return this._selected;
    }
    constructor(root) {
        super(root);
        this.backgroundEle = document.createElement("div");
        this.iconEle = document.createElement("div");
        this.labelEle = document.createElement("div");
        this._selected = false;
        this.mementoDisplayData = Online.Metaprogression.getMementosData();
        this.Root.classList.add("memento-slot", "flex", "flex-col", "mx-3", "items-center", "justify-center", "w-40");
        this.backgroundEle.classList.add("memento-border", "w-24", "h-24", "relative");
        this.Root.appendChild(this.backgroundEle);
        this.iconEle.classList.add("absolute", "inset-4");
        this.backgroundEle.appendChild(this.iconEle);
        this.labelEle.classList.add("memento-slot-label", "font-body-base", "text-secondary", "text-center", "mt-1", "font-fit-shrink");
        this.Root.appendChild(this.labelEle);
        this.Root.setAttribute("data-audio-group-ref", "memento-slot");
    }
    setActiveMemento(mementoId) {
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
    updateCurrentMemento() {
        this._slottedMemento = this.mementoDisplayData.find(m => m.mementoTypeId == this._slotData?.currentMemento.value);
        this.iconEle.style.backgroundImage = this.getMementoSlotIcon();
        this.iconEle.style.backgroundSize = 'cover';
        this.iconEle.style.backgroundRepeat = 'no-repeat';
        this.iconEle.style.backgroundPosition = 'center';
        this.Root.setAttribute("data-tooltip-content", this.getToolTip());
        this.labelEle.innerHTML = this.getLabel();
    }
    getMementoSlotIcon() {
        const data = this._slotData;
        let icon = "";
        if (data.currentMemento.value != "NONE") {
            if (this._slottedMemento?.mementoIcon) {
                icon = `url("fs://game/${this._slottedMemento.mementoIcon}")`;
            }
            else {
                icon = `url("fs://game/mem_min_leader.png")`;
            }
        }
        else if (data.slotType == MementoSlotType.Minor) {
            icon = data.isLocked
                ? 'url("fs://game/shell_memento-lock.png")'
                : 'url("fs://game/shell_memento-plus.png")';
        }
        else {
            icon = data.isLocked
                ? 'url("fs://game/shell_memento-maj-lock.png")'
                : 'url("fs://game/shell_memento-maj-plus.png")';
        }
        return icon;
    }
    getToolTip() {
        // TODO: This probably needs to be a seperate control to match how it looks in the wireframes
        if (this._slotData.currentMemento.name == "LOC_MEMENTO_NONE_NAME") {
            if (this._slotData.isLocked) {
                return Locale.stylize(this._slotData.unlockReason);
            }
            else {
                const addTooltip = "LOC_CREATE_GAME_ADD_MEMENTO_MINOR";
                return Locale.stylize(addTooltip);
            }
        }
        const name = Locale.stylize(this._slotData.currentMemento.name);
        const desc = Locale.stylize(this._slotData.currentMemento.functionalDescription);
        const flavor = Locale.stylize(this._slotData.currentMemento.description);
        return `[n][style:font-title-lg]${name}[/style][n][style:font-body-base]${desc}[/style][n][style:font-body-sm]${flavor}[/style]`;
    }
    getLabel() {
        const label = this._slotData.isLocked
            ? "LOC_MEMENTO_LOCKED_NAME"
            : this._slotData.currentMemento.name;
        // TODO: Remove the replace when breaking hyphen support is added to stylize
        return Locale.stylize(label).replace("-", "&hyphen;");
    }
}
Controls.define('memento-slot', {
    createInstance: MementoSlot,
    description: 'A memento slot',
    styles: ['fs://game/core/ui/shell/create-panels/memento-slot.css'],
});

//# sourceMappingURL=file:///core/ui/shell/create-panels/memento-slot.js.map
