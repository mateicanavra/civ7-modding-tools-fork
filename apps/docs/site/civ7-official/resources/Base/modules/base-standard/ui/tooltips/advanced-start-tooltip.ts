/**
 * Advance Start Tooltip
 * @copyright 2024, Firaxis Gmaes
 * @description The tooltip for advance start information.
 */

import AdvancedStart, { AdvancedStartToolTipEntry } from '/base-standard/ui/advanced-start/model-advanced-start.js';
import TooltipManager, { Tooltip, TooltipType } from '/core/ui/tooltips/tooltip-manager.js';

class AdvanceStartTooltipType implements TooltipType {
	private fragment = document.createDocumentFragment();
	private tooltip: ComponentRoot<Tooltip> | null = null;
	private hoveredNodeID: string | null = null;
	private toolTipText: AdvancedStartToolTipEntry | null = null;

	constructor() {
	}

	getHTML() {
		this.tooltip = document.createElement('fxs-tooltip');
		this.tooltip.classList.add('advanced-start-tooltip');
		this.tooltip.appendChild(this.fragment);
		return this.tooltip;
	}

	reset(): void {
		this.fragment = document.createDocumentFragment();
		while (this.tooltip?.hasChildNodes()) {
			this.tooltip.removeChild(this.tooltip.lastChild!);
		}
	}

	isUpdateNeeded(target: HTMLElement): boolean {
		const nodeIDString: string | null = target.getAttribute("node-id");
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

	update(): void {
		if (!this.hoveredNodeID) {
			console.error("advanced-start-tooltip: Attempting to update Advanced Start info tooltip, but unable to get selected node");
			return;
		}
		this.toolTipText = AdvancedStart.tooltipText(this.hoveredNodeID);
		if (!this.toolTipText?.locKey) {
			return;
		}
		const headerContainer = document.createElement('div');
		headerContainer.classList.add("advanced-start-tooltip__header-container")

		const textContainer = document.createElement("div");
		textContainer.classList.add("advanced-start-tooltip__text-container", 'font-body-base', 'text-accent-1');
		textContainer.innerHTML = Locale.compose(this.toolTipText?.locKey);
		this.fragment.appendChild(headerContainer);
		this.fragment.appendChild(textContainer);

	}

	isBlank(): boolean {
		return this.toolTipText == null;
	}
}

TooltipManager.registerType('advanceStart', new AdvanceStartTooltipType())