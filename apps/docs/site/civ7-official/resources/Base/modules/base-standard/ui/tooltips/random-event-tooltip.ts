/**
 * random-event-tooltip.ts
 * @copyright 2024, Firaxis Games
 * @description The tooltip for showing plot icon random event.
 */

import { PlotRandomEventData, RandomEventsLayer } from '/base-standard/ui/lenses/layer/random-events-layer.js';
import LensManager from '/core/ui/lenses/lens-manager.js'
import TooltipManager, { PlotTooltipPriority, TooltipType } from '/core/ui/tooltips/tooltip-manager.js';

class RandomEventTooltipType implements TooltipType<HTMLElement | PlotCoord> {
	private hoveredX = -1;
	private hoveredY = -1;
	private randomEvent: PlotRandomEventData | undefined;
	private eventData: RandomEventUIDefinition | null = null;

	private readonly tooltip = document.createElement('fxs-tooltip')
	private readonly eventDescription = document.createElement('div');

	constructor() {
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

	private getCoordsFromTarget(target: HTMLElement | PlotCoord) {
		if (target instanceof HTMLElement) {
			const xAttr = target.getAttribute('x');
			const yAttr = target.getAttribute('y');
			if (xAttr !== null && yAttr !== null) {
				return {
					x: parseInt(xAttr),
					y: parseInt(yAttr)
				};
			} else {
				return { x: -1, y: -1 };
			}
		} else {
			return target;
		}
	}

	isUpdateNeeded(target: HTMLElement | PlotCoord): boolean {
		const { x, y } = this.getCoordsFromTarget(target);

		if (x != this.hoveredX || y != this.hoveredY) {
			this.hoveredX = x;
			this.hoveredY = y;
			this.randomEvent = RandomEventsLayer.instance.getRandomEventResult(this.hoveredX, this.hoveredY);
			if (this.randomEvent) {
				this.eventData = GameInfo.RandomEventUI.lookup(this.randomEvent.eventClass);
			} else {
				this.eventData = null;
			}

			return true;
		}

		return false;
	}

	update(): void {
		if (!this.randomEvent || !this.eventData) {
			return;
		}
		const descriptionElement = document.createElement('span');
		descriptionElement.setAttribute('data-l10n-id', this.eventData.Tooltip);
		this.eventDescription.appendChild(descriptionElement);
	}

	isBlank(): boolean {
		return !this.randomEvent
			|| !this.eventData
			|| LensManager.getActiveLens() !== "fxs-settler-lens"
	}
}

const instance = new RandomEventTooltipType();
TooltipManager.registerType('random-event', instance)
TooltipManager.registerPlotType('random-event', PlotTooltipPriority.HIGH, instance)