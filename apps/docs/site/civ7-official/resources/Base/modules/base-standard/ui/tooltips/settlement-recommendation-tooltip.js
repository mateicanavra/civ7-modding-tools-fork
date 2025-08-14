/**
 * settlement-recommendation-tooltip.ts
 * @copyright 2024, Firaxis Games
 * @description The tooltip for showing why a plot is recommended for settlement.
 */
import { SettlementRecommendationsLayer } from '/base-standard/ui/lenses/layer/settlement-recommendations-layer.js';
import ActionHandler from '/core/ui/input/action-handler.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import TooltipManager, { PlotTooltipPriority } from '/core/ui/tooltips/tooltip-manager.js';
class SettlementRecommendationTooltipType {
    constructor() {
        this.hoveredX = -1;
        this.hoveredY = -1;
        this.shownByPlot = false;
        this.tooltip = document.createElement('fxs-tooltip');
        this.iconColumn = document.createElement('div');
        this.titleColumn = document.createElement('div');
        this.descriptionColumn = document.createElement('div');
        const container = document.createElement('div');
        container.classList.value = 'flex flex-row text-accent-2';
        this.tooltip.appendChild(container);
        this.iconColumn.classList.value = 'flex flex-col';
        container.appendChild(this.iconColumn);
        this.titleColumn.classList.value = 'flex flex-col justify-around text-sm font-bold mr-5';
        container.appendChild(this.titleColumn);
        this.descriptionColumn.classList.value = 'flex flex-col justify-around text-sm';
        container.appendChild(this.descriptionColumn);
    }
    getHTML() {
        return this.tooltip;
    }
    reset() {
        this.iconColumn.innerHTML = '';
        this.titleColumn.innerHTML = '';
        this.descriptionColumn.innerHTML = '';
    }
    getCoordsFromTarget(target) {
        if (target instanceof HTMLElement) {
            const xAttr = target.getAttribute('x');
            const yAttr = target.getAttribute('y');
            if (xAttr !== null && yAttr !== null) {
                return {
                    x: parseInt(xAttr),
                    y: parseInt(yAttr)
                };
            }
            else {
                return { x: -1, y: -1 };
            }
        }
        else {
            return target;
        }
    }
    isUpdateNeeded(target) {
        this.shownByPlot = !(target instanceof HTMLElement);
        const { x, y } = this.getCoordsFromTarget(target);
        if (x != this.hoveredX || y != this.hoveredY) {
            this.hoveredX = x;
            this.hoveredY = y;
            this.recommendation = SettlementRecommendationsLayer.instance.getRecommendationResult(this.hoveredX, this.hoveredY);
            return true;
        }
        return false;
    }
    update() {
        const recommendation = this.recommendation;
        if (!recommendation) {
            return;
        }
        for (const { positive, title, description } of recommendation.factors) {
            const imgClass = positive ? 'img-plus-icon' : 'img-minus-icon';
            const imgElement = document.createElement('span');
            imgElement.classList.value = imgClass;
            this.iconColumn.appendChild(imgElement);
            const titleElement = document.createElement('span');
            titleElement.setAttribute('data-l10n-id', title);
            this.titleColumn.appendChild(titleElement);
            const descriptionElement = document.createElement('span');
            descriptionElement.setAttribute('data-l10n-id', description);
            this.descriptionColumn.appendChild(descriptionElement);
        }
    }
    isBlank() {
        return !this.recommendation
            || (this.shownByPlot && !ActionHandler.isGamepadActive)
            || LensManager.getActiveLens() !== "fxs-settler-lens";
    }
}
const instance = new SettlementRecommendationTooltipType();
TooltipManager.registerType('settlement-recommendation', instance);
TooltipManager.registerPlotType('settlement-recommendation', PlotTooltipPriority.HIGH, instance);

//# sourceMappingURL=file:///base-standard/ui/tooltips/settlement-recommendation-tooltip.js.map
