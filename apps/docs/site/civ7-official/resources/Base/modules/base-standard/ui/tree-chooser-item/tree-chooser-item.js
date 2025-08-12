/**
 * @file fxs-chooser-item.ts
 * @copyright 2024, Firaxis Games
 */
import { AdvisorUtilities } from '/base-standard/ui/tutorial/tutorial-support.js';
import { FxsChooserItem } from "/core/ui/components/fxs-chooser-item.js";
/**
 * A chooser item to be used with the tech or civic choosers
 */
export class TreeChooserItem extends FxsChooserItem {
    constructor() {
        super(...arguments);
        this._treeChooserNode = null;
    }
    get treeChooserNode() {
        return this._treeChooserNode;
    }
    set treeChooserNode(value) {
        this._treeChooserNode = value;
    }
    onInitialize() {
        super.onInitialize();
        this.selectOnFocus = false;
        this.render();
    }
    render() {
        const chooserItem = document.createDocumentFragment();
        const node = this._treeChooserNode;
        this.Root.classList.add("text-accent-2", "flex", "pointer-events-auto");
        this.Root.setAttribute('node-tree-type', node.treeType.toString());
        if (node.isLocked) {
            this.Root.setAttribute("disabled", "true");
        }
        else {
            this.Root.setAttribute('node-id', node.id.toString());
        }
        this.Root.setAttribute('tabindex', "-1");
        this.Root.setAttribute('hover-only-trigger', "true");
        const primaryIcon = this.createChooserIcon(node.isLocked ? node.icon : node.primaryIcon, node.isLocked);
        const details = document.createElement("div");
        details.classList.add("tree-chooser-item__details", "flex", "flex-col", "items-stretch", "pointer-events-none", "ml-3", "mb-3", "relative");
        const title = document.createElement("div");
        title.classList.add("font-title-sm", "m-2\\.5");
        title.innerHTML = node.name;
        details.appendChild(title);
        if (node.isLocked) {
            const reqStatuses = document.createElement("div");
            reqStatuses.classList.add("font-body-sm", "mx-2\\.5");
            reqStatuses.innerHTML = node.reqStatuses;
            details.appendChild(reqStatuses);
        }
        else {
            for (const unlockDepth of node.unlocksByDepth) {
                const unlockEle = document.createElement("div");
                unlockEle.classList.add("tree-chooser-item__details-unlocks", "flex-row", "flex-wrap");
                if (unlockDepth.isCurrent) {
                    unlockEle.classList.add("current");
                }
                if (unlockDepth.isCompleted) {
                    unlockEle.classList.add("completed");
                }
                for (const unlockItem of unlockDepth.unlocks) {
                    const unlockItemEle = document.createElement("div");
                    unlockItemEle.classList.add("flex", 'items-stretch', "w-9", "h-9", "mr-1\\.5", "mb-2.\\5");
                    const unlockItemIconImg = document.createElement("img");
                    unlockItemIconImg.classList.add("pointer-events-none", "w-9", "h-9");
                    unlockItemIconImg.src = unlockItem.icon;
                    unlockItemEle.appendChild(unlockItemIconImg);
                    unlockEle.appendChild(unlockItemEle);
                }
                details.appendChild(unlockEle);
            }
        }
        const chooserItemNode = document.createElement("div");
        chooserItemNode.classList.add("tree-chooser-item__node", "relative", "flex", "flex-col", "items-end", "justify-end");
        let turns = null;
        let percentBarContainer = null;
        if (node.isLocked) {
            percentBarContainer = document.createElement("div");
            percentBarContainer.classList.add("flex", "flex-col", 'items-center', "justify-end", "my-2", "mx-3");
            const percentLabel = document.createElement("div");
            percentLabel.classList.add("font-title-xs");
            percentLabel.innerHTML = node.percentCompleteLabel;
            const percentBar = document.createElement("div");
            percentBar.classList.add("bg-black", "relative", "w-11", "h-2");
            const percentBarFill = document.createElement("div");
            percentBarFill.classList.add("tree-chooser-item__percent-bar-fill", "absolute", "h-full");
            percentBarFill.style.setProperty("width", `${node.percentComplete}`);
            percentBar.appendChild(percentBarFill);
            percentBarContainer.appendChild(percentLabel);
            percentBarContainer.appendChild(percentBar);
        }
        else {
            turns = document.createElement("div");
            turns.classList.add("flex", "flex-col", 'items-center', "justify-end", "my-2", "mx-3");
            const turnsInfo = document.createElement("div");
            turnsInfo.classList.add("flex", "flex-row", "justify-end", 'items-center');
            const turnsClock = document.createElement("div");
            turnsClock.classList.add("tree-chooser-item__turns-clock", "relative", "pointer-events-none", "w-8", "h-8", "bg-contain", "bg-no-repeat", "bg-center");
            const turnLabel = document.createElement("div");
            turnLabel.classList.add("font-title-xs", "min-w-5");
            turnLabel.textContent = node.turns.toString();
            const advisorRecommendation = AdvisorUtilities.createAdvisorRecommendation(node.recommendations);
            turnsInfo.appendChild(turnsClock);
            turnsInfo.appendChild(turnLabel);
            turns.appendChild(turnsInfo);
            turns.appendChild(advisorRecommendation);
        }
        chooserItem.appendChild(primaryIcon);
        chooserItem.appendChild(details);
        chooserItem.appendChild(chooserItemNode);
        if (node.isLocked) {
            chooserItem.appendChild(percentBarContainer);
        }
        else {
            chooserItemNode.appendChild(turns);
        }
        this.Root.appendChild(chooserItem);
    }
}
Controls.define('tree-chooser-item', {
    createInstance: TreeChooserItem,
    description: 'A chooser item to be used with the tech or civic choosers',
    classNames: ['tree-chooser-item', "relative", "group"],
    styles: [
        'fs://game/base-standard/ui/tree-chooser-item/tree-chooser-item.css',
        'fs://game/base-standard/ui/chooser-item/chooser-item.css'
    ],
    images: ['fs://game/hud_sidepanel_list-bg.png', 'fs://game/hud_list-focus_frame.png', 'fs://game/hud_turn-timer.png', 'fs://game/hud_civics-icon_frame.png'],
    attributes: [{ name: 'reveal' }, { name: 'selected' }]
});

//# sourceMappingURL=file:///base-standard/ui/tree-chooser-item/tree-chooser-item.js.map
