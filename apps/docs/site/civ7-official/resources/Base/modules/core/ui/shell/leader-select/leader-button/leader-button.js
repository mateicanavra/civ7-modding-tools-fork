/**
 * @file leader-button.ts
 * @copyright 2020-2022, Firaxis Games
 * @description A button used to represent a leader, made for the leader-select screen in the lobby.
 */
import FxsActivatable from '/core/ui/components/fxs-activatable.js';
export class LeaderButton extends FxsActivatable {
    constructor() {
        super(...arguments);
        this._isSelected = false;
    }
    set leaderData(leaderData) {
        this._leaderData = leaderData;
        this.updateLeaderData();
    }
    get leaderData() {
        return this._leaderData;
    }
    set isSelected(value) {
        this._isSelected = value;
        this.updateSelection();
    }
    get isSelected() {
        return this._isSelected;
    }
    onInitialize() {
        super.onInitialize();
        const fragment = document.createDocumentFragment();
        this.iconEle = document.createElement("fxs-icon");
        this.iconEle.classList.add("leader-button-icon", "absolute", "inset-0", "bg-cover", "pointer-events-none");
        this.iconEle.setAttribute("data-icon-context", "CIRCLE_MASK");
        fragment.appendChild(this.iconEle);
        this.selectEle = document.createElement("div");
        this.selectEle.classList.add("leader-button-ring-selected", "absolute", "-inset-5", "hidden", "pointer-events-none");
        fragment.appendChild(this.selectEle);
        this.lvlRingEle = document.createElement("fxs-ring-meter");
        this.lvlRingEle.classList.add("absolute", "inset-0", "pointer-events-none");
        this.lvlRingEle.setAttribute("ring-class", "leader-button-xp-ring");
        fragment.appendChild(this.lvlRingEle);
        const bottomBar = document.createElement("div");
        bottomBar.classList.add("absolute", "-bottom-1", "inset-x-0", "flex", "flex-row", "justify-center", "pointer-events-none");
        fragment.appendChild(bottomBar);
        this.lvlEle = document.createElement("div");
        this.lvlEle.classList.add("leader-button-level-circle", "font-body-sm", "text-center");
        bottomBar.appendChild(this.lvlEle);
        const lockIcon = document.createElement("div");
        lockIcon.classList.add("leader-button-lock-icon", "img-lock2", "absolute", "-bottom-2", "left-8", "size-16");
        fragment.appendChild(lockIcon);
        this.updateLeaderData();
        this.Root.setAttribute("data-tooltip-anchor", "top");
        this.Root.appendChild(fragment);
    }
    updateLeaderData() {
        if (this._leaderData && this.iconEle && this.lvlEle) {
            this.iconEle.setAttribute("data-icon-id", this._leaderData.icon);
            this.lvlEle.innerHTML = this._leaderData.level.toString();
            this.lvlRingEle?.setAttribute("min-value", this._leaderData.prevLevelXp.toString());
            this.lvlRingEle?.setAttribute("max-value", this._leaderData.nextLevelXp.toString());
            this.lvlRingEle?.setAttribute("value", this._leaderData.currentXp.toString());
            this.Root.classList.toggle("leader-button-locked", this._leaderData.isLocked);
            this.Root.setAttribute("data-tooltip-content", this._leaderData.name);
            const hasNoLevel = this._leaderData.isLocked || (this.leaderData?.level ?? 0) == 0;
            this.lvlRingEle?.classList.toggle("hidden", hasNoLevel);
            this.lvlEle?.classList.toggle("hidden", hasNoLevel);
        }
    }
    updateSelection() {
        this.selectEle?.classList.toggle("hidden", !this._isSelected);
    }
}
Controls.define('leader-button', {
    createInstance: LeaderButton,
    description: 'Button for selecting a leader',
    classNames: ["leader-button-bg", "relative", "w-32", "h-32", "pointer-events-auto"],
    styles: ['fs://game/core/ui/shell/leader-select/leader-button/leader-button.css'],
    tabIndex: -1
});

//# sourceMappingURL=file:///core/ui/shell/leader-select/leader-button/leader-button.js.map
