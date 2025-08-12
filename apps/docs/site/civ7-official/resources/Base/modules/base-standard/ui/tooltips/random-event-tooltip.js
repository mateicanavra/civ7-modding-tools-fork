/**
 * random-event-tooltip.ts
 * @copyright 2024, Firaxis Games
 * @description The tooltip for showing plot icon random event.
 */
import { RandomEventsLayer } from '/base-standard/ui/lenses/layer/random-events-layer.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import TooltipManager, { PlotTooltipPriority } from '/core/ui/tooltips/tooltip-manager.js';
class RandomEventTooltipType {
    constructor() {
        this.hoveredX = -1;
        this.hoveredY = -1;
        this.eventData = null;
        this.tooltip = document.createElement('fxs-tooltip');
        this.eventDescription = document.createElement('div');
        const container = document.createElement('div');
        container.classList.value = 'flex flex-row text-accent-2';
        this.tooltip.appendChild(container);
        this.eventDescription.classList.value = 'flex text-sm';
        container.appendChild(this.eventDescription);
    }
    getHTML() {
        return this.tooltip;
    }
    reset() {
        this.eventDescription.innerHTML = '';
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
        const { x, y } = this.getCoordsFromTarget(target);
        if (x != this.hoveredX || y != this.hoveredY) {
            this.hoveredX = x;
            this.hoveredY = y;
            this.randomEvent = RandomEventsLayer.instance.getRandomEventResult(this.hoveredX, this.hoveredY);
            if (this.randomEvent) {
                this.eventData = GameInfo.RandomEventUI.lookup(this.randomEvent.eventClass);
            }
            else {
                this.eventData = null;
            }
            return true;
        }
        return false;
    }
    update() {
        if (!this.randomEvent || !this.eventData) {
            return;
        }
        const descriptionElement = document.createElement('span');
        descriptionElement.setAttribute('data-l10n-id', this.eventData.Tooltip);
        this.eventDescription.appendChild(descriptionElement);
    }
    isBlank() {
        return !this.randomEvent
            || !this.eventData
            || LensManager.getActiveLens() !== "fxs-settler-lens";
    }
}
const instance = new RandomEventTooltipType();
TooltipManager.registerType('random-event', instance);
TooltipManager.registerPlotType('random-event', PlotTooltipPriority.HIGH, instance);

//# sourceMappingURL=file:///base-standard/ui/tooltips/random-event-tooltip.js.map
