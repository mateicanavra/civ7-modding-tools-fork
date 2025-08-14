/**
 * Advance Start Tooltip
 * @copyright 2024, Firaxis Gmaes
 * @description The tooltip for advance start information.
 */
import AdvancedStart from '/base-standard/ui/advanced-start/model-advanced-start.js';
import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
class AdvanceStartTooltipType {
    constructor() {
        this.fragment = document.createDocumentFragment();
        this.tooltip = null;
        this.hoveredNodeID = null;
        this.toolTipText = null;
    }
    getHTML() {
        this.tooltip = document.createElement('fxs-tooltip');
        this.tooltip.classList.add('advanced-start-tooltip');
        this.tooltip.appendChild(this.fragment);
        return this.tooltip;
    }
    reset() {
        this.fragment = document.createDocumentFragment();
        while (this.tooltip?.hasChildNodes()) {
            this.tooltip.removeChild(this.tooltip.lastChild);
        }
    }
    isUpdateNeeded(target) {
        const nodeIDString = target.getAttribute("node-id");
        if (!nodeIDString) {
            this.hoveredNodeID = null;
            if (!this.fragment) {
                return true;
            }
            return false;
        }
        if (nodeIDString != this.hoveredNodeID || (nodeIDString == this.hoveredNodeID && !this.fragment)) {
            this.hoveredNodeID = nodeIDString;
            this.toolTipText = AdvancedStart.tooltipText(this.hoveredNodeID);
            return true;
        }
        return false;
    }
    update() {
        if (!this.hoveredNodeID) {
            console.error("advanced-start-tooltip: Attempting to update Advanced Start info tooltip, but unable to get selected node");
            return;
        }
        this.toolTipText = AdvancedStart.tooltipText(this.hoveredNodeID);
        if (!this.toolTipText?.locKey) {
            return;
        }
        const headerContainer = document.createElement('div');
        headerContainer.classList.add("advanced-start-tooltip__header-container");
        const textContainer = document.createElement("div");
        textContainer.classList.add("advanced-start-tooltip__text-container", 'font-body-base', 'text-accent-1');
        textContainer.innerHTML = Locale.compose(this.toolTipText?.locKey);
        this.fragment.appendChild(headerContainer);
        this.fragment.appendChild(textContainer);
    }
    isBlank() {
        return this.toolTipText == null;
    }
}
TooltipManager.registerType('advanceStart', new AdvanceStartTooltipType());

//# sourceMappingURL=file:///base-standard/ui/tooltips/advanced-start-tooltip.js.map
