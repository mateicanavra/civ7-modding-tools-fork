/**
 * @file civ-button.ts
 * @copyright 2020-2024, Firaxis Games
 */
import FxsActivatable from '/core/ui/components/fxs-activatable.js';
const selectedGradient = "radial-gradient(86.87% 86.87% at 50% 50%, rgba(219, 219, 181, 0.75) 0%, rgba(219, 219, 181, 0) 100%)";
const bgGradient = "linear-gradient(180deg, #333640 0%, #1C1E26 100%)";
export class CivButton extends FxsActivatable {
    set isSelected(value) {
        this._isSelected = value;
        this.Root.classList.toggle("civ-button-bg-focus", this._isSelected);
        this.iconEle.style.backgroundImage = `url("${this.civData.icon}")`;
        this.Root.style.backgroundImage = this.isSelected
            ? `${selectedGradient}, ${bgGradient}`
            : this.Root.style.backgroundImage = bgGradient;
        if (this.civData.isHistoricalChoice) {
            this.Root.setAttribute("data-tooltip-content", `${this.civData.name}[N]${this.civData.historicalChoiceReason}`);
        }
        else {
            this.Root.setAttribute("data-tooltip-content", this.civData.name);
        }
    }
    get isSelected() {
        return this._isSelected;
    }
    set isLocked(value) {
        this._isLocked = value;
        this.Root.classList.toggle("civ-button-locked", value);
    }
    get isLocked() {
        return this._isLocked;
    }
    set civData(civData) {
        this._civData = civData;
        this.isSelected = false;
        this.isLocked = civData.isLocked;
    }
    get civData() {
        return this._civData;
    }
    constructor(root) {
        super(root);
        this._isSelected = false;
        this._isLocked = false;
        this.iconEle = document.createElement("div");
        this.iconEle.classList.add("civ-button-icon", "absolute", "inset-0", "pointer-events-none");
        this.Root.insertAdjacentElement("afterbegin", this.iconEle);
        this.Root.setAttribute("data-tooltip-anchor", "top");
        const lockIcon = document.createElement("div");
        lockIcon.classList.add("civ-button-lock-icon", "img-lock2", "absolute", "-bottom-6", "left-2\\.5", "size-18");
        this.Root.appendChild(lockIcon);
    }
}
Controls.define('civ-button', {
    createInstance: CivButton,
    description: 'Button for selecting a civ',
    classNames: ['civ-button-bg', 'flex', 'flex-row', "relative"],
    styles: ['fs://game/core/ui/shell/civ-select/civ-button/civ-button.css'],
    tabIndex: -1
});

//# sourceMappingURL=file:///core/ui/shell/civ-select/civ-button/civ-button.js.map
